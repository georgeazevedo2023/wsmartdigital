

# Corrigir Imagens: Salvar URL Direta (Sem Download)

## Diagnostico

O arquivo no Storage contem dados corrompidos -- o binario nao comeca com os magic bytes JPEG (`FF D8 FF`). O `fetch()` do Deno para o CDN do WhatsApp retorna dados invalidos, provavelmente por headers de autenticacao ou incompatibilidade do runtime.

Os logs confirmam que `content.URL` tem a URL da imagem no CDN do WhatsApp. A URL funciona por varias horas, suficiente para atendimento em tempo real.

## Solucao

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`

**1. Remover a funcao `uploadMediaToStorage` (linhas 23-73)**

Essa funcao corrompe os dados e nao funciona corretamente no Deno com CDN do WhatsApp.

**2. Simplificar a logica de midia (linhas 202-215)**

Substituir por codigo que simplesmente usa a URL diretamente, sem nenhum download:

```typescript
// Media: usar URL diretamente sem download
if (mediaType !== 'text' && mediaUrl) {
  console.log('Storing media URL directly (no download):', mediaUrl.substring(0, 80))
}
```

Sem condicional de CDN vs persistente. Qualquer URL que vier no payload vai direto para o banco.

**3. Manter os logs de debug dos campos de midia**

Os logs existentes (linhas 187-199) continuam uteis para diagnostico futuro.

## Resultado

- Imagens aparecem imediatamente usando URL do CDN do WhatsApp
- Zero processamento de midia no servidor (mais rapido, sem corrupcao)
- URLs do CDN funcionam por varias horas (suficiente para atendimento)
- Para persistencia futura, pode-se implementar um cron job separado que baixa e salva as midias

## Arquivo a modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Remover funcao `uploadMediaToStorage`, simplificar bloco de midia para salvar URL direto |

