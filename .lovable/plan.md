

# Login e Acesso Restrito para Usuarios de Atendimento

## Resumo

Quando um usuario de atendimento (nao super_admin) fizer login, ele devera ser redirecionado diretamente para a Central de Atendimento e ver apenas as caixas de entrada atribuidas a ele. O sidebar tambem sera adaptado para mostrar somente os itens relevantes ao seu papel.

## Alteracoes

### 1. Login.tsx - Redirecionamento inteligente apos login

Apos login bem-sucedido, verificar se o usuario e super_admin:
- **Super Admin**: redireciona para `/dashboard` (comportamento atual)
- **Usuario comum (agente/gestor/admin de inbox)**: redireciona para `/dashboard/helpdesk`

Isso sera feito consultando `user_roles` apos o login para decidir a rota.

### 2. AuthContext.tsx - Verificar se o usuario tem inboxes

Nenhuma alteracao necessaria. O contexto ja expoe `isSuperAdmin` que sera usado para o redirecionamento.

### 3. HelpDesk.tsx - Filtrar inboxes por acesso do usuario

Atualmente a pagina busca todas as inboxes sem filtro. Alterar para:
- **Super Admin**: ve todas as inboxes (comportamento atual)
- **Usuario comum**: busca apenas as inboxes onde ele e membro (via tabela `inbox_users`)

```text
// Para usuarios comuns:
SELECT inboxes.id, inboxes.name, inboxes.instance_id
FROM inboxes
INNER JOIN inbox_users ON inbox_users.inbox_id = inboxes.id
WHERE inbox_users.user_id = auth.uid()
```

### 4. Sidebar.tsx - Adaptar navegacao por papel

Para usuarios nao super_admin:
- **Esconder** a secao "Admin" inteira (Usuarios, Equipe de Atendimento, Caixas de Entrada, Configuracoes)
- **Esconder** itens que nao sao relevantes (Dashboard geral, Instancias, Disparador, Agendamentos)
- **Mostrar** apenas o menu "Atendimento" com as caixas de entrada atribuidas ao usuario
- Filtrar as inboxes no sidebar da mesma forma que no HelpDesk (via `inbox_users`)

### 5. App.tsx - Proteger rotas admin

Criar um wrapper `AdminRoute` que redireciona usuarios nao-super_admin para `/dashboard/helpdesk` caso tentem acessar rotas administrativas.

## Secao Tecnica

### Fluxo de login do usuario de atendimento

```text
1. Usuario faz login com email/senha (criado pelo super admin)
2. AuthContext carrega perfil + verifica isSuperAdmin
3. Login.tsx verifica isSuperAdmin:
   - true  -> navega para /dashboard
   - false -> navega para /dashboard/helpdesk
4. Sidebar exibe apenas menu "Atendimento" com inboxes do usuario
5. HelpDesk filtra inboxes via join com inbox_users
```

### Sidebar - Logica de visibilidade

```text
Se isSuperAdmin:
  - Mostra tudo (Dashboard, Agendamentos, Atendimento, Disparador, Instancias, Admin)
Se NAO isSuperAdmin:
  - Mostra apenas "Atendimento" (com inboxes filtradas por inbox_users)
```

### HelpDesk.tsx - Query filtrada

```text
Se isSuperAdmin:
  supabase.from('inboxes').select('id, name, instance_id')

Se NAO isSuperAdmin:
  supabase.from('inbox_users')
    .select('inbox_id, inboxes(id, name, instance_id)')
    .eq('user_id', user.id)
```

### AdminRoute wrapper (App.tsx)

```text
const AdminRoute = ({ children }) => {
  const { isSuperAdmin, loading } = useAuth();
  if (loading) return <spinner>;
  if (!isSuperAdmin) return <Navigate to="/dashboard/helpdesk" />;
  return children;
};
```

Rotas protegidas com AdminRoute:
- /dashboard (index/home)
- /dashboard/users
- /dashboard/inbox-users
- /dashboard/inboxes
- /dashboard/settings
- /dashboard/instances/*
- /dashboard/broadcast/*
- /dashboard/scheduled

### Arquivos modificados

- **src/pages/Login.tsx** - redirecionamento condicional
- **src/pages/dashboard/HelpDesk.tsx** - filtro de inboxes por usuario
- **src/components/dashboard/Sidebar.tsx** - menu adaptativo por papel
- **src/App.tsx** - AdminRoute wrapper para rotas restritas

### Nao necessita migracao de banco

As tabelas `inbox_users`, `user_roles` e `inboxes` ja existem com as politicas RLS corretas.

