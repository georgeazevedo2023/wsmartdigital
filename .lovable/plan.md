

# Adicionar Suporte a Stickers (Figurinhas) no HelpDesk

## Situacao Atual

No webhook (`normalizeMediaType`, linha 15), stickers sao mapeados como `'image'`, perdendo sua identidade. Stickers no WhatsApp sao imagens WebP sem fundo (transparentes) e devem ser exibidos de forma diferente: sem bolha de mensagem, sem link da URL, tamanho fixo.

## Mudancas

### 1. Webhook: Mapear sticker como tipo proprio (`whatsapp-webhook/index.ts`)

- Alterar `normalizeMediaType` para retornar `'sticker'` em vez de `'image'` quando o tipo contem "sticker"
- O link persistente ja e obtido automaticamente pois `mediaType !== 'text'`

Mudanca: linha 15, trocar `return 'image'` por `return 'sticker'`

### 2. Frontend: Renderizar sticker no MessageBubble (`MessageBubble.tsx`)

Adicionar bloco de renderizacao para `media_type === 'sticker'`:
- Exibir a imagem (WebP) com tamanho fixo (max 180px)
- Sem bolha de fundo (fundo transparente)
- Sem link da URL embaixo
- Com fallback de erro similar ao de imagem
- Stickers animados (WebP animados) funcionam nativamente no navegador

### Detalhes Tecnicos

**Webhook - normalizeMediaType:**
```typescript
if (lower.includes('sticker')) return 'sticker'
```

**MessageBubble - Bloco de sticker:**
```typescript
{message.media_type === 'sticker' && message.media_url && (
  <div className="mb-1">
    {!imgError ? (
      <img
        src={message.media_url}
        alt="Figurinha"
        className="max-w-[180px] max-h-[180px]"
        onError={() => setImgError(true)}
      />
    ) : (
      <div className="rounded-lg bg-muted/50 border border-border flex items-center justify-center p-4">
        <span className="text-xs text-muted-foreground">Figurinha</span>
      </div>
    )}
  </div>
)}
```

A bolha do sticker tera fundo transparente para que a figurinha apareca "solta" no chat, sem o retangulo verde/cinza.

## Arquivos Modificados
- `supabase/functions/whatsapp-webhook/index.ts` - mapear sticker como tipo separado
- `src/components/helpdesk/MessageBubble.tsx` - renderizar sticker com estilo adequado
