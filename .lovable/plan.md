
# Redesign de Permissões e UX — Plano por Etapas

## Diagnóstico Atual

O sistema possui dois contextos de papéis que vivem em paralelo e precisam ser unificados:

- **`app_role`** (tabela `user_roles`): `super_admin` | `user` — define quem é Super Admin vs. todo o resto. Apenas `super_admin` existe de forma significativa; `user` não confere nenhum privilégio especial.
- **`inbox_role`** (tabela `inbox_users`): `admin` | `gestor` | `agente` — define o papel dentro de uma caixa de atendimento específica.

**Problemas identificados:**

1. O papel `app_role.user` é inútil — não confere acesso a módulos nem diferencia um gerente de um atendente.
2. Não há um papel "Gerente" global — apenas papéis por caixa de inbox.
3. O CRM não tem controle de acesso: qualquer usuário logado vê o botão "Novo Quadro", pode criar boards e duplicá-los.
4. O `AuthContext` só expõe `isSuperAdmin` (booleano) — sem suporte a `gerente` no nível de aplicação.
5. A tela AdminPanel usa a nomenclatura "Usuário" genérica, sem distinguir visualmente Gerentes de Atendentes.
6. O `admin-create-user` Edge Function cria apenas `super_admin` ou `user` — sem opção `gerente`.

## Modelo Unificado de 3 Papéis

```
┌─────────────────────────────────────────────────────────────┐
│              PAPÉIS GLOBAIS (app_role enum)                 │
├──────────────┬──────────────┬──────────────────────────────┤
│  super_admin │   gerente    │          user                │
├──────────────┼──────────────┼──────────────────────────────┤
│ Dashboard    │ ✗            │ ✗                            │
│ Instâncias   │ ✗            │ ✗                            │
│ Disparador   │ ✗            │ ✗                            │
│ Agendamentos │ ✗            │ ✗                            │
│ Administração│ ✗            │ ✗                            │
│ Inteligência │ ✗            │ ✗                            │
│ Configurações│ ✗            │ ✗                            │
│ Atendimento  │ ✓ (todos)    │ ✓ (suas caixas)              │
│ CRM - Criar  │ ✗            │ ✗                            │
│ CRM - Editar │ ✗            │ ✗                            │
│ CRM - Ver    │ ✓ (boards da │ ✓ (boards da sua inbox)      │
│              │  sua inbox)  │                              │
└──────────────┴──────────────┴──────────────────────────────┘
```

**Clarificação:**
- `super_admin`: acesso total a todo o sistema — é o dono/admin da plataforma
- `gerente`: acessa Atendimento (todas as caixas nas quais está vinculado) e CRM (somente visualizar/operar boards vinculados à sua inbox). Sem acesso a configurações globais.
- `user` (Atendente): acessa apenas Atendimento nas caixas que lhe foram atribuídas e boards CRM Privados onde for responsável.

Os papéis por inbox (`admin`, `gestor`, `agente`) continuam funcionando para controle de permissões **dentro** de uma caixa de atendimento (quem pode gerenciar etiquetas, atribuir conversas etc.).

---

## ETAPA 1 — Banco de Dados: Adicionar papel `gerente` ao enum

### Migração SQL

```sql
-- Adicionar 'gerente' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente';
```

Isso é não-destrutivo. Os usuários existentes não são afetados.

---

## ETAPA 2 — AuthContext: Expor papel completo

### Mudança em `src/contexts/AuthContext.tsx`

Adicionar `userRole: 'super_admin' | 'gerente' | 'user' | null` e `isGerente: boolean` ao contexto, buscando o papel real do banco:

```typescript
// Busca o papel mais elevado do usuário
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);

const roleList = roles?.map(r => r.role) || [];
const isSuperAdmin = roleList.includes('super_admin');
const isGerente = roleList.includes('gerente');
```

O contexto passa a exportar: `isSuperAdmin`, `isGerente`, `userRole` (papel efetivo de mais alto nível).

---

## ETAPA 3 — Sidebar: Visibilidade por papel

### Mapa de Acesso por Item de Menu

| Item | super_admin | gerente | user (atendente) |
|---|---|---|---|
| Dashboard | ✓ | ✗ | ✗ |
| Agendamentos | ✓ | ✗ | ✗ |
| Atendimento | ✓ | ✓ | ✓ |
| CRM | ✓ | ✓ | ✗* |
| Disparador | ✓ | ✗ | ✗ |
| Instâncias | ✓ | ✗ | ✗ |
| Administração | ✓ | ✗ | ✗ |
| Inteligência | ✓ | ✗ | ✗ |
| Configurações | ✓ | ✗ | ✗ |

\* Atendentes (role `user`) NÃO veem CRM no menu — eles acessam apenas os boards onde têm cards atribuídos, mas não navegam ativamente pelo módulo.

### Mudança de Redirecionamento Pós-Login

| Papel | Redireciona para |
|---|---|
| `super_admin` | `/dashboard` |
| `gerente` | `/dashboard/helpdesk` |
| `user` | `/dashboard/helpdesk` |

---

## ETAPA 4 — CRM: Controle de Acesso Granular

### Regras de Acesso ao CRM por Papel

| Ação | super_admin | gerente | user |
|---|---|---|---|
| Ver lista de boards | ✓ todos | ✓ apenas linked à sua inbox | ✗ |
| Criar board | ✓ | ✗ | ✗ |
| Editar board | ✓ | ✗ | ✗ |
| Duplicar board | ✓ | ✗ | ✗ |
| Excluir board | ✓ | ✗ | ✗ |
| Abrir board e ver cards | ✓ | ✓ (shared) / parcial (private) | ✗ |
| Criar card | ✓ | ✓ | ✗ |
| Editar card | ✓ | ✓ (próprio/atribuído) | ✗ |
| Mover card | ✓ | ✓ (próprio/atribuído) | ✗ |

### Mudanças no Frontend do CRM

**`KanbanCRM.tsx`:**
- Esconder botão "Novo Quadro" para não-super-admins
- Empty state diferenciado: gerente vê "Você não tem quadros vinculados à sua inbox" (sem botão de criar)
- Super Admin continua com empty state + botão de criar

**`BoardCard.tsx`:**
- O `DropdownMenu` com Editar/Duplicar/Excluir só aparece para `isSuperAdmin`
- Gerentes veem apenas o botão "Abrir Quadro"

**`KanbanBoard.tsx`:**
- Botão "+ Novo Card" só aparece para `isSuperAdmin` ou `isGerente`
- Atendentes (`user`) não acessam a rota `/dashboard/crm` — rota protegida

### Mudança na Rota CRM (App.tsx)

A rota CRM passa de aberta (`<Suspense>`) para restrita:

```typescript
// Rota CRM — apenas super_admin e gerente
<Route path="crm" element={
  <CrmRoute>
    <Suspense fallback={<PageLoader />}><KanbanCRM /></Suspense>
  </CrmRoute>
} />
```

---

## ETAPA 5 — AdminPanel: Gestão Unificada de Usuários com 3 Papéis

### Redesign da Aba "Usuários"

Atualmente: toggle "Super Admin / Usuário"
Novo: seletor de papel com 3 opções visuais

**Card de usuário novo design:**
```
┌─────────────────────────────────────────────────┐
│  [Avatar] Nome do Usuário         [Badge: Papel] │
│           email@exemplo.com                      │
│                                                  │
│  [🔧 Instâncias] [📋 Papel: ▼ Gerente] [🗑️]      │
└─────────────────────────────────────────────────┘
```

**Badges visuais por papel:**
- `super_admin`: Badge violeta com ícone de escudo — "Super Admin"
- `gerente`: Badge azul com ícone de briefcase — "Gerente"
- `user`: Badge cinza com ícone de headphones — "Atendente"

### Mudança no Dialog "Criar Usuário"

Remove o toggle `Super Admin on/off`. Adiciona um seletor de papel:
```
○ Super Admin  — Acesso total ao sistema
● Gerente      — Acesso a atendimento e CRM
○ Atendente    — Acesso apenas às caixas atribuídas
```

### Mudança na Edge Function `admin-create-user`

Recebe `role: 'super_admin' | 'gerente' | 'user'` e insere o papel correto na `user_roles`:

```typescript
const { role } = body; // 'super_admin' | 'gerente' | 'user'
if (newUser.user) {
  await adminClient.from('user_roles').insert({ 
    user_id: newUser.user.id, 
    role: role || 'user' 
  });
}
```

### Ação "Alterar Papel" no AdminPanel

Remove o botão "Tornar Admin / Remover Admin" atual. Adiciona um `Select` inline para mudar o papel:

```typescript
// Remove papel antigo, insere novo
await supabase.from('user_roles').delete().eq('user_id', userId).neq('role', null);
await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
```

---

## ETAPA 6 — Banco de Dados: RLS do CRM Corrigida

### Migração SQL

```sql
-- 1. Revogar criação de boards para não-super-admins
DROP POLICY IF EXISTS "Usuários podem criar boards" ON kanban_boards;
CREATE POLICY "Apenas super admins criam boards"
  ON kanban_boards FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

-- 2. Revogar edição de boards para criadores não-admin
DROP POLICY IF EXISTS "Criadores podem atualizar seus boards" ON kanban_boards;
CREATE POLICY "Apenas super admins atualizam boards"
  ON kanban_boards FOR UPDATE
  USING (is_super_admin(auth.uid()));

-- 3. Revogar exclusão de boards para criadores não-admin
DROP POLICY IF EXISTS "Criadores podem excluir seus boards" ON kanban_boards;
CREATE POLICY "Apenas super admins excluem boards"
  ON kanban_boards FOR DELETE
  USING (is_super_admin(auth.uid()));

-- 4. Colunas e Campos — unificar em super admin
DROP POLICY IF EXISTS "Criadores do board gerenciam colunas" ON kanban_columns;
DROP POLICY IF EXISTS "Criadores do board atualizam colunas" ON kanban_columns;
DROP POLICY IF EXISTS "Criadores do board excluem colunas" ON kanban_columns;

DROP POLICY IF EXISTS "Criadores do board gerenciam campos" ON kanban_fields;
DROP POLICY IF EXISTS "Criadores do board atualizam campos" ON kanban_fields;
DROP POLICY IF EXISTS "Criadores do board excluem campos" ON kanban_fields;

-- As políticas "Super admins gerenciam todos os cards/colunas/campos" já existem
-- e cobrem o super_admin. Não precisam ser recriadas.

-- 5. Cards — ajustar UPDATE para gerentes poderem editar
-- A política "Criadores e responsáveis atualizam cards" já contempla isso
-- via created_by = auth.uid() OR assigned_to = auth.uid()
```

---

## Resumo dos Arquivos a Modificar

| Arquivo | Ação |
|---|---|
| Nova migração SQL (1) | `ALTER TYPE app_role ADD VALUE 'gerente'` |
| Nova migração SQL (2) | RLS do CRM: revogar INSERT/UPDATE/DELETE de boards para não-super-admins |
| `src/contexts/AuthContext.tsx` | Adicionar `isGerente`, `userRole` |
| `src/App.tsx` | Adicionar `CrmRoute` wrapper, atualizar redirect pós-login |
| `src/pages/Login.tsx` | Atualizar redirect pós-login para gerentes |
| `src/components/dashboard/Sidebar.tsx` | Visibilidade por papel (CRM só para admin+gerente) |
| `src/pages/dashboard/KanbanCRM.tsx` | Esconder botão criar / empty state diferenciado |
| `src/components/kanban/BoardCard.tsx` | Ocultar menu de ações para não-super-admins |
| `src/pages/dashboard/KanbanBoard.tsx` | Botão novo card restrito |
| `src/pages/dashboard/AdminPanel.tsx` | Redesign da aba Usuários com 3 papéis |
| `supabase/functions/admin-create-user/index.ts` | Receber `role` em vez de `is_super_admin` |

**Total: 2 migrações + 9 arquivos de código**

---

## Sequência de Implementação

1. **Migração 1**: Adicionar `gerente` ao enum
2. **Migração 2**: Corrigir RLS do CRM
3. **AuthContext**: Expor `isGerente` e `userRole`
4. **App.tsx + Login**: Atualizar rotas e redirects
5. **Sidebar**: Visibilidade por papel
6. **CRM (3 arquivos)**: Controle de acesso granular
7. **AdminPanel + Edge Function**: Gestão de 3 papéis com novo UX

Tudo isso será implementado por etapas sequenciais, com cada conjunto de mudanças testável de forma independente.
