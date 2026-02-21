
# Corrigir Fluxo "Ativar IA" (n8n + webhook)

## Problema

Quando voce clica em "Ativar IA" no helpdesk, o Lovable envia os dados para o n8n via webhook. O n8n processa e envia de volta para o `whatsapp-webhook` com o payload contendo `status_ia: "ligada"`. Porem:

1. O payload tem `chatid` + `content`, entao o webhook pensa que e uma **mensagem** (raw message) em vez de um comando de status_ia
2. Ao tratar como mensagem, tenta achar a instancia via campo `owner` (que nao existe no payload) e retorna **"No instance identifier"**

O payload ja tem `instance_name`, `instance_id`, `inbox_id` e `remotejid` corretos vindos do Set1, mas o webhook ignora esses campos porque entra no caminho errado.

## Solucao

### Parte 1: Ajuste no webhook (codigo Lovable)

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

Mudar a prioridade de deteccao: verificar `status_ia` **ANTES** de `isRawMessage`, pois payloads com `status_ia` nunca devem ser tratados como mensagens.

**Antes (linha 89-102, depois 104-106):**
```
const isRawMessage = ...
if (isRawMessage) { ... }

// Handle status_ia-only payloads
if (!payload.EventType && !payload.eventType && statusIaPayload && !isRawMessage) {
```

**Depois:**
```
// 1. Check status_ia FIRST (antes de isRawMessage)
const statusIaPayload = payload.status_ia || unwrapped?.status_ia || inner?.status_ia
if (!payload.EventType && !payload.eventType && statusIaPayload) {
  // handle status_ia... (usar inbox_id diretamente se disponivel)
}

// 2. Only then check isRawMessage
const isRawMessage = ...
```

Alem disso, no bloco `status_ia`, usar `inbox_id` diretamente quando disponivel no payload (em vez de buscar instancia primeiro e depois inbox):

```
const directInboxId = payload.inbox_id || unwrapped?.inbox_id || inner?.inbox_id
if (directInboxId) {
  // Pular busca de instancia, usar inbox_id direto
}
```

### Parte 2: Ajuste no n8n (voce faz manualmente)

O payload do no **"Envia dados para o Lovable2"** esta quase correto, mas tem um problema menor: as expressoes usam `{{ }}` (template literals do n8n) dentro de um JSON com `=` no inicio. Isso pode funcionar, mas o ideal e simplificar.

**Payload corrigido para o jsonBody:**
```
=[
  {
    "chatid": {{ $('Set1').item.json.cliente.remoteJid }},
    "status_ia": "ligada",
    "instance_name": {{ $('Set1').item.json.instancia.instance_name }},
    "instance_id": {{ $('Set1').item.json.instancia.instance_id }},
    "inbox_name": {{ $('Set1').item.json.instancia.inbox_name }},
    "inbox_id": {{ $('Set1').item.json.instancia.inbox_id }},
    "remotejid": {{ $('Set1').item.json.instancia.remotejid }}
  }
]
```

Mudancas:
- **Removido `content`** e `sender` - nao sao necessarios para ativar IA (e `content` e o que confundia o webhook achando que era uma mensagem)
- **Removido `track_id` e `track_source`** vazios - desnecessarios

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Mover verificacao de `status_ia` para ANTES de `isRawMessage`; usar `inbox_id` direto do payload quando disponivel |

## Resumo do que voce precisa fazer no n8n

1. Abra o no **"Envia dados para o Lovable2"**
2. Substitua o jsonBody pelo payload simplificado acima (sem `content`, sem `sender`)
3. Os campos criticos sao: `status_ia`, `inbox_id`, `chatid/remotejid` e `instance_name`
