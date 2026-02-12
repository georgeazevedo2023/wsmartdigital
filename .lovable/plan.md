
# Corrigir Exibicao e Download de Documentos no HelpDesk

## Problemas Identificados

1. **Nome do arquivo vazio**: O payload UAZAPI para documentos nao inclui `fileName`. O campo `content` e um objeto (URL do CDN WhatsApp), nao uma string. O webhook tenta `message.fileName` como fallback mas ele nao existe, resultando em `content` vazio no banco de dados. O frontend entao extrai o hash da URL como nome.

2. **Link nao abre**: A URL `https://wsmart.uazapi.com/files/...` requer o header `token` da instancia para autenticacao. Um clique direto no navegador nao envia esse header, resultando em acesso negado.

## Solucao

### 1. Webhook: Extrair nome do arquivo e mimetype (`supabase/functions/whatsapp-webhook/index.ts`)

- Apos obter o link persistente via `/message/download`, extrair o `mimetype` da resposta (ex: `application/pdf`)
- Gerar um nome amigavel para documentos quando `fileName` nao existir: usar `messageType` ou derivar do mimetype (ex: "Documento.pdf")
- Salvar esse nome como `content` para documentos sem caption
- Retornar tambem `mimetype` da funcao `getMediaLink` para uso posterior

Mudancas especificas:
- `getMediaLink` passa a retornar `{ url, mimetype }` em vez de apenas `url`
- Apos obter o link, se `mediaType === 'document'` e content esta vazio, gerar nome: `Documento.{extensao do mimetype}`

### 2. Proxy de Download: Nova action no uazapi-proxy (`supabase/functions/uazapi-proxy/index.ts`)

Adicionar action `download-media` que:
- Recebe `fileUrl` e `instanceId` do frontend
- Busca o token da instancia no banco
- Faz fetch da URL do UAZAPI com o header `token`
- Retorna o conteudo do arquivo como stream com os headers corretos (Content-Type, Content-Disposition)

### 3. Frontend: Usar proxy para download (`src/components/helpdesk/MessageBubble.tsx`)

- Em vez de abrir `message.media_url` diretamente, chamar a edge function `uazapi-proxy` com action `download-media`
- Usar `window.open()` com a URL do proxy, ou fazer fetch e criar blob URL
- Quando `content` esta vazio, mostrar "Documento" + extensao extraida da URL

### Detalhes Tecnicos

**getMediaLink atualizado (webhook):**
```typescript
// Retorna { url, mimetype } em vez de string
async function getMediaLink(messageId, token, isAudio): Promise<{ url: string; mimetype?: string } | null> {
  // ... fetch existente ...
  const url = data.link || data.url || data.fileUrl || data.fileURL || null
  return url ? { url, mimetype: data.mimetype } : null
}
```

**Fallback de nome no webhook:**
```typescript
// Apos obter persistent link
if (mediaType === 'document' && !content && persistentResult?.mimetype) {
  const ext = persistentResult.mimetype.split('/').pop() || 'pdf'
  content = `Documento.${ext}`
}
```

**Nova action download-media no proxy:**
```typescript
case 'download-media': {
  const { fileUrl, instanceId } = body
  // Buscar token da instancia
  const { data: inst } = await supabase.from('instances').select('token').eq('id', instanceId).single()
  // Fetch com token
  const fileResp = await fetch(fileUrl, { headers: { token: inst.token } })
  // Retornar como stream
  return new Response(fileResp.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': fileResp.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Disposition': fileResp.headers.get('Content-Disposition') || 'inline',
    }
  })
}
```

**MessageBubble atualizado:**
```typescript
// Ao clicar no documento, usar proxy
const handleDocumentOpen = async (mediaUrl: string) => {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await supabase.functions.invoke('uazapi-proxy', {
    body: { action: 'download-media', fileUrl: mediaUrl, instanceId: message.instance_id }
  })
  // Criar blob URL e abrir
  const blob = await response.data
  const blobUrl = URL.createObjectURL(blob)
  window.open(blobUrl, '_blank')
}
```

**Nota**: O `message` no HelpDesk precisa ter acesso ao `instance_id` (via conversa). Vou verificar se ja esta disponivel no contexto do ChatPanel.

## Arquivos Modificados
- `supabase/functions/whatsapp-webhook/index.ts` -- melhorar extracao de nome de documento
- `supabase/functions/uazapi-proxy/index.ts` -- nova action `download-media`
- `src/components/helpdesk/MessageBubble.tsx` -- download via proxy e nome amigavel
- `src/components/helpdesk/ChatPanel.tsx` -- passar instanceId para MessageBubble (se necessario)
