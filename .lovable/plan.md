

# Corrigir Imagens: Usar endpoint `/message/download` da UAZAPI

## Problema

As URLs do CDN do WhatsApp (`mmg.whatsapp.net`) sao bloqueadas pelo navegador (CORS/403). Salvar a URL direta nao funciona para exibicao no frontend.

## Solucao

Usar o endpoint `POST /message/download` da UAZAPI com `return_link: true` para obter uma URL persistente e acessivel publicamente, hospedada nos servidores da UAZAPI.

## Fluxo

1. Webhook recebe mensagem com midia
2. Antes de salvar no banco, chama `POST https://wsmart.uazapi.com/message/download` com:
   - `id`: o `messageid` da mensagem
   - `return_base64`: `false`
   - `return_link`: `true`
   - Header `token`: token da instancia (ja disponivel no banco)
3. A resposta contem uma URL persistente da UAZAPI
4. Salva essa URL no campo `media_url` do banco

## Mudancas Tecnicas

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

**1. Adicionar funcao `getMediaLink`**

```typescript
async function getMediaLink(messageId: string, instanceToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://wsmart.uazapi.com/message/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({
        id: messageId,
        return_base64: false,
        return_link: true,
      }),
    });

    if (!response.ok) {
      console.error('Download link request failed:', response.status);
      return null;
    }

    const data = await response.json();
    // Extrair URL da resposta (verificar campo exato nos logs)
    return data.link || data.url || data.fileUrl || null;
  } catch (err) {
    console.error('Error getting media link:', err);
    return null;
  }
}
```

**2. Chamar a funcao quando houver midia (linhas 149-152)**

Substituir o bloco atual por:

```typescript
if (mediaType !== 'text' && externalId && instance.token) {
  console.log('Requesting persistent media link from UAZAPI...');
  const persistentUrl = await getMediaLink(externalId, instance.token);
  if (persistentUrl) {
    mediaUrl = persistentUrl;
    console.log('Got persistent media URL:', mediaUrl.substring(0, 80));
  } else {
    console.log('Failed to get persistent link, keeping original:', mediaUrl?.substring(0, 80));
  }
}
```

**3. Logar a resposta completa do `/message/download` para debug**

Na primeira versao, logar `JSON.stringify(data)` completo para identificar o campo correto da URL na resposta.

## Resultado Esperado

- Imagens com URL persistente da UAZAPI (sem CORS, sem expiracao)
- Fallback para URL original caso o endpoint falhe
- Sem download/upload de binarios (zero corrupcao)

## Arquivo a modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Adicionar `getMediaLink()`, chamar antes de salvar no banco |

