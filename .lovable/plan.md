

# Corrigir Realtime: Usar REST API para Broadcast

## Causa Raiz

O webhook usa `supabase.channel('helpdesk-realtime').send()` que depende de uma conexao WebSocket. Em Edge Functions, essa conexao nao e mantida -- o `send()` executa mas a mensagem **nunca chega** aos clientes. Por isso os logs mostram "broadcast sent" mas o frontend nao recebe nada.

## Solucao

Substituir o broadcast via WebSocket pelo **Realtime Broadcast REST API**, que funciona via HTTP POST simples -- perfeito para Edge Functions.

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

Remover as linhas 253-268 (channel broadcast via WebSocket) e substituir por um HTTP POST direto:

```typescript
// Broadcast via REST API (reliable from Edge Functions)
await fetch(
  `${Deno.env.get('SUPABASE_URL')}/realtime/v1/api/broadcast`,
  {
    method: 'POST',
    headers: {
      'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{
        topic: 'helpdesk-realtime',
        event: 'new-message',
        payload: {
          conversation_id: conversation.id,
          inbox_id: inbox.id,
          direction,
          content,
          media_type: mediaType,
          media_url: mediaUrl || null,
          created_at: msgTimestamp,
        },
      }],
    }),
  }
)
```

### Frontend: Nenhuma mudanca necessaria

O `ChatPanel.tsx` e `HelpDesk.tsx` ja escutam no canal `helpdesk-realtime` via broadcast -- so precisam receber as mensagens que agora serao entregues corretamente.

### Sobre a ideia de "mostrar primeiro no frontend"

Nao e recomendado porque:
- Se o banco rejeitar a mensagem (duplicata, erro), o usuario veria uma mensagem fantasma
- Nao ha como saber o `conversation_id` correto sem consultar o banco primeiro
- O fluxo correto e: webhook salva -> broadcast notifica -> frontend atualiza
- Com o REST API funcionando, a latencia sera de milissegundos

### Impacto em midia

Zero impacto. O webhook ja extrai `fileURL`, `mediaType`, `caption` e os envia no payload do broadcast. O `MessageBubble` ja renderiza imagens, videos, audios e documentos.

## Resumo

| Componente | Mudanca |
|-----------|---------|
| `whatsapp-webhook/index.ts` | Trocar `channel.send()` por HTTP POST ao REST API do Realtime |
| `ChatPanel.tsx` | Nenhuma |
| `HelpDesk.tsx` | Nenhuma |

