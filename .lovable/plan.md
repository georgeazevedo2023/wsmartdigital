

# Submodulo de Cadastro e Gerenciamento de Usuarios nas Caixas de Entrada

## Objetivo

Criar uma nova tela dentro do modulo Admin dedicada ao cadastro e gerenciamento de usuarios de atendimento. Esta tela permite criar usuarios com Nome, Email, Senha, definir o Papel (Admin, Gestor, Agente) e atribuir instancias e caixas de entrada, tudo em um unico fluxo.

## Visao Geral

A nova pagina ficara acessivel pelo sidebar em Admin, como um item separado ou sub-item de "Caixas de Entrada". A ideia e centralizar o gerenciamento de usuarios de atendimento (inbox_users) com criacao de conta integrada.

## Alteracoes

### 1. Nova pagina: InboxUsersManagement.tsx

Pagina dedicada em `/dashboard/inbox-users` com:

- **Lista de usuarios de atendimento**: cards mostrando cada usuario com nome, email, papel(eis) nas caixas, e quais inboxes esta atribuido
- **Botao "Novo Usuario de Atendimento"**: abre dialog com formulario completo:
  - Nome de Exibicao
  - Email (login)
  - Senha
  - Papel padrao (Admin, Gestor, Agente) - select com o enum `inbox_role`
  - Selecao de Instancia(s) - multi-select das instancias disponiveis
  - Selecao de Caixa(s) de Entrada - multi-select filtrado pelas instancias selecionadas
- **Acoes por usuario**: editar papel, gerenciar inboxes atribuidas, remover usuario

### 2. Dialog de criacao: CreateInboxUserDialog.tsx

Componente dialog com o fluxo completo:

1. Preenche Nome, Email, Senha
2. Seleciona o Papel (inbox_role)
3. Seleciona Instancia(s) para atribuir acesso
4. Seleciona Caixa(s) de Entrada para adicionar como membro
5. Ao confirmar:
   - Chama edge function `admin-create-user` para criar o usuario
   - Insere registros em `user_instance_access` para as instancias selecionadas
   - Insere registros em `inbox_users` para cada caixa selecionada com o papel escolhido

### 3. Sidebar.tsx - Adicionar link no menu Admin

Adicionar item "Equipe de Atendimento" (ou similar) nos `adminItems`:

```text
Admin
  |-- Usuarios (existente - gerenciamento geral)
  |-- Equipe de Atendimento (NOVO)
  |-- Caixas de Entrada (existente)
  |-- Configuracoes (existente)
```

### 4. App.tsx - Nova rota

Adicionar rota `/dashboard/inbox-users` com lazy loading do novo componente.

## Secao Tecnica

### Fluxo de criacao de usuario

```text
1. Super Admin preenche formulario
2. POST /functions/v1/admin-create-user (cria auth user + profile + user_role)
3. INSERT user_instance_access (para cada instancia selecionada)
4. INSERT inbox_users (para cada inbox selecionada, com o papel escolhido)
```

### InboxUsersManagement.tsx - Dados carregados

- `user_profiles` - todos os perfis
- `inbox_users` - membros de todas as inboxes (com role)
- `inboxes` - todas as caixas (id, name, instance_id)
- `instances` - todas as instancias (id, name)
- `user_instance_access` - acessos de instancia

A listagem agrupa por usuario, mostrando:
- Nome e email
- Badges com os papeis e inboxes atribuidas
- Botoes de acao (editar atribuicoes, remover)

### CreateInboxUserDialog.tsx - Estrutura

```text
Props:
  - open, onOpenChange
  - onCreated: () => void

State:
  - name, email, password (strings)
  - selectedRole (InboxRole)
  - selectedInstanceIds (string[])
  - selectedInboxIds (string[])
  - instances, inboxes (fetched on mount)
  - isCreating (boolean)

Logica:
  - Ao selecionar instancias, filtra inboxes disponiveis
  - Ao submeter: chama admin-create-user, depois inserts em batch
```

### Arquivos criados/modificados

- **CRIAR** `src/pages/dashboard/InboxUsersManagement.tsx` - pagina principal
- **CRIAR** `src/components/dashboard/CreateInboxUserDialog.tsx` - dialog de criacao
- **MODIFICAR** `src/components/dashboard/Sidebar.tsx` - adicionar item no menu admin
- **MODIFICAR** `src/App.tsx` - adicionar rota

### Nao necessita migracao de banco

Todas as tabelas necessarias ja existem:
- `user_profiles` (nome, email)
- `inbox_users` (inbox_id, user_id, role)
- `user_instance_access` (user_id, instance_id)
- `instances`, `inboxes`
- Edge function `admin-create-user` ja funcional

