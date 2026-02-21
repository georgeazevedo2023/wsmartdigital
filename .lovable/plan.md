

# Corrigir Recebimento de Mensagens do Agente IA via n8n

## Problema

O no "AI Agent" do n8n so tem o campo `output` (texto da IA). O payload atual referencia `$json.fromMe`, `$json.owner`, `$json.messageid` etc. que vem do AI Agent e sao todos **undefined**.

No webhook:
1. A deteccao de "raw message" (linha 89) exige `fromMe !== undefined` -- falha porque e undefined
2. Cai no bloco `status_ia` porque `"status_ia": "ligada"` esta presente no payload
3. O bloco `status_ia` tenta achar a instancia via `owner` (tambem undefined) -- retorna `status_ia_instance_not_found`

## Solucao

### Parte 1: Ajuste no webhook (codigo)

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

**Mudanca na linha 89** - Tornar a deteccao de raw message mais flexivel:

Antes:
```
const isRawMessage = !payload.EventType && !payload.eventType && (payload.chatid || payload.messageid) && payload.fromMe !== undefined
```

Depois:
```
const isRawMessage = !payload.EventType && !payload.eventType && (payload.chatid || payload.content)
```

Isso detecta como raw message se tiver `chatid` OU `content` (o texto do agente), mesmo sem `fromMe`.

**Adicionar default para `fromMe`** dentro do bloco `isRawMessage`:
```typescript
if (isRawMessage) {
  if (payload.fromMe === undefined && payload.content?.text) {
    payload.fromMe = true  // Resposta do agente = outgoing
  }
  payload = {
    EventType: 'messages',
    instanceName: payload.owner || '',
    message: payload,
    chat: null,
  }
}
```

### Parte 2: Ajuste no n8n (voce faz manualmente)

No no "Envia dados para o Lovable3", troque o `jsonBody` por:

```
=[{
  "chatid": {{ $('Webhook').item.json.body.message.chatid || $('Webhook').item.json.body.chat.wa_chatid }},
  "content": {
    "text": {{ $json.output || "" }},
    "contextInfo": {}
  },
  "fromMe": true,
  "messageType": "text",
  "messageid": {{ "agent_" + Date.now() }},
  "owner": {{ $('Webhook').item.json.body.message.owner }},
  "sender": {{ $('Webhook').item.json.body.message.sender }},
  "senderName": "Assistente IA",
  "status_ia": "ligada"
}]
```

Mudancas importantes:
- **Removido `{{ }}` duplo** - usar apenas `=[ ... ]` (o `=` no inicio ja ativa expressoes n8n)
- **`fromMe: true`** - fixo, pois e resposta do agente (outgoing)
- **`owner`** - pega do Webhook original (`$('Webhook').item.json.body.message.owner`), nao do AI Agent
- **`messageid`** - gera um ID unico em vez de pegar undefined do AI Agent
- **Removidos campos desnecessarios** que vinham undefined: `id`, `isGroup`, `messageTimestamp`, `source`, `status`, `text`, `convertOptions`, `edited`, `quoted`, `reaction`, `track_id`, `track_source`

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Linha 89: deteccao de raw message mais robusta; default `fromMe=true` para payloads de agente |

## Resumo do que voce precisa fazer no n8n

1. Abra o no "Envia dados para o Lovable3"
2. Substitua o jsonBody pelo payload corrigido acima
3. Os campos criticos sao: `owner` vindo do Webhook original, `fromMe: true` fixo, e `messageid` gerado

