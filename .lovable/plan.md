

# Adicionar Toggle para Retrair/Expandir a Lista de Conversas

## Objetivo
Adicionar um botão de alternância (similar ao existente para o painel de contato à direita) para retrair/expandir a coluna da lista de conversas (coluna esquerda) no desktop. No mobile, manter apenas a lista como visualização padrão (já funciona assim).

## Mudanças

### 1. `src/pages/dashboard/HelpDesk.tsx` (Desktop)

- Adicionar estado `showConversationList` (default: `true`)
- Envolver a coluna esquerda (`w-80`) com renderização condicional baseada nesse estado
- Passar `onToggleList` e `showingList` como props para o `ChatPanel`

### 2. `src/components/helpdesk/ChatPanel.tsx`

- Adicionar props: `onToggleList?: () => void` e `showingList?: boolean`
- No header do chat, adicionar um botão com ícones `PanelLeftOpen` / `PanelLeftClose` (do Lucide) ao lado esquerdo (antes do nome do contato)
- O botão só aparece no desktop (quando `onToggleList` é fornecido)

### Detalhes Visuais

```text
Desktop com lista aberta (padrão):
[Lista w-80] | [▐◄] Nome do contato     [►▌] | [Info]

Desktop com lista fechada:
[▐►] Nome do contato     [►▌] | [Info]
```

- Ícone `PanelLeftClose` quando a lista está visível (clique fecha)
- Ícone `PanelLeftOpen` quando a lista está oculta (clique abre)
- Estilo consistente com o botão existente do painel de contato (ghost, size icon, h-9 w-9)

### Mobile
Nenhuma mudança necessária -- o sistema atual de `mobileView` ('list', 'chat', 'info') já exibe apenas uma view por vez, com a lista como padrão.

## Arquivos Modificados
- `src/pages/dashboard/HelpDesk.tsx` -- estado + renderização condicional da coluna esquerda
- `src/components/helpdesk/ChatPanel.tsx` -- novo botão toggle no header

