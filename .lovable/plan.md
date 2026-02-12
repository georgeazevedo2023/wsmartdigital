

# Mostrar icone de foto na lista de conversas

## Problema

Quando a ultima mensagem de uma conversa e uma imagem (sem texto/legenda), o campo `content` e `null`. A query que busca a ultima mensagem ignora essas entradas, entao a preview da conversa fica vazia em vez de mostrar algo como "📷 Foto".

## Solucao

### 1. Atualizar query de ultima mensagem (`src/pages/dashboard/HelpDesk.tsx`)

Na query que busca as ultimas mensagens (linhas 105-117), adicionar `media_type` ao select e ajustar a logica para aceitar mensagens sem `content` quando tiverem midia:

```
.select('conversation_id, content, media_type, created_at')
```

No loop, se `content` for null mas `media_type` for imagem/video/audio/documento, gerar um texto como "📷 Foto", "🎥 Video", "🎵 Audio", "📎 Documento".

### 2. Atualizar broadcast realtime (linha 156)

Quando o broadcast chega com `media_type` mas sem `content`, gerar o mesmo texto de preview de midia para a lista.

### 3. Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/dashboard/HelpDesk.tsx` | Adicionar `media_type` na query de last message, gerar preview de midia quando content e null, ajustar handler de broadcast |

### Detalhes tecnicos

Funcao auxiliar para gerar preview:

```typescript
function mediaPreview(mediaType: string): string {
  switch (mediaType) {
    case 'image': return '📷 Foto';
    case 'video': return '🎥 Vídeo';
    case 'audio': return '🎵 Áudio';
    case 'document': return '📎 Documento';
    default: return '';
  }
}
```

Na query de ultimas mensagens, aceitar a mensagem se tiver `content` OU `media_type` diferente de 'text':

```typescript
for (const msg of allMsgs) {
  if (!lastMsgMap[msg.conversation_id]) {
    const preview = msg.content || mediaPreview(msg.media_type);
    if (preview) {
      lastMsgMap[msg.conversation_id] = preview;
    }
  }
}
```

No broadcast (linha 156), usar a mesma logica:

```typescript
last_message: data.content || mediaPreview(data.media_type) || c.last_message
```

