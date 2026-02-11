
# Corrigir Download de Midia: Adicionar chatid e Fallback para Storage

## Problema Identificado

O endpoint `POST /message/download` da UAZAPI retorna **404 "Message not found"** porque o body enviado contem apenas `{ messageid }`, mas o endpoint provavelmente precisa tambem do `chatid` (padrao comum em APIs WhatsApp como green-api).

Alem disso, mesmo que o download via UAZAPI funcione, e prudente ter um **fallback**: baixar o arquivo da URL CDN temporaria (`mmg.whatsapp.net`) e armazenar no Supabase Storage para persistencia.

## Solucao em 2 Partes

### Parte 1: Corrigir chamada ao /message/download

No `downloadMedia()`, incluir o `chatid` no body e tambem tentar formatos alternativos de ID:

```typescript
async function downloadMedia(
  uazapiUrl: string,
  instanceToken: string,
  messageId: string,
  chatId: string   // <-- novo parametro
): Promise<string> {
  try {
    const response = await fetch(`${uazapiUrl}/message/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({ 
        messageid: messageId,
        chatid: chatId          // <-- campo adicionado
      }),
    })
    // ... parse response
  }
}
```

Passar `chatId` ao chamar a funcao:

```typescript
const downloadedUrl = await downloadMedia(uazapiUrl, instance.token, rawExternalId, chatId)
```

### Parte 2: Fallback - Baixar CDN e salvar no Storage

Se o `/message/download` falhar, e a URL CDN existir (`message.content.URL`), baixar o binario e fazer upload para o Supabase Storage:

```typescript
async function uploadMediaToStorage(
  supabase: any,
  cdnUrl: string,
  messageId: string,
  mediaType: string
): Promise<string> {
  const response = await fetch(cdnUrl)
  if (!response.ok) return ''
  
  const blob = await response.blob()
  const ext = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'bin'
  const path = `media/${messageId}.${ext}`
  
  await supabase.storage.from('helpdesk-media').upload(path, blob)
  
  const { data } = supabase.storage.from('helpdesk-media').getPublicUrl(path)
  return data.publicUrl
}
```

### Fluxo Completo

```text
Webhook recebe imagem
  |
  +--> Tenta POST /message/download (com chatid + messageid)
  |     |
  |     +--> Sucesso? Usa URL persistente da UAZAPI
  |     |
  |     +--> Falhou? CDN URL existe?
  |           |
  |           +--> Sim: Baixa binario da CDN e salva no Storage
  |           |
  |           +--> Nao: Salva mensagem sem media_url
  |
  +--> Salva mensagem no banco com media_url persistente
```

## Mudancas Necessarias

### 1. Criar bucket de Storage

Criar o bucket `helpdesk-media` com politica publica de leitura.

### 2. Alterar `supabase/functions/whatsapp-webhook/index.ts`

| Mudanca | Descricao |
|---------|-----------|
| `downloadMedia()` | Adicionar parametro `chatId` e enviar no body |
| Nova funcao `uploadMediaToStorage()` | Baixar CDN e salvar no Storage como fallback |
| Logica principal | Tentar download UAZAPI primeiro, fallback para Storage se falhar |
| Chamar com chatId | Passar `chatId` extraido do payload |

## Resultado Esperado

- Se o UAZAPI `/message/download` funcionar com `chatid`: imagens persistentes via UAZAPI
- Se falhar: imagens persistentes via Supabase Storage (fallback robusto)
- O frontend nao precisa de mudancas - o `MessageBubble` ja renderiza `<img src={media_url} />`
