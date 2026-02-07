

# Corrigir Imagens de Carrossel no Histórico de Leads

## Problema Identificado

O histórico de envios não exibe as imagens do carrossel porque elas não estão sendo salvas corretamente no banco de dados. 

### Diagnóstico

Ao analisar os dados no banco, encontrei:
```
image:     // <- Campo vazio em todos os cards!
text: Bolo de Milho Grande R$40
```

### Causa Raiz

O `LeadMessageForm.tsx` **não processa os arquivos locais** (`imageFile`) antes de salvar o log. A lógica atual simplesmente copia `card.image`, que está vazio quando o usuário faz upload de arquivos locais:

```typescript
// LeadMessageForm.tsx (código atual - problemático)
carousel_data: params.carouselData ? {
  cards: params.carouselData.cards.map(card => ({
    image: card.image || '',  // ❌ Se usou arquivo local, está vazio!
    ...
  })),
} : null,
```

### Comparação com Grupos

O `BroadcastMessageForm.tsx` (para grupos) funciona corretamente porque:
1. Possui a função `compressImageToThumbnail(file)` 
2. Processa cada card antes de salvar
3. Converte arquivos locais em thumbnails base64 comprimidos

---

## Solução

Adicionar a mesma lógica de processamento de imagens que existe no `BroadcastMessageForm` ao `LeadMessageForm`.

---

## Alterações Necessárias

### Arquivo: `src/components/broadcast/LeadMessageForm.tsx`

#### 1. Adicionar Função de Compressão de Imagem

Adicionar após a função `formatDuration` (linha ~202):

```typescript
// Compress and resize image to a smaller thumbnail for storage
const compressImageToThumbnail = (file: File, maxWidth = 200, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    
    img.onerror = () => resolve('');
    img.src = URL.createObjectURL(file);
  });
};
```

#### 2. Modificar `saveBroadcastLog` para Processar Imagens

Alterar de síncrono para assíncrono com processamento de imagens:

**Antes:**
```typescript
carousel_data: params.carouselData ? {
  message: params.carouselData.message,
  cards: params.carouselData.cards.map(card => ({
    id: card.id,
    text: card.text,
    image: card.image || '',
    buttons: card.buttons.map(...),
  })),
} : null,
```

**Depois:**
```typescript
// Prepare carousel data for storage (convert files to thumbnails)
let storedCarouselData = null;
if (params.carouselData) {
  const processedCards = await Promise.all(
    params.carouselData.cards.map(async (card) => {
      let imageForStorage = card.image || '';
      
      // If we have a file, compress it to a small thumbnail for preview
      if (card.imageFile) {
        imageForStorage = await compressImageToThumbnail(card.imageFile);
      }
      
      return {
        id: card.id,
        text: card.text,
        image: imageForStorage,
        buttons: card.buttons.map(btn => ({
          id: btn.id,
          type: btn.type,
          label: btn.label,
          value: btn.url || btn.phone || '',
        })),
      };
    })
  );

  storedCarouselData = {
    message: params.carouselData.message,
    cards: processedCards,
  };
}

// Use storedCarouselData no insert
await supabase.from('broadcast_logs').insert({
  ...
  carousel_data: storedCarouselData,
});
```

---

## Fluxo de Dados Corrigido

```text
┌─────────────────────────────────────────────────────────┐
│  ANTES (Problema)                                       │
├─────────────────────────────────────────────────────────┤
│  Card { imageFile: File, image: '' }                    │
│             ↓                                           │
│  saveBroadcastLog()                                     │
│             ↓                                           │
│  { image: '' }  ← Campo vazio no banco!                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  DEPOIS (Solução)                                       │
├─────────────────────────────────────────────────────────┤
│  Card { imageFile: File, image: '' }                    │
│             ↓                                           │
│  compressImageToThumbnail(imageFile)                    │
│             ↓                                           │
│  { image: 'data:image/jpeg;base64,...' }                │
│             ↓                                           │
│  Thumbnail exibido no histórico ✓                       │
└─────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/broadcast/LeadMessageForm.tsx` | Adicionar `compressImageToThumbnail` e processar imagens antes de salvar |

---

## Resultado Esperado

1. **Novos envios**: Imagens de carrossel serão salvas como thumbnails comprimidos
2. **Histórico**: Exibirá as imagens corretamente no preview do carrossel
3. **Performance**: Thumbnails pequenos (200px) não sobrecarregam o banco
4. **Paridade**: Comportamento idêntico entre disparador de Grupos e Leads

---

## Observação sobre Dados Existentes

Os registros de carrossel já enviados pelo Disparador de Leads **não serão corrigidos automaticamente** pois as imagens originais não foram salvas. Apenas novos envios terão as imagens preservadas no histórico.

