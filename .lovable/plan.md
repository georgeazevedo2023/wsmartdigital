
# Adicionar Etiquetas no Chat e Remocao Rapida

## Objetivo

1. Adicionar opcao "Etiquetas" no menu "+" do ChatInput (junto com Nota privada, Enviar imagem, Enviar documento)
2. Permitir remover etiquetas rapidamente clicando no "x" dos badges no ContactInfoPanel

## Alteracoes

### 1. ChatInput.tsx - Adicionar opcao de etiquetas no menu "+"

- Adicionar um item "Etiquetas" no popover do menu "+" que abre um sub-popover com a lista de etiquetas (usando LabelPicker)
- O componente precisa receber novas props: `inboxLabels`, `assignedLabelIds`, `conversationId`, e `onLabelsChanged`
- Ao clicar em "Etiquetas" no menu, abre o LabelPicker inline dentro do popover

### 2. ChatPanel.tsx - Passar props de labels para ChatInput

- Receber as props `inboxLabels`, `assignedLabelIds` e `onLabelsChanged` do HelpDesk
- Repassar para o ChatInput

### 3. HelpDesk.tsx - Passar props de labels para ChatPanel

- Passar `inboxLabels`, `assignedLabelIds` (do mapa) e `onLabelsChanged` para o ChatPanel (tanto desktop quanto mobile)

### 4. ConversationLabels.tsx - Adicionar botao de remover

- Adicionar prop opcional `onRemove(labelId)` que, quando presente, exibe um botao "x" em cada badge
- Ao clicar no "x", chama `onRemove` com o id da etiqueta

### 5. ContactInfoPanel.tsx - Usar remocao rapida

- Passar callback `onRemove` para o ConversationLabels que remove a etiqueta da conversa via Supabase (delete na tabela `conversation_labels`) e chama `onLabelsChanged`

## Secao Tecnica

### ChatInput.tsx
- Importar `LabelPicker` e tipos
- Novas props na interface: `inboxLabels?: Label[]`, `assignedLabelIds?: string[]`, `onLabelsChanged?: () => void`
- Adicionar item no menu popover com icone `Tags` e texto "Etiquetas"
- Ao clicar, mostra as etiquetas inline no menu (lista com checkboxes, similar ao LabelPicker)

### ChatPanel.tsx
- Novas props: `inboxLabels`, `assignedLabelIds`, `onLabelsChanged`
- Passar para `<ChatInput ... inboxLabels={inboxLabels} assignedLabelIds={assignedLabelIds} onLabelsChanged={onLabelsChanged} />`

### HelpDesk.tsx
- Nas duas renderizacoes de ChatPanel (mobile e desktop), passar:
  - `inboxLabels={inboxLabels}`
  - `assignedLabelIds={selectedConversation ? conversationLabelsMap[selectedConversation.id] || [] : []}`
  - `onLabelsChanged={handleLabelsChanged}`

### ConversationLabels.tsx
- Nova prop opcional: `onRemove?: (labelId: string) => void`
- Quando presente, cada badge exibe um botao "x" (icone X de 8px) no final
- Ao clicar no "x", chama `onRemove(label.id)`

### ContactInfoPanel.tsx
- Criar funcao `handleRemoveLabel` que faz delete na `conversation_labels` e chama `onLabelsChanged`
- Passar `onRemove={handleRemoveLabel}` para `<ConversationLabels />`

### Arquivos modificados:
- `src/components/helpdesk/ChatInput.tsx`
- `src/components/helpdesk/ChatPanel.tsx`
- `src/pages/dashboard/HelpDesk.tsx`
- `src/components/helpdesk/ConversationLabels.tsx`
- `src/components/helpdesk/ContactInfoPanel.tsx`
