

# Baixar Midia via UAZAPI /message/download

## Problema

As URLs de midia do WhatsApp (`mmg.whatsapp.net`) sao temporarias e expiram rapidamente. Mesmo quando o webhook extrai a URL corretamente de `message.content.URL`, ela ja nao funciona quando o usuario tenta visualizar no helpdesk.

## Solucao

No webhook, apos detectar que a mensagem contem midia, chamar o endpoint `POST /message/download` da UAZAPI para obter uma URL persistente (hospedada no servidor UAZAPI) antes de salvar no banco.

## Mudancas no Webhook

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

1. **Buscar o token da instancia** - O webhook ja faz lookup da instancia mas nao seleciona o `token`. Alterar o select para incluir `token`:

```typescript
const { data: instance } = await supabase
  .from('instances')
  .select('id, name, token')  // adicionar token
  .or(`id.eq.${instanceName},name.eq.${instanceName}`)
  .maybeSingle()
```

2. **Adicionar funcao para baixar midia** - Nova funcao que chama `POST /message/download` da UAZAPI:

```typescript
async function downloadMedia(
  uazapiUrl: string, 
  instanceToken: string, 
  messageId: string
): Promise<string> {
  try {
    const response = await fetch(`${uazapiUrl}/message/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({ messageid: messageId }),
    })
    
    if (!response.ok) {
      console.log('Download media failed:', response.status)
      return ''
    }
    
    const data = await response.json()
    // UAZAPI retorna a URL persistente do arquivo
    return data.url || data.URL || data.fileUrl || data.file || ''
  } catch (err) {
    console.error('Error downloading media:', err)
    return ''
  }
}
```

3. **Chamar download quando tiver midia** - Apos extrair `mediaType` e `externalId`, se for midia, chamar o download:

```typescript
if (mediaType !== 'text' && instance.token) {
  const uazapiUrl = Deno.env.get('UAZAPI_SERVER_URL') || 'https://wsmart.uazapi.com'
  const downloadedUrl = await downloadMedia(uazapiUrl, instance.token, rawExternalId)
  if (downloadedUrl) {
    mediaUrl = downloadedUrl
  }
}
```

Nota: Usamos `rawExternalId` (o ID original com prefixo, se houver) pois a UAZAPI pode precisar do formato completo.

## Fluxo

```
Webhook recebe mensagem com imagem
  -> Detecta mediaType = 'image'
  -> Chama POST /message/download com messageid
  -> UAZAPI retorna URL persistente
  -> Salva URL persistente no campo media_url
  -> Frontend exibe a imagem normalmente
```

## Fallback

Se o download falhar (timeout, erro), o webhook ainda salva a mensagem normalmente, apenas sem `media_url` (melhor do que salvar uma URL expirada).

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Adicionar funcao downloadMedia, incluir token no select da instancia, chamar download para mensagens de midia |

