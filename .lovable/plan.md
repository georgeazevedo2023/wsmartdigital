

# Corrigir: Mensagem do Agente IA nao aparece no Helpdesk

## Problema

O payload do n8n "Envia dados para o Lovable3" contem DOIS propositos simultaneos:
1. `status_ia: "ligada"` - para manter o status ativo
2. `content.text: "Bom dia! Bem-vindo a Neo Blindados..."` - a resposta do agente IA

Apos a correcao anterior, o webhook verifica `status_ia` primeiro e retorna na linha 184 sem nunca processar a mensagem. O texto do agente IA e descartado.

## Solucao

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

No bloco de `status_ia` (linhas 87-187), apos atualizar o status e antes de retornar, verificar se o payload tambem contem uma mensagem (content.text nao vazio). Se sim:

1. Atualizar `status_ia` normalmente
2. **Nao retornar** - em vez disso, remover `status_ia` do payload e deixar o fluxo continuar para o processamento de mensagem (isRawMessage)

### Logica alterada:

```
// 1. Check status_ia FIRST
if (!payload.EventType && !payload.eventType && statusIaPayload) {
  // ... resolver inbox, contact, conversation (codigo existente) ...
  // ... atualizar status_ia na conversa (codigo existente) ...
  // ... broadcast (codigo existente) ...

  // Check if payload ALSO contains a message to save
  const hasMessageContent = payload.content?.text || unwrapped?.content?.text
  if (!hasMessageContent) {
    // Pure status_ia update - return early
    return new Response(JSON.stringify({ ok: true, status_ia: ... }), ...)
  }
  
  // Has message content - fall through to isRawMessage processing
  console.log('status_ia updated, continuing to process message content')
}

// 2. Detect raw message format (agent output)
const isRawMessage = ...
```

Desta forma:
- Payloads **so com status_ia** (como o "Ativar IA") continuam funcionando normalmente
- Payloads **com status_ia + mensagem** (como as respostas do agente IA) atualizam o status E salvam a mensagem no helpdesk

## Resumo

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | No bloco status_ia: verificar se ha content.text; se sim, continuar para processamento de mensagem em vez de retornar |

Nenhuma mudanca necessaria no n8n - o payload atual do "Envia dados para o Lovable3" esta correto.

