
# Corrigir formato do Webhook Outgoing para n8n

## Problema

O webhook outgoing esta chegando no n8n com o body como string bruta em vez de JSON parseado. Isso acontece porque o browser, com `mode: 'no-cors'`, nao consegue enviar o header `Content-Type: application/json` -- ele e rebaixado para `text/plain`, e o n8n nao faz parse automatico.

## Solucao

Criar uma edge function dedicada `fire-outgoing-webhook` que recebe os dados do frontend e faz o POST para a URL do webhook com os headers corretos (sem restricoes de CORS do browser).

## Alteracoes

### 1. Nova Edge Function: `supabase/functions/fire-outgoing-webhook/index.ts`

- Recebe do frontend: `webhook_url` + todos os campos do payload
- Valida autenticacao (Bearer token)
- Faz `fetch(webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })` diretamente do servidor
- Retorna status de sucesso ou erro

### 2. `src/components/helpdesk/ChatInput.tsx`

- Substituir o `fetch` direto para a URL do webhook por uma chamada a edge function `fire-outgoing-webhook` via `supabase.functions.invoke`
- Remover `mode: 'no-cors'`
- Passar `webhook_url` junto com os dados no body

### Detalhes tecnicos

**Edge Function (`fire-outgoing-webhook/index.ts`):**

```typescript
// Recebe { webhook_url, payload } do frontend
// Faz POST server-side para webhook_url com Content-Type: application/json
// Sem restricoes de CORS pois roda no servidor
```

**ChatInput.tsx (trecho atualizado):**

```typescript
await supabase.functions.invoke('fire-outgoing-webhook', {
  body: {
    webhook_url: webhookUrl,
    payload: {
      timestamp: new Date().toISOString(),
      instance_name: instanceInfo?.name || '',
      instance_id: inbox?.instance_id || '',
      inbox_name: inbox?.name || '',
      inbox_id: inbox?.id || conversation.inbox_id,
      contact_name: conversation.contact?.name || '',
      remotejid: conversation.contact?.jid,
      fromMe: true,
      agent_name: profile?.full_name || user.email,
      agent_id: user.id,
      pausar_agente: 'sim',
      message_type: messageData.message_type,
      message: messageData.content,
      media_url: messageData.media_url,
    },
  },
});
```

Isso garante que o n8n receba os campos separados corretamente no body, identico ao formato da UAZAPI.

### Arquivos afetados
- `supabase/functions/fire-outgoing-webhook/index.ts` (novo)
- `src/components/helpdesk/ChatInput.tsx` (atualizar fireOutgoingWebhook)
