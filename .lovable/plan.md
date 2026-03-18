
# Melhorias de UX/UI no Painel Administrativo

## Problema Identificado
Faltam opcoes de edicao em varias areas do painel: nao e possivel editar nome de caixas de entrada, editar dados de usuarios (nome/email), nem alterar o papel de membros da equipe inline. Alem disso, faltam tooltips e recursos de usabilidade.

## Mudancas Planejadas

### 1. Editar Caixa de Entrada (Inbox)
- Adicionar opcao "Editar Nome" no menu contextual (DropdownMenu) de cada InboxCard
- Ao clicar, o nome da caixa entra em modo de edicao inline (input com botoes salvar/cancelar)
- Salvar atualiza diretamente na tabela `inboxes`

### 2. Editar Usuario
- Adicionar opcao "Editar" no UserCard (botao com icone de lapis no footer, ao lado de "Instancias")
- Abre um Dialog para editar nome completo do usuario
- Salva na tabela `user_profiles`

### 3. Editar Papel do Membro na Equipe
- No TeamSection, adicionar um seletor de papel (dropdown) ao lado do badge de papel de cada membro
- Permitir alterar entre admin/gestor/agente diretamente inline
- Salva na tabela `inbox_users`

### 4. Tooltips em Acoes
- Envolver todos os botoes de icone (excluir, instancias, editar, menu contextual) com Tooltip descritivo
- Adicionar tooltips nos filtros de papel, nos stats cards e nos badges de contagem

### 5. Melhorias de UX Adicionais
- Botao "Editar" na caixa de entrada para renomear inline com animacao suave
- Feedback visual ao salvar (toast + animacao de check)
- Transicao suave ao mudar entre modo visualizacao e edicao
- Empty states com CTAs mais claros e botoes de acao diretos
- Touch targets de 44px minimos em todos os botoes de acao no mobile

## Detalhes Tecnicos

### Arquivos modificados
- `src/pages/dashboard/AdminPanel.tsx` -- Adicionar funcionalidades de edicao e tooltips

### Novos estados necessarios
```text
editingInboxName: { id: string; value: string } | null
editingUser: UserWithRole | null (para dialog de edicao)
```

### Novos handlers
```text
handleEditInboxName(inboxId, newName) -- UPDATE inboxes SET name WHERE id
handleEditUserProfile(userId, fullName) -- UPDATE user_profiles SET full_name WHERE id
handleChangeTeamRole(userId, inboxId, newRole) -- UPDATE inbox_users SET role WHERE user_id AND inbox_id
```

### InboxCard -- mudancas
- Nova prop: onEditName
- Menu contextual ganha item "Editar Nome" com icone Pencil
- Modo de edicao inline no header (substituir texto por Input)

### UserCard -- mudancas
- Nova prop: onEdit
- Botao "Editar" no footer (ao lado de Instancias)
- Dialog de edicao com campo de nome

### TeamSection -- mudancas
- Cada membro ganha um DropdownMenu ou Select para trocar papel (admin/gestor/agente)
- Atualiza inline sem dialog

### Tooltips
- Todos os Button size="icon" envolvidos com TooltipProvider > Tooltip > TooltipTrigger/Content
- Labels descritivos: "Excluir usuario", "Gerenciar instancias", "Editar nome", "Copiar ID", etc.
