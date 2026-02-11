
# Corrigir Webhook para Desembrulhar Payload do n8n

## Problema Confirmado pelos Logs

```
Webhook received: {"Body":{"BaseUrl":"https://wsmart.uazapi.com","EventType":"messages",...}}
Ignoring event type:
```

O n8n envia o payload dentro de uma chave `Body`, mas o webhook procura `EventType` na raiz. Resultado: toda mensagem e ignorada.

## Solucao

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

Adicionar **2 linhas** apos o `req.json()` (linha 34) para detectar e extrair o payload real:

```text
Linha 34 atual:  const payload = await req.json()
Mudar para:
  const rawPayload = await req.json()
  const payload = rawPayload.Body?.EventType ? rawPayload.Body : rawPayload
```

Isso faz o webhook funcionar com ambos os formatos:
- Payload direto da UAZAPI: `{ "EventType": "messages", ... }`
- Payload via n8n: `{ "Body": { "EventType": "messages", ... } }`

Nenhuma outra mudanca e necessaria. O Realtime ja esta configurado no frontend (`ChatPanel.tsx`) -- o unico bloqueio era o webhook rejeitando o payload.
