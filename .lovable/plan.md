

# Corrigir corte do horario na lista de conversas

## Problema raiz

O `pr-2.5` aplicado ao `ScrollArea` (Root) nao funciona porque o componente Viewport interno do Radix usa `w-full` e o scrollbar e posicionado como overlay sobre o conteudo. O padding no Root nao afeta a area visivel do conteudo.

## Solucao

Remover o `pr-2.5` do ScrollArea e adicionar o padding diretamente no container `div` que envolve os itens de conversa. Alem disso, aumentar o `pr` do `ConversationItem` de `pr-5` para `pr-6` para garantir espaco suficiente.

## Alteracoes tecnicas

### 1. `src/components/helpdesk/ConversationList.tsx`
- Remover `pr-2.5` do `ScrollArea` (voltar para `flex-1` apenas)
- Adicionar `pr-3` no div container dos itens (`divide-y`)

### 2. `src/components/helpdesk/ConversationItem.tsx`
- Aumentar padding direito de `pr-5` para `pr-6`

## Arquivos afetados

- `src/components/helpdesk/ConversationList.tsx`
- `src/components/helpdesk/ConversationItem.tsx`

