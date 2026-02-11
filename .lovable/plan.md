
# Corrigir Realtime e Duplicatas no Helpdesk

## Problemas Identificados

### 1. Realtime NAO funciona por causa do REPLICA IDENTITY

As tabelas `conversations` e `conversation_messages` usam **REPLICA IDENTITY DEFAULT** (apenas chave primaria). As politicas RLS usam subconsultas com `conversation_id` e `inbox_id` (colunas que nao sao chave primaria).

O Supabase Realtime precisa de **REPLICA IDENTITY FULL** para avaliar politicas RLS que referenciam colunas alem da chave primaria. Sem isso, os eventos sao silenciosamente descartados -- por isso as mensagens so aparecem ao clicar em sincronizar.

### 2. Mensagens duplicadas

Cada mensagem esta sendo inserida DUAS VEZES:
- Via **sync**: `external_id = "558185749970:3AF951C9048BFD7DE951"` (usa `message.id`)
- Via **webhook**: `external_id = "3AF951C9048BFD7DE951"` (usa `message.messageid`)

A deduplicacao falha porque os formatos sao diferentes.

**Evidencia do banco:**
| content | external_id |
|---------|------------|
| Teste10 | 558185749970:3AF951C9048BFD7DE951 |
| Teste10 | 3AF951C9048BFD7DE951 |

---

## Solucao

### Parte 1: Migration SQL

Executar migracoes para:

1. **Habilitar REPLICA IDENTITY FULL** nas duas tabelas -- isso permite que o Supabase Realtime avalie as politicas RLS corretamente e entregue eventos em tempo real

```sql
ALTER TABLE conversation_messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;
```

2. **Limpar mensagens duplicadas** existentes -- remover as duplicatas mantendo apenas uma copia de cada mensagem

### Parte 2: Webhook (`whatsapp-webhook/index.ts`)

Corrigir a deduplicacao para verificar AMBOS os formatos de `external_id`:

```text
Antes:  .eq('external_id', messageid)
Depois: .or(`external_id.eq.${messageid},external_id.eq.${owner}:${messageid}`)
```

Tambem normalizar o `external_id` para usar sempre o formato curto (`messageid` sem prefixo), mantendo consistencia com futuras insercoes.

### Parte 3: Suporte a Midia (ja preparado)

O webhook ja extrai `fileURL`, `mediaType`, `caption` e `fileName` do payload UAZAPI e os mapeia para `media_url`, `media_type` e `content` no banco. Nenhuma mudanca adicional necessaria.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| Migration SQL | REPLICA IDENTITY FULL + limpeza de duplicatas |
| `supabase/functions/whatsapp-webhook/index.ts` | Corrigir deduplicacao para checar ambos formatos de external_id |

## Resultado Esperado

Apos as mudancas:
1. Mensagens do webhook aparecem **instantaneamente** no chat (Realtime funcional)
2. Sem duplicatas no banco de dados
3. Suporte a texto, imagem, video, audio e documentos via webhook
