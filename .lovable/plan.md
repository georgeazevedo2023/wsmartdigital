
# Corrigir Download de Documentos e Botao Enviar no HelpDesk

## Problema 1: Link do documento bloqueado

O PDF foi salvo corretamente no Storage com URL publica (`tjuokxdkimrtyqsbzskj.supabase.co/storage/v1/object/public/helpdesk-media/...`), porem o Chrome (ou um adblocker) bloqueia a abertura direta do dominio `supabase.co` com `window.open()`, exibindo `ERR_BLOCKED_BY_CLIENT`.

### Solucao

Em vez de abrir o link com `window.open()`, o sistema vai:
1. Baixar o arquivo via `fetch()` programaticamente
2. Criar um blob URL local
3. Disparar o download usando uma tag `<a>` com atributo `download`

Isso contorna o bloqueio do adblocker porque o download eh feito via JavaScript (XHR/fetch), nao via navegacao direta para o dominio bloqueado.

## Problema 2: Botao enviar sumiu

O botao de enviar mensagem (icone Send) so aparece quando ha texto digitado no campo. Quando o campo esta vazio, aparece apenas o botao de microfone. Isso pode confundir o usuario.

### Solucao

Manter o botao Send sempre visivel (desabilitado quando nao ha texto), e adicionar o botao de microfone como um botao separado ao lado. Assim o usuario sempre ve ambas as opcoes.

## Secao Tecnica

### Arquivo: `src/components/helpdesk/MessageBubble.tsx`

Alterar `handleDocumentOpen` para usar fetch + download em vez de `window.open()`:

```text
const handleDocumentOpen = async () => {
  if (!message.media_url) return;
  setDownloading(true);
  try {
    // Tentar download via fetch para contornar adblocker
    const response = await fetch(message.media_url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Criar link de download
    const a = document.createElement('a');
    a.href = url;
    a.download = getDocumentInfo().fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    // Fallback: tentar proxy para URLs da UAZAPI
    if (instanceId && message.media_url.includes('uazapi')) {
      // ... logica existente do proxy ...
    } else {
      // Ultimo fallback: tentar abrir direto
      window.open(message.media_url, '_blank');
    }
  } finally {
    setDownloading(false);
  }
};
```

### Arquivo: `src/components/helpdesk/ChatInput.tsx`

Alterar a area de botoes (linhas 586-606) para mostrar Send + Mic sempre:

```text
// Antes: Send OU Mic (condicional)
// Depois: Send (desabilitado sem texto) + Mic (sempre visivel)

<Button
  size="icon"
  className="shrink-0 h-9 w-9"
  onClick={handleSend}
  disabled={!text.trim() || sending}
>
  <Send className="w-4 h-4" />
</Button>
<Button
  variant="ghost"
  size="icon"
  className="shrink-0 h-9 w-9"
  onClick={startRecording}
  disabled={isNote}
  title="Gravar audio"
>
  <Mic className="w-4 h-4" />
</Button>
```

### Arquivos modificados:
- `src/components/helpdesk/MessageBubble.tsx` - Download via fetch em vez de window.open
- `src/components/helpdesk/ChatInput.tsx` - Botao Send sempre visivel
