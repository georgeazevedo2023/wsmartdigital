
# Bug: Card de Contato do Bruno não é Renderizado Corretamente

## Diagnóstico

O fluxo no webhook `whatsapp-webhook` tem um bug de ordem de operações:

**Linha 293-301** (correto): Quando o tipo é `contact`, o webhook monta o `mediaUrl` como JSON:
```ts
mediaUrl = JSON.stringify({ displayName: "Bruno", vcard: "BEGIN:VCARD..." })
```

**Linha 341** (bug): Logo depois, a condição `if (mediaType !== 'text')` engloba `contact` também, chamando `getMediaLink()` na UAZAPI para tentar buscar um link de mídia — o que não faz sentido para contatos.

**Linha 343-376**: Se a UAZAPI retornar qualquer resultado (URL), o `mediaUrl` é sobrescrito:
```ts
mediaUrl = persistentResult.url  // ← apaga o JSON da vCard!
```

Resultado: O `media_url` salvo no banco não é `{"displayName":"Bruno","vcard":"..."}` mas sim uma URL quebrada ou inválida. O `MessageBubble.tsx` tenta fazer `JSON.parse(media_url)` e falha silenciosamente (retorna `null`), então renderiza o campo `content` como texto puro — o que exibe:
```
Bruno
Company: Neo Blindados;
Email: bruno@neoblindados.com.br
URL: https://neoblindados.com.br/
Phone (Celular): 5581989432973
```

A Eliane funciona porque ou foi recebida antes do bug, ou a UAZAPI não retornou resultado para o `getMediaLink` dela, então o JSON ficou intacto.

## Solução

### Arquivo a modificar: `supabase/functions/whatsapp-webhook/index.ts`

**Uma correção cirúrgica** na condição da linha 341: excluir `contact` do bloco que busca link de mídia persistente.

**Antes (linha 341):**
```ts
if (mediaType !== 'text' && externalId && instance.token) {
```

**Depois:**
```ts
if (mediaType !== 'text' && mediaType !== 'contact' && externalId && instance.token) {
```

Isso garante que mensagens do tipo `contact` nunca entrem no bloco de download de mídia, preservando o `mediaUrl` com o JSON da vCard intacto.

## Impacto

- Sem mudanças de banco de dados
- Sem mudanças de UI
- Sem risco de regressão: apenas exclui `contact` de um bloco de download que não se aplica a ele
- Cards de contato recebidos **após o deploy** serão exibidos corretamente como card WhatsApp-style
- Mensagens antigas do Bruno com `media_url` corrompido precisariam ser corrigidas manualmente no banco (ou o contato precisa reenviar o cartão)

## Nota sobre mensagens já salvas

As mensagens do Bruno que já estão salvas no banco com `media_url` inválido **não serão corrigidas automaticamente** — apenas novas mensagens de contato receberão o tratamento correto. Se quiser corrigir o histórico, seria necessário executar uma query de atualização manual.
