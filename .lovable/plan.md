
# Corrigir Busca de Contato e Imagens do Carrossel no HelpDesk

## Problema 1: Conversa duplicada (contato nao encontrado)

O banco tem dois contatos para George:
- `558193856099@s.whatsapp.net` (George real, telefone `558193856099`)  
- `5581993856099@s.whatsapp.net` (criado incorretamente, telefone `81993856099`)

A busca por telefone carrega apenas 50 contatos sem filtro e compara localmente. Se George nao estiver entre os 50, ele nao e encontrado.

**Solucao**: Usar uma query SQL com filtro `LIKE` nos ultimos 8 digitos do telefone, em vez de carregar contatos e filtrar no frontend.

## Problema 2: Imagens dos cards nao aparecem

Quando o usuario seleciona um arquivo local, a imagem fica em `card.imageFile` (File object) e `card.image` pode ser base64 ou vazio. Ao salvar no helpdesk, estamos passando `c.image` diretamente, que pode ser base64 (nao renderiza bem) ou string vazia.

**Solucao**: Antes de salvar no helpdesk, fazer upload das imagens dos cards para o storage (usando `uploadCarouselImage`) e usar as URLs resultantes.

## Alteracoes

### 1. `src/lib/saveToHelpdesk.ts`

Substituir a busca de contatos por telefone (que carrega 50 e filtra local) por uma query com filtro `ilike` nos ultimos 8 digitos:

```text
// Antes: carrega 50 contatos e filtra no JS
const { data: phoneContacts } = await supabase
  .from('contacts').select('id, phone, jid').limit(50);
const match = phoneContacts.find(...)

// Depois: busca diretamente no banco
const suffix = normalizePhone(contactPhone); // ultimos 8 digitos
const { data: phoneMatch } = await supabase
  .from('contacts')
  .select('id')
  .ilike('phone', `%${suffix}`)
  .limit(1)
  .maybeSingle();
```

Tambem buscar pelo JID com variacao do nono digito (tentar ambas as formas):
```text
// Se JID original e 5581993856099@s.whatsapp.net, tambem tentar 558193856099@s.whatsapp.net
```

### 2. `src/components/broadcast/LeadMessageForm.tsx`

No `handleSendCarousel`, antes de chamar `saveToHelpdesk`, fazer upload das imagens dos cards que sao arquivos locais ou base64:

```text
// Fazer upload de imagens antes de salvar no helpdesk
const helpdeskCards = await Promise.all(
  carouselData.cards.map(async (c) => {
    let imageUrl = c.image || '';
    if (c.imageFile) {
      imageUrl = await uploadCarouselImage(c.imageFile);
    } else if (c.image && c.image.startsWith('data:')) {
      const file = await base64ToFile(c.image, `card-${c.id}.jpg`);
      imageUrl = await uploadCarouselImage(file);
    }
    return { id: c.id, text: c.text, image: imageUrl, buttons: ... };
  })
);

saveToHelpdesk(..., {
  media_url: JSON.stringify({ message: ..., cards: helpdeskCards })
});
```

### 3. Limpeza do contato duplicado

Apos corrigir o codigo, o contato duplicado `5581993856099@s.whatsapp.net` (id `1c9987f5-...`) criado erroneamente pode ser removido manualmente pelo banco, ou sera ignorado nas proximas buscas ja que George sera encontrado corretamente.

### Arquivos modificados:
- `src/lib/saveToHelpdesk.ts` - Busca de contato com query SQL filtrada + variacao de JID
- `src/components/broadcast/LeadMessageForm.tsx` - Upload de imagens dos cards antes de salvar no helpdesk
