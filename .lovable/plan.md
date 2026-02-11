
# Criar Tela de Gestão de Inboxes - Fase 1

## Análise da Arquitetura Atual

### Banco de Dados Existente
- **Tabelas criadas**: `inboxes`, `inbox_users`, `contacts`, `conversations`, `conversation_messages`, `labels`
- **Enums**: `inbox_role` (admin, gestor, agente, vendedor)
- **Funções SQL**: `has_inbox_access()` para RLS e `get_inbox_role()` para obter o role do usuário
- **Padrão existente**: Super Admin tem acesso total, usuários têm acesso filtrado por `user_instance_access`

### Fluxo Esperado
1. **Super Admin** cria caixa de entrada → vincula a uma instância
2. **Super Admin** adiciona usuários à inbox com roles específicos
3. **Gestores** da inbox podem gerenciar usuários/atribuições dentro de sua inbox
4. **Agentes/Vendedores** acessam conversas de suas inboxes

---

## 1. Implementação da Tela de Gestão de Inboxes

### Rota e Página Principal
**Arquivo**: `src/pages/dashboard/InboxManagement.tsx`

Estrutura:
- Header com botão "Nova Caixa de Entrada"
- Grid/Lista de inboxes com informações:
  - Nome da inbox
  - Instância vinculada
  - Número de usuários
  - Criado por (nome do super admin)
  - Botões: Gerenciar Usuários, Editar, Deletar

### Dialog para Criar Inbox
- Input: Nome da caixa de entrada
- Select: Selecionar instância (carrega instâncias do banco)
- Só super admins podem criar

### Dialog para Gerenciar Usuários da Inbox
Permite:
- Adicionar usuários existentes com seleção de role (`inbox_role`)
- Remover usuários
- Editar role de usuários já membros
- Listar todos os membros atuais com seus roles

---

## 2. Componentes Novos

| Componente | Função |
|------------|--------|
| `InboxManagementPage.tsx` | Página principal com lista de inboxes |
| `InboxCard.tsx` | Card individual de cada inbox (estilo similar a UserManagement) |
| `CreateInboxDialog.tsx` | Dialog para criar nova inbox |
| `ManageInboxUsersDialog.tsx` | Dialog para gerenciar membros e roles |

---

## 3. Integração com Sidebar

Adicionar link para "Caixas de Entrada" no sidebar apenas para Super Admins:
- Ícone: `Package` ou `MessageSquare`
- Path: `/dashboard/inboxes`
- Posição: Logo após "Usuários" nas admin items

---

## 4. Permissões e RLS

As políticas RLS já estão implementadas:
- `has_inbox_access()` → verifica se user está em `inbox_users`
- `get_inbox_role()` → retorna o role do usuário naquela inbox
- Super Admins têm acesso total via `is_super_admin()`

**Nenhuma mudança no banco é necessária** — as RLS já suportam o modelo.

---

## 5. Fluxo de Dados

### Criar Inbox
```
Super Admin → Dialog "Nova Inbox" 
  → Seleciona instância 
  → Insert em `inboxes` (created_by = auth.uid())
  → Toast de sucesso
  → Atualiza lista
```

### Gerenciar Usuários
```
Super Admin clica "Gerenciar Usuários"
  → Dialog abre com:
    - Lista de membros atuais (de `inbox_users`)
    - Input para adicionar novo usuário (select com usuários do banco)
    - Select de role para o novo usuário
    - Botões de deletar por membro
  → Insert/Delete em `inbox_users`
```

---

## 6. Interface Visual

**Estilo**: Glassmorphism + cards com badge de status (similar a UsersManagement.tsx)

**Grid Layout**:
```
┌─────────────────────────────────────────┐
│ Caixas de Entrada                       │
│                          [+ Nova Inbox] │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────┐  ┌──────────────┐ │
│  │ 📦 Support       │  │ 📦 Sales     │ │
│  │ Instância: Inst1 │  │ Instância:.. │ │
│  │ 5 membros        │  │ 3 membros    │ │
│  │ [Gerenciar] [•]  │  │ [Gerenciar]..│ │
│  └──────────────────┘  └──────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

## 7. Detalhes Técnicos

### Queries Necessárias

```typescript
// Listar inboxes com info das instâncias
SELECT inboxes.*, instances.name as instance_name
FROM inboxes
JOIN instances ON inboxes.instance_id = instances.id
WHERE is_super_admin(auth.uid()) -- RLS policy

// Listar membros de uma inbox
SELECT inbox_users.*, user_profiles.full_name, user_profiles.email
FROM inbox_users
JOIN user_profiles ON inbox_users.user_id = user_profiles.id
WHERE inbox_id = $1

// Listar usuários disponíveis (para adicionar)
SELECT * FROM user_profiles
```

### Edge Function ou Client-Side?
**Client-side** é suficiente — as queries são simples e as RLS policies protegem tudo. Sem necessidade de edge functions novas.

---

## 8. Arquivos a Criar/Modificar

### Novos Arquivos:
- `src/pages/dashboard/InboxManagement.tsx`
- `src/components/dashboard/InboxCard.tsx`
- `src/components/dashboard/CreateInboxDialog.tsx`
- `src/components/dashboard/ManageInboxUsersDialog.tsx`

### Modificados:
- `src/App.tsx` → Adicionar rota `/dashboard/inboxes`
- `src/components/dashboard/Sidebar.tsx` → Adicionar link "Caixas de Entrada"

---

## 9. Fase Futura (Não Incluído Aqui)

- Dashboard de analytics por inbox (conversas, tempo resposta)
- Auto-assign de conversas por round-robin
- Transferência entre gestores/equipes
- Histórico de auditoria (quem criou/deletou inbox)

