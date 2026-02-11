

# Corrigir Extração de Media URL do Webhook

## Problema

A UAZAPI envia a URL da imagem dentro de `message.content.URL` (um objeto), mas o webhook procura em `message.fileURL` ou `message.mediaUrl` — campos que não existem no payload. Resultado: `media_url` é salvo como `null` e a imagem nunca aparece.

Dados do banco confirmam: todas as mensagens de imagem têm `media_url: nil`.

## Causa Raiz

Linha 120 do webhook:
```typescript
const mediaUrl = message.fileURL || message.mediaUrl || ''
```

A UAZAPI coloca a URL em `message.content.URL` (dentro do objeto de metadados). O campo `message.fileURL` não existe.

## Solução

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

Alterar a extração de `mediaUrl` para também verificar dentro de `message.content` quando for um objeto:

```typescript
// Extract media URL - UAZAPI puts it inside message.content.URL for media
let mediaUrl = message.fileURL || message.mediaUrl || ''
if (!mediaUrl && message.content && typeof message.content === 'object') {
  mediaUrl = message.content.URL || message.content.url || ''
}
```

### Limpeza de dados antigos

Executar uma query SQL para limpar as mensagens antigas que tiverem content com JSON de mídia e extrair a URL correta:

```sql
UPDATE conversation_messages
SET media_url = (content::jsonb->>'URL'),
    content = ''
WHERE media_type = 'image'
  AND content LIKE '{%"URL"%'
  AND (media_url IS NULL OR media_url = '');
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Extrair mediaUrl de `message.content.URL` quando content for objeto |

## Resultado Esperado

- Imagens novas: `media_url` preenchido corretamente, `content` vazio
- Imagens antigas: `media_url` extraído do JSON salvo, `content` limpo
- O `MessageBubble` já renderiza imagens quando `media_url` existe, então não precisa de mudança no frontend

