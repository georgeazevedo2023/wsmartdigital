
# Corrigir Unwrap do Payload n8n no Webhook

## Problema

O n8n envia o payload da UAZAPI encapsulado em um array com a seguinte estrutura:

```text
[
  {
    "headers": { ... },
    "body": {
      "EventType": "messages",
      "instanceName": "NeoBlindados",
      "message": { ... },
      ...
    }
  }
]
```

A logica atual de unwrap (linha 78) so verifica `rawPayload.Body?.EventType`, mas nao lida com:
1. Payload sendo um array (formato n8n)
2. A chave `body` em minusculo (n8n usa `body`, nao `Body`)

Por isso o webhook recebe o array, nao encontra `EventType` na raiz, e descarta a mensagem com `not_message_event`.

## Alteracao

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

Expandir a logica de unwrap (linhas 77-78) para cobrir os formatos do n8n:

```text
// Logica atual (insuficiente):
const payload = rawPayload.Body?.EventType ? rawPayload.Body : rawPayload

// Nova logica:
1. Se rawPayload for um array, pegar rawPayload[0]
2. Do item resultante, verificar se tem .body ou .Body com EventType
3. Se sim, usar o conteudo de body/Body como payload
4. Caso contrario, usar o item diretamente (payload direto da UAZAPI)
```

Codigo concreto:

```text
let unwrapped = rawPayload
// n8n envia como array
if (Array.isArray(unwrapped)) {
  unwrapped = unwrapped[0]
}
// n8n encapsula em body/Body
const inner = unwrapped?.body || unwrapped?.Body
const payload = (inner?.EventType || inner?.eventType) ? inner : unwrapped
```

Isso cobre todos os cenarios:
- Payload direto da UAZAPI (objeto com EventType na raiz)
- Payload via n8n com Body maiusculo (formato antigo)
- Payload via n8n com body minusculo dentro de array (formato atual do usuario)

### Nenhum outro arquivo modificado

Apenas a edge function `whatsapp-webhook/index.ts` precisa ser atualizada.
