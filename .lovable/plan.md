

# Corrigir Realtime com Broadcast e Eliminar Duplicatas

## Diagnostico

### Por que o Realtime nao funciona?

O Supabase Realtime usa `postgres_changes` que precisa avaliar as politicas RLS para cada subscriber. A politica de `conversation_messages` faz uma subconsulta cruzada:

```sql
EXISTS (SELECT 1 FROM conversations c 
  WHERE c.id = conversation_messages.conversation_id 
  AND has_inbox_access(auth.uid(), c.inbox_id))
```

Mesmo com REPLICA IDENTITY FULL, essa avaliacao cruzada entre tabelas no contexto do Realtime e instavel -- o Supabase descarta silenciosamente os eventos quando nao consegue avaliar a politica RLS corretamente.

### Por que as duplicatas persistem?

O webhook e o auto-sync (que roda quando a inbox e selecionada) inserem a mesma mensagem simultaneamente com `external_id` diferentes:
- Webhook: `3A200DD280E1AC1CFFA0`
- Sync: `558185749970:3A200DD280E1AC1CFFA0`

A verificacao de duplicata no webhook nao acha a entrada do sync porque ambos rodam ao mesmo tempo.

---

## Solucao em 3 Partes

### Parte 1: Broadcast para Realtime confiavel

Em vez de depender de `postgres_changes` (que depende de RLS), usar **Supabase Broadcast** -- um canal pub/sub simples que nao passa por RLS.

**Webhook (`whatsapp-webhook/index.ts`):**
Apos inserir a mensagem com sucesso, enviar um broadcast:
```typescript
await supabase.channel('helpdesk-realtime').send({
  type: 'broadcast',
  event: 'new-message',
  payload: { conversation_id, inbox_id, direction, content, media_type }
})
```

**ChatPanel.tsx:**
Substituir a subscription `postgres_changes` por broadcast:
```typescript
supabase.channel('helpdesk-realtime')
  .on('broadcast', { event: 'new-message' }, (payload) => {
    if (payload.payload.conversation_id === conversation.id) {
      fetchMessages() // refetch para garantir dados completos
    }
  })
  .subscribe()
```

**HelpDesk.tsx:**
Adicionar subscription broadcast para atualizar a lista de conversas:
```typescript
supabase.channel('helpdesk-list')
  .on('broadcast', { event: 'new-message' }, (payload) => {
    fetchConversations() // atualizar lista com nova mensagem
  })
  .subscribe()
```

### Parte 2: Eliminar duplicatas na raiz

Criar um indice unico parcial no banco que normaliza o `external_id` para evitar duplicatas independente do formato:

**Migration SQL:**
```sql
-- Funcao para normalizar external_id (extrair apenas o messageid curto)
CREATE OR REPLACE FUNCTION normalize_external_id(ext_id text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE 
    WHEN ext_id LIKE '%:%' THEN split_part(ext_id, ':', 2)
    ELSE ext_id
  END
$$;

-- Indice unico funcional que impede duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_messages_normalized_external_id
ON conversation_messages (conversation_id, normalize_external_id(external_id))
WHERE external_id IS NOT NULL;
```

Isso impede qualquer insercao duplicada no nivel do banco, independente de race conditions.

**Webhook:** Usar `ON CONFLICT DO NOTHING` no insert para tratar o conflito graciosamente.

### Parte 3: Remover auto-sync automatico

O auto-sync que roda quando a inbox e selecionada causa race conditions com o webhook. Remover esse comportamento -- as mensagens devem chegar via webhook/broadcast em tempo real. O botao de sync manual continua disponivel para sincronizacoes iniciais.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | Indice unico funcional para dedup |
| `supabase/functions/whatsapp-webhook/index.ts` | Adicionar broadcast apos insert + ON CONFLICT DO NOTHING |
| `src/components/helpdesk/ChatPanel.tsx` | Trocar postgres_changes por broadcast |
| `src/pages/dashboard/HelpDesk.tsx` | Trocar postgres_changes por broadcast + remover auto-sync |

## Resultado

1. Mensagens aparecem instantaneamente via broadcast (sem depender de RLS)
2. Zero duplicatas no banco (protegido por indice unico)
3. Sem race conditions entre sync e webhook
