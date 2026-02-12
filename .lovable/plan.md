
# Corrigir Upload de Midia para Storage

## Problema Identificado

Dois problemas confirmados:

1. **Storage upload salva arquivo vazio**: O `response.blob()` no Deno edge functions nao e compativel com o metodo `.upload()` do Supabase Storage. O arquivo e criado mas com 0 bytes. Precisa usar `Uint8Array` via `arrayBuffer()`.

2. **UAZAPI `/message/download` retorna 404**: O endpoint nao encontra a mensagem. Pode ser formato do ID ou endpoint incorreto. Isso faz o sistema cair no fallback CDN.

O fallback CDN FUNCIONA (o download da imagem ocorre) mas o upload para o Storage salva um arquivo vazio por causa do tipo de dado incorreto.

## Solucao

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

**Correcao 1: Trocar `blob()` por `arrayBuffer()` no upload**

Na funcao `uploadMediaToStorage`, trocar:

```typescript
// ANTES (nao funciona no Deno)
const blob = await response.blob()
await supabase.storage.from('helpdesk-media').upload(path, blob, { ... })

// DEPOIS (funciona no Deno)
const arrayBuf = await response.arrayBuffer()
const uint8 = new Uint8Array(arrayBuf)
const contentType = response.headers.get('content-type') || 'application/octet-stream'
await supabase.storage.from('helpdesk-media').upload(path, uint8, { contentType, upsert: true })
```

**Correcao 2: Adicionar log do tamanho do arquivo para debug**

```typescript
console.log('CDN response status:', response.status, 'size:', uint8.length, 'type:', contentType)
```

**Correcao 3: Validar que o conteudo nao e uma pagina de erro**

Verificar se o tamanho do arquivo e razoavel (> 1KB) e o content-type e de midia antes de fazer upload:

```typescript
if (uint8.length < 1000 || contentType.includes('text/html')) {
  console.log('CDN returned invalid content, skipping upload')
  return ''
}
```

**Correcao 4: Tentar tambem o formato completo do messageid no UAZAPI download**

O UAZAPI pode esperar o `messageid` no formato completo (como `true_JID_ID`). Tentar esse formato como alternativa:

```typescript
// Tentar com formato completo
const fullMessageId = `true_${chatId}_${messageId}`
// Primeiro tenta com ID curto, depois com formato completo
```

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Corrigir upload usando `arrayBuffer()` em vez de `blob()`, adicionar validacao de conteudo, melhorar logs |

## Resultado Esperado

- CDN download captura o binario corretamente
- Upload para Storage salva o arquivo com conteudo real
- Imagens aparecem no helpdesk com URL persistente do Storage
- Se CDN expirado, arquivo invalido e descartado (em vez de salvar lixo)
