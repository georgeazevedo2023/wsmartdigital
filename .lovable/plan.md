
# Etiquetas (Labels) no HelpDesk

## Resumo

Adicionar sistema de etiquetas coloridas por caixa de entrada, com gerenciamento (criar, editar, excluir) e atribuicao de etiquetas a conversas. As tabelas `labels` e `conversation_labels` ja existem no banco de dados.

## Funcionalidades

### 1. Gerenciamento de Etiquetas
- Botao no cabecalho da lista de conversas (ou no seletor de inbox) para abrir dialog de gerenciamento
- Criar etiqueta: nome + cor (paleta pre-definida)
- Editar e excluir etiquetas existentes
- Etiquetas sao por caixa de entrada (inbox)

### 2. Atribuir Etiquetas a Conversas
- No painel de informacoes do contato (`ContactInfoPanel`), secao "Etiquetas" com as etiquetas atuais
- Botao "+" para abrir popover/dropdown com etiquetas disponiveis da inbox
- Clicar em uma etiqueta adiciona/remove da conversa (toggle)
- Etiquetas exibidas como badges coloridos

### 3. Exibir Etiquetas na Lista de Conversas
- No `ConversationItem`, exibir badges pequenos das etiquetas atribuidas abaixo da ultima mensagem

### 4. Filtrar por Etiqueta (bonus)
- Dropdown de filtro por etiqueta na lista de conversas

## Secao Tecnica

### Banco de Dados
Nenhuma migracao necessaria. As tabelas ja existem:
- `labels` (id, inbox_id, name, color) com RLS por inbox
- `conversation_labels` (id, conversation_id, label_id) com RLS por inbox via conversation

### Novos Componentes
1. **`src/components/helpdesk/ManageLabelsDialog.tsx`**
   - Dialog com lista de etiquetas da inbox selecionada
   - Formulario inline para criar nova etiqueta (nome + seletor de cor)
   - Botoes editar/excluir por etiqueta
   - CRUD via Supabase nas tabelas `labels`

2. **`src/components/helpdesk/ConversationLabels.tsx`**
   - Componente reutilizavel que exibe badges das etiquetas de uma conversa
   - Usado no `ContactInfoPanel` e no `ConversationItem`

3. **`src/components/helpdesk/LabelPicker.tsx`**
   - Popover com lista de etiquetas da inbox
   - Toggle (checkbox) para adicionar/remover de uma conversa
   - Usado no `ContactInfoPanel`

### Alteracoes em Arquivos Existentes
- **`ContactInfoPanel.tsx`**: Adicionar secao "Etiquetas" com `ConversationLabels` + `LabelPicker` + botao para abrir `ManageLabelsDialog`
- **`ConversationItem.tsx`**: Exibir `ConversationLabels` (badges pequenos) na area da ultima mensagem
- **`ConversationList.tsx`**: Adicionar botao de gerenciar etiquetas no cabecalho e filtro por etiqueta
- **`HelpDesk.tsx`**: Buscar labels e conversation_labels junto com as conversas, passar como props

### Fluxo de Dados
1. `HelpDesk.tsx` busca `labels` da inbox selecionada e `conversation_labels` das conversas carregadas
2. Passa as labels e conversation_labels como props para os componentes filhos
3. `ContactInfoPanel` permite adicionar/remover etiquetas via `LabelPicker`
4. `ManageLabelsDialog` faz CRUD direto na tabela `labels`
5. Ao alterar etiquetas, refaz o fetch para atualizar a UI
