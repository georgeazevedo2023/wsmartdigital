

# Corrigir Download de Documentos no HelpDesk

## Problema

Ao clicar no botao de download de um documento PDF no HelpDesk, o sistema baixa o arquivo via proxy, cria uma blob URL (`blob:https://...`) e tenta abrir em nova aba. O Chrome bloqueia essa URL, exibindo "ERR_BLOCKED_BY_CLIENT".

Isso acontece porque documentos recebidos (incoming) sao armazenados com a URL da UAZAPI (que requer autenticacao), e o sistema precisa usar o proxy para baixar. O blob URL resultante nao funciona em nova aba.

## Solucao

Fazer upload dos documentos recebidos para o Storage (bucket `helpdesk-media`) no momento do webhook, armazenando a URL publica no banco. Assim, o download funciona com link direto, sem proxy nem blob.

## Alteracoes

### 1. Edge Function `whatsapp-webhook/index.ts`

Quando um documento (ou qualquer midia exceto audio, que ja tem tratamento proprio) chegar via webhook:

1. Baixar o arquivo da URL da UAZAPI
2. Fazer upload para o bucket `helpdesk-media` no Storage
3. Salvar a URL publica resultante no campo `media_url`

Isso se aplica a documentos e imagens recebidas. Audios ja sao tratados separadamente.

### 2. Componente `MessageBubble.tsx`

Simplificar o `handleDocumentOpen`:

- Se a `media_url` ja for uma URL publica do Storage (contendo o dominio do projeto), abrir diretamente com `window.open(url, '_blank')`
- Manter o fallback via proxy apenas para URLs legadas da UAZAPI

## Secao Tecnica

### Webhook - Upload para Storage

Apos obter a URL persistente da UAZAPI, adicionar logica para:

```text
// Baixar o arquivo da UAZAPI
const mediaResponse = await fetch(mediaUrl, {
  headers: { token: instance.token }
});
const fileBlob = await mediaResponse.arrayBuffer();

// Gerar path no storage
const ext = mime-to-extension ou fallback
const storagePath = `webhook/${conversation.id}/${Date.now()}.${ext}`;

// Upload para helpdesk-media
await supabase.storage.from('helpdesk-media').upload(storagePath, fileBlob, {
  contentType: mimetype
});

// Obter URL publica
const publicUrl = supabase.storage.from('helpdesk-media').getPublicUrl(storagePath);
mediaUrl = publicUrl.data.publicUrl;
```

### MessageBubble - Abertura direta

```text
const handleDocumentOpen = async () => {
  if (!message.media_url) return;
  
  // Se ja e URL publica (Storage), abrir direto
  const isPublicUrl = message.media_url.includes('supabase') 
    || message.media_url.startsWith('https://');
  
  if (isPublicUrl && !message.media_url.includes('uazapi')) {
    window.open(message.media_url, '_blank');
    return;
  }
  
  // Fallback: proxy para URLs legadas
  // ... logica existente do proxy ...
};
```

### Arquivos modificados:
- `supabase/functions/whatsapp-webhook/index.ts` - Upload de midia para Storage
- `src/components/helpdesk/MessageBubble.tsx` - Abertura direta de URLs publicas

