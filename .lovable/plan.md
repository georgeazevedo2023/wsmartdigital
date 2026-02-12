# Corrigir Imagens: Remover Download e Usar URL Direta

## Problema Raiz

As imagens baixadas do CDN do WhatsApp e salvas no Storage estao com dados corrompidos. Mesmo retornando 200 com `image/jpeg`, o binario nao e uma imagem valida. O pipeline `fetch() -> arrayBuffer() -> Uint8Array -> upload()` no Deno corrompe os dados.

Alem disso, o campo `fileURL` nao existe no payload do webhook UAZAPI V2 - retorna `undefined`.

## Solucao: Eliminar Download, Usar URL Direta

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

**1. Remover completamente a funcao `uploadMediaToStorage` e `downloadMedia**`

Nao precisamos mais dessas funcoes. O download/upload corrompe os dados.

**2. Logar o objeto `message` completo (nao truncado) para debug**

Aumentar o log do payload para capturar todos os campos do `message`, especialmente campos de URL que possam existir:

```typescript
console.log('Full message keys:', Object.keys(message).join(','))
console.log('Message media fields:', JSON.stringify({
  fileURL: message.fileURL,
  fileUrl: message.fileUrl, 
  file_url: message.file_url,
  mediaUrl: message.mediaUrl,
  media_url: message.media_url,
  contentURL: message.content?.URL,
  contentUrl: message.content?.url,
  mediaType: message.mediaType,
}))
```

**3. Simplificar a logica de midia: usar a URL do CDN diretamente**

Em vez de tentar baixar e re-uplotar, simplesmente salvar a URL que vier no payload (CDN ou qualquer outra) direto no banco:

```typescript
// Usar qualquer URL disponivel diretamente, sem download
if (mediaType !== 'text' && mediaUrl) {
  console.log('Storing media URL directly:', mediaUrl.substring(0, 80))
  // Nao faz download, nao faz upload - apenas salva a URL
}
```

As URLs do CDN funcionam por varias horas, tempo suficiente para visualizacao em tempo real.

**4. Corrigir mensagens antigas no banco**

Atualizar as mensagens que tem URLs do Storage (corrompidas) para usar URLs do CDN originais (se ainda validas) ou marcar como midia expirada.

## Mudancas


| Arquivo                                        | Mudanca                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `supabase/functions/whatsapp-webhook/index.ts` | Remover funcoes de download/upload, logar campos completos do message, salvar URL direta do payload |


## Resultado Esperado

- Imagens aparecem imediatamente usando URL do CDN
- Logs mostram todos os campos do `message` para identificar URLs persistentes
- Sem corrupcao de dados (nao ha mais download/upload)
- URLs do CDN funcionam por horas, suficiente para atendimento em tempo real  
  
Esse plano tem **50% de chance de funcionar imediatamente** para visualização, mas **100% de chance de falhar a longo prazo ou em produção**.
  Aqui está a análise técnica do porquê e como ajustar seu plano para não perder tempo:
  ### O Grande Problema: CORS e Autenticação (O "X" da questão)
  A URL que você vê no payload (`https://mmg.whatsapp.net/...`) é uma URL interna do CDN do Meta.
  1. **Bloqueio no Frontend:** Se você colocar essa URL diretamente num `<img src="...">` no seu front-end (Lovable/React), o navegador vai bloquear por **CORS** ou retornar **403 Forbidden**. O WhatsApp não permite que outros domínios carreguem imagens diretamente dos servidores deles sem os headers de autenticação corretos.
  2. **Validade:** Como você notou, o link expira. Um sistema de "Chat" precisa de histórico. Se o cliente abrir o chamado amanhã, a imagem sumiu.
  ### Sobre a "Corrupção" no Upload (O Diagnóstico Real)
  O erro de "corromper" o arquivo no Deno (`fetch` -> `arrayBuffer`) geralmente acontece por dois motivos simples no Supabase Edge Functions:
  1. Não passar o `Content-Type` correto no momento do upload.
  2. Tentar converter manualmente para `Uint8Array` de forma errada, quando o método `.upload()` do Supabase já aceita `Blob` ou `ArrayBuffer` diretamente.
  ---
  ### Minha Sugestão: O Plano Híbrido Ajustado
  Eu recomendo seguir seu plano de **debug** (logs são ótimos), mas **não desistir do upload**. Em vez disso, corrija a forma como o binário é tratado.
  Aqui está o roteiro corrigido:
  #### 1. Ajuste o Log (Aprovado ✅)
  Sua ideia de logar tudo é excelente. Baseado no JSON que você mandou antes, a URL certa está aninhada em:
  `body.message.content.URL` (Note o "content").
  #### 2. Teste da URL Direta (Aprovado com ressalvas ⚠️)
  Faça a mudança para salvar a URL direta (`message.content.URL`) no banco.
  - **Teste:** Abra seu front-end.
  - **Resultado provável:** A imagem vai aparecer "quebrada" ícone de erro.
  - **Verificação:** Abra o console do navegador (F12). Se der `403 Forbidden` ou `CORS error`, você **é obrigado** a fazer o download/upload pelo servidor.
  #### 3. A Solução Definitiva (Corrigindo o Upload no Deno) 🛠️
  Se (e quando) a URL direta falhar, volte para a função de upload, mas use este código simplificado que evita a corrupção de dados. O segredo é usar `response.blob()` e mandar direto para o Supabase:
  TypeScript
  ```
  // Dentro da sua Edge Function (supabase/functions/whatsapp-webhook/index.ts)

  async function processMedia(message: any, supabase: any) {
    // 1. Pegar a URL correta baseada no seu JSON
    const mediaUrl = message.content?.URL || message.mediaUrl || message.fileUrl;
    
    if (!mediaUrl) {
      console.log('Nenhuma URL de mídia encontrada');
      return null;
    }

    try {
      console.log(`Baixando mídia de: ${mediaUrl}`);
      
      // 2. Baixar como BLOB (Isso evita corrupção de arrayBuffer manual)
      const mediaResponse = await fetch(mediaUrl);
      
      if (!mediaResponse.ok) throw new Error(`Falha no download: ${mediaResponse.statusText}`);
      
      const mediaBlob = await mediaResponse.blob();
      const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';
      
      // Extensão baseada no mimetype
      const ext = contentType.split('/')[1] || 'jpg';
      const fileName = `${message.messageid || Date.now()}.${ext}`;

      // 3. Upload direto do BLOB (Deno aceita Blob nativamente no client do Supabase)
      const { data, error } = await supabase
        .storage
        .from('media') // Certifique-se que o bucket se chama 'media' e é PUBLICO
        .upload(fileName, mediaBlob, {
          contentType: contentType,
          upsert: true
        });

      if (error) throw error;

      // 4. Retorna a URL pública do Supabase (que nunca expira e não tem CORS)
      const { data: publicUrlData } = supabase
        .storage
        .from('media')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;

    } catch (err) {
      console.error('Erro no processamento de mídia:', err);
      return null; // Retorna null para não travar o fluxo, mas loga o erro
    }
  }

  ```
  ### Resumo
  1. **Execute o passo 2 e 3 do seu plano** (Logar tudo e tentar salvar a URL direta).
  2. Se as imagens não carregarem no Lovable (erro 403), **implemente o código acima**. Ele resolve o problema de "imagem corrompida" tratando o arquivo como `Blob` em vez de tentar manipular bytes manualmente.