
# Permitir Salvar Templates de Carrossel com Imagens por Upload

## Problema Atual

Ao tentar salvar um template de carrossel cujas imagens foram adicionadas via upload (arquivo local), o sistema bloqueia e exibe o erro: *"Para salvar template de carrossel, use URLs para as imagens"*. Isso obriga o usuario a trocar todas as imagens para URL antes de salvar.

## Solucao

Antes de salvar o template, fazer upload automatico das imagens locais para o storage (bucket `carousel-images`) e substituir os arquivos pelas URLs publicas resultantes. O usuario nao precisa fazer nada diferente -- basta clicar em salvar.

## Alteracoes

### 1. `src/components/broadcast/BroadcastMessageForm.tsx`

- Remover o bloqueio que impede salvar quando ha `imageFile` nos cards
- Tornar `handleSaveTemplate` uma funcao `async`
- Antes de retornar os dados do template, percorrer os cards e, para cada um que tenha `imageFile`, fazer upload via `uploadCarouselImage` e substituir pelo URL publico
- Mostrar um toast de "Enviando imagens..." durante o processo
- Atualizar a interface `onSave` do `TemplateSelector` para aceitar `Promise`

### 2. `src/components/broadcast/LeadMessageForm.tsx`

- Mesma alteracao: remover bloqueio e fazer upload automatico dos arquivos locais antes de salvar

### 3. `src/components/broadcast/TemplateSelector.tsx`

- Atualizar o tipo da prop `onSave` para retornar `Promise<...> | ...` (suportar tanto sincrono quanto assincrono)
- No `handleSave`, usar `await` no resultado de `onSave()` para lidar com o upload assincrono
- Mostrar estado de loading adequado no botao de salvar durante o upload

## Detalhes Tecnicos

### Fluxo de upload no `handleSaveTemplate`

```typescript
// Para cada card com imageFile:
// 1. Upload para carousel-images bucket
// 2. Obter URL publica
// 3. Substituir imageFile pelo URL

const uploadedCards = await Promise.all(
  carouselData.cards.map(async (card) => {
    if (card.imageFile) {
      const url = await uploadCarouselImage(card.imageFile);
      return { ...card, image: url, imageFile: undefined };
    }
    return { ...card, imageFile: undefined };
  })
);
```

### Funcao de upload existente

O projeto ja possui `src/lib/uploadCarouselImage.ts` com as funcoes `uploadCarouselImage` e `base64ToFile`, e o bucket `carousel-images` ja esta configurado como publico. Nao e necessario criar nada novo no backend.

### Tipo do `onSave` no TemplateSelector

```typescript
onSave: () => Promise<{ ... } | null> | { ... } | null;
```

O `handleSave` do TemplateSelector passara a fazer `const templateData = await Promise.resolve(onSave())` para suportar ambos os casos.
