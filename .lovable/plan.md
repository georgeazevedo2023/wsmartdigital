

# Simplificar Logica de Midia: Usar fileURL Diretamente

## Problema Real

Apesar dos arquivos existirem no Storage com tamanhos corretos (331KB, 152KB) e mimetype `image/jpeg`, as imagens continuam quebradas no chat. A logica atual de download/upload e desnecessariamente complexa e falha.

O UAZAPI ja fornece URLs persistentes em seus servidores (ex: `https://wsmart.uazapi.com/files/...`) atraves do campo `fileURL` no payload do webhook. O sistema atual ignora essas URLs e tenta re-baixar/re-uplotar, causando problemas.

## Solucao: Simplificar

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

**1. Adicionar log do objeto `message` para debug**

Logo apos extrair o `message` do payload, logar os campos de midia para entender exatamente o que o UAZAPI envia:

```typescript
console.log('Message media fields:', JSON.stringify({
  fileURL: message.fileURL,
  mediaUrl: message.mediaUrl,
  mediaType: message.mediaType,
  contentURL: message.content?.URL,
  fileName: message.fileName,
}))
```

**2. Simplificar a logica de resolucao de midia**

Remover toda a logica complexa de download/storage e substituir por:

```typescript
// Prioridade:
// 1. fileURL se for URL persistente (uazapi.com/files/)
// 2. content.URL ou mediaUrl (mesmo que CDN, funciona em tempo real)
// 3. Fallback storage apenas se URL for CDN do WhatsApp
```

A mudanca principal: em vez de SEMPRE tentar download + re-upload, **usar a URL do payload diretamente**. Apenas fazer upload para Storage como fallback quando a URL for do CDN temporario do WhatsApp.

**3. Manter fallback de Storage apenas para CDN**

Se a URL for `mmg.whatsapp.net` (CDN temporario), ai sim fazer o upload para Storage. Mas se for qualquer outra URL (incluindo UAZAPI), usar diretamente.

### Codigo simplificado da resolucao de midia:

```typescript
if (mediaType !== 'text') {
  // Usar fileURL/mediaUrl direto se existir
  if (mediaUrl) {
    // Se for CDN temporario do WhatsApp, tentar persistir no Storage
    if (mediaUrl.includes('mmg.whatsapp.net')) {
      const storageUrl = await uploadMediaToStorage(supabase, mediaUrl, externalId || rawExternalId, mediaType)
      if (storageUrl) {
        mediaUrl = storageUrl
      }
      // Se storage falhar, manter a URL CDN (funciona por algumas horas)
    }
    // Qualquer outra URL (uazapi.com, etc) - usar direto
  }
}
```

## Mudancas

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Adicionar log de debug dos campos de midia, simplificar logica removendo download UAZAPI (que sempre falha com 404), usar fileURL diretamente, manter fallback Storage apenas para CDN |

## Resultado Esperado

- URLs do UAZAPI (`wsmart.uazapi.com/files/...`) funcionam imediatamente
- URLs CDN do WhatsApp sao persistidas no Storage como fallback
- Se Storage falhar, CDN URL ainda funciona em tempo real (expira depois de horas)
- Logs mostram exatamente o que UAZAPI envia para diagnostico futuro

