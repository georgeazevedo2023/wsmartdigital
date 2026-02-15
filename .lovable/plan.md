
# Corrigir Duplicacao de Contato e Exibicao de Carrossel no HelpDesk

## Problemas Identificados

### Problema 1: Conversa duplicada
O contato "George" ja existe no banco com o JID `558193856099@s.whatsapp.net` (sem o 9 extra). Porem, o lead no Disparador tem o telefone `81993856099`, que gera o JID `5581993856099@s.whatsapp.net`. Como os JIDs sao diferentes, o `saveToHelpdesk` nao encontra o contato existente e cria um novo, resultando em uma conversa separada.

**Solucao**: Ao buscar o contato, alem de procurar pelo JID exato, tambem buscar pelo numero de telefone. Se encontrar pelo telefone, usar o contato existente.

### Problema 2: Carrossel aparece apenas como texto
O carrossel esta sendo salvo com `media_type: 'text'` e apenas o titulo como conteudo. Os dados dos cards (imagens, textos, botoes) nao sao armazenados na mensagem do HelpDesk.

**Solucao**: Salvar o carrossel com `media_type: 'carousel'` e armazenar os dados dos cards no campo `media_url` como JSON serializado. No `MessageBubble`, adicionar renderizacao visual dos cards do carrossel.

## O que sera feito

1. **`src/lib/saveToHelpdesk.ts`**: Alterar a busca de contato para usar fallback por telefone (normalizado) quando o JID exato nao for encontrado. Adicionar suporte para dados de carrossel no campo `media_url`.

2. **`src/components/broadcast/LeadMessageForm.tsx`**: Alterar a chamada do `saveToHelpdesk` no envio de carrossel para incluir `media_type: 'carousel'` e os dados dos cards serializados.

3. **`src/components/helpdesk/MessageBubble.tsx`**: Adicionar renderizacao visual para mensagens do tipo `carousel`, exibindo os cards com imagens, textos e botoes.

## Secao Tecnica

### Logica de busca de contato melhorada (saveToHelpdesk.ts)

```text
1. Buscar contato por JID exato
2. Se nao encontrar, normalizar o telefone (remover DDI 55, comparar ultimos 8-10 digitos)
3. Buscar contatos cujo telefone termine com os mesmos digitos
4. Se encontrar match, usar o contato existente (e sua conversa)
5. Se nao encontrar nenhum, criar novo contato
```

### Interface atualizada (saveToHelpdesk.ts)

Adicionar campo opcional `carousel_data` na interface `HelpdeskMessageData` para permitir passar os dados completos do carrossel. Quando presente, serializar como JSON e armazenar no campo `media_url`.

### Chamada atualizada (LeadMessageForm.tsx)

```text
saveToHelpdesk(instance.id, lead.jid, lead.phone, lead.name, {
  content: carouselData.message || 'Carrossel enviado',
  media_type: 'carousel',
  media_url: JSON.stringify(carouselData)  // dados completos dos cards
})
```

### Renderizacao no MessageBubble

Para mensagens com `media_type === 'carousel'`, fazer parse do JSON em `media_url` e renderizar:
- Titulo/mensagem principal
- Cards com imagem (aspect-ratio 4:3), texto e botoes estilizados
- Layout horizontal com scroll para os cards

### Arquivos modificados:
- `src/lib/saveToHelpdesk.ts` - Busca por telefone + suporte a carousel_data
- `src/components/broadcast/LeadMessageForm.tsx` - Passar dados completos do carrossel
- `src/components/broadcast/BroadcastMessageForm.tsx` - Mesmo ajuste para carrossel
- `src/components/helpdesk/MessageBubble.tsx` - Renderizar cards de carrossel
