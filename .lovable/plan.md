

# Corrigir Exibicao de Imagens: Mimetype e fileURL

## Problemas Identificados

### 1. Mimetype incorreto no Storage
Os arquivos estao sendo salvos no Storage com mimetype `application/octet-stream` em vez de `image/jpeg`. Isso acontece porque o CDN do WhatsApp retorna `application/octet-stream` no header `content-type`, e o webhook usa esse valor ao fazer o upload. O navegador nao consegue renderizar o arquivo como imagem com esse mimetype.

### 2. fileURL da UAZAPI ignorada
O payload do webhook ja inclui `message.fileURL` que pode ser uma URL persistente hospedada no servidor UAZAPI (ex: `https://wsmart.uazapi.com/...`). O codigo atual extrai essa URL na linha 208 mas depois sobrescreve com a logica de download que falha (404).

## Solucao

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

**Mudanca 1: Derivar mimetype do mediaType, nao do CDN**

Na funcao `uploadMediaToStorage`, usar o `mediaType` para definir o content-type correto em vez de confiar no header da resposta CDN:

```typescript
const mimeMap: Record<string, string> = {
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/ogg',
  document: 'application/octet-stream'
}
const contentType = mimeMap[mediaType] || 'application/octet-stream'
```

**Mudanca 2: Usar fileURL se for URL persistente da UAZAPI**

Antes de tentar o download via `/message/download`, verificar se a `mediaUrl` ja extraida do payload (`message.fileURL`) eh uma URL do servidor UAZAPI (nao do CDN do WhatsApp). Se for, usar diretamente sem tentar download:

```typescript
if (mediaType !== 'text' && mediaUrl) {
  // Se fileURL ja eh do servidor UAZAPI, usar diretamente
  const isUazapiUrl = mediaUrl.includes('uazapi.com') || mediaUrl.includes('/download/')
  const isCdnUrl = mediaUrl.includes('mmg.whatsapp.net')
  
  if (isUazapiUrl && !isCdnUrl) {
    // URL ja persistente, usar direto
    console.log('Using persistent fileURL from UAZAPI:', mediaUrl.substring(0, 80))
  } else if (instance.token) {
    // URL temporaria do CDN - tentar download UAZAPI, fallback Storage
    // ... logica existente
  }
}
```

**Mudanca 3: Reordenar prioridade das URLs**

1. Primeiro: usar `fileURL` se for URL persistente (UAZAPI)
2. Segundo: tentar `/message/download` com messageid + chatid
3. Terceiro: baixar do CDN e salvar no Storage com mimetype correto

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Corrigir mimetype no upload, priorizar fileURL persistente, reordenar logica de fallback |

## Resultado Esperado

- Imagens com fileURL da UAZAPI aparecem imediatamente
- Fallback para Storage usa mimetype correto (`image/jpeg` em vez de `application/octet-stream`)
- Imagens renderizam corretamente no navegador
