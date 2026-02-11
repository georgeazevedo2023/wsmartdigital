

# Corrigir Webhook: Sanitizar Content de Midia

## Problema

Linha 121 do webhook:
```typescript
let content = message.text || message.content || message.caption || ''
```

Quando a UAZAPI envia uma imagem, `message.text` e `undefined` e `message.content` contem o **objeto bruto de metadados** da midia (com chaves como URL, mimetype, fileLength, etc.). O JavaScript avalia o objeto como truthy e o salva no banco como JSON stringificado.

## Solucao

No arquivo `supabase/functions/whatsapp-webhook/index.ts`, alterar a linha 121 para verificar se `message.content` e uma string antes de usa-lo como conteudo. Se for um objeto, ignorar e usar apenas `message.caption`.

### Antes:
```typescript
let content = message.text || message.content || message.caption || ''
```

### Depois:
```typescript
const rawContent = message.text || message.caption || ''
let content = typeof rawContent === 'string' ? rawContent : ''
// If message.content is a string (plain text), use it as fallback
if (!content && typeof message.content === 'string') {
  content = message.content
}
```

Isso garante que:
- `message.text` (texto puro) tem prioridade
- `message.caption` (legenda de midia) e o segundo fallback
- `message.content` so e usado se for uma string, nunca um objeto
- Se nenhum texto existir, o content fica vazio (correto para midia sem legenda)

## Arquivo a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Sanitizar `content` na linha 121 para rejeitar objetos |

## Impacto

- Mensagens de texto continuam funcionando normalmente
- Imagens/videos/audios com legenda mostram a legenda
- Imagens/videos/audios sem legenda mostram conteudo vazio (e o `MessageBubble` ja renderiza a midia via `media_url`)
- Nenhuma mudanca no frontend necessaria

