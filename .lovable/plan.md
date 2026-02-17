
# Tratar payload de status_ia no webhook

## Problema

Quando o sistema externo envia um payload com `status_ia: "ligada"` para o `whatsapp-webhook`, ele nao tem `EventType` nem `fromMe`, entao nao e reconhecido como mensagem (linha 89) e e descartado como `not_message_event` (linha 104).

## Solucao

Adicionar um bloco de tratamento no `whatsapp-webhook` entre a deteccao de raw message (linha 98) e o filtro de EventType (linha 104). Quando o payload contem `status_ia` mas nao e uma mensagem, o webhook deve:

1. Encontrar a conversa pelo `chatid` (sender/remotejid) e inbox da instancia
2. Atualizar `status_ia` na tabela `conversations`
3. Fazer broadcast via Realtime para que o ChatPanel atualize a UI

## Alteracoes

### `supabase/functions/whatsapp-webhook/index.ts`

Inserir entre as linhas 98 e 100 (apos o bloco `isRawMessage`, antes do filtro `eventType`):

```typescript
// Handle status_ia-only payloads (no EventType, no message — just a status update)
const statusIaPayload = payload.status_ia || unwrapped?.status_ia || (inner?.status_ia);
if (!payload.EventType && !payload.eventType && statusIaPayload && !isRawMessage) {
  console.log('Detected status_ia-only payload:', statusIaPayload);
  
  const chatid = payload.chatid || payload.sender || unwrapped?.chatid || unwrapped?.sender || '';
  if (!chatid) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'status_ia_no_chatid' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Find instance (reuse instanceName logic already above)
  // ... lookup instance + inbox + contact + conversation
  // Update conversation.status_ia
  // Broadcast to helpdesk-realtime and helpdesk-conversations
  
  return new Response(JSON.stringify({ ok: true, status_ia: statusIaPayload }), { ... });
}
```

A logica completa:
1. Extrair `chatid` do payload (pode vir como `chatid`, `sender` ou `remotejid`)
2. Buscar instancia pelo `instanceName` ou `owner` (mesma logica ja existente no webhook)
3. Buscar inbox da instancia
4. Buscar contato pelo JID (`chatid`)
5. Buscar conversa aberta/pendente para esse contato nessa inbox
6. Atualizar `conversations.status_ia` com o valor recebido
7. Broadcast via REST API nos topicos `helpdesk-realtime` e `helpdesk-conversations` com `{ conversation_id, status_ia }`
8. Retornar sucesso

O ChatPanel ja escuta `status_ia === 'ligada'` no broadcast (linha 104 do ChatPanel) e seta `setIaAtivada(true)`, entao nenhuma alteracao e necessaria no frontend.

## Arquivo afetado

- `supabase/functions/whatsapp-webhook/index.ts` - adicionar bloco de tratamento de status_ia antes do filtro de EventType
