
# Redesign Admin: Área Unificada de Administração

## Diagnóstico atual

O painel admin está fragmentado em **3 páginas separadas** acessadas por menus diferentes na sidebar:

| Rota | Página | Função |
|---|---|---|
| `/dashboard/users` | Usuários | Super Admins — cria/exclui usuários do sistema |
| `/dashboard/inbox-users` | Equipe de Atendimento | Membros de caixas — cria agentes/gestores |
| `/dashboard/inboxes` | Caixas de Entrada | CRUD de caixas + webhooks + gerencia membros |

**Problemas identificados:**
- Criar um agente exige ir a 3 lugares diferentes: criar usuário → atribuir instância → atribuir caixa
- A distinção entre "Usuários" e "Equipe de Atendimento" é confusa para o admin
- Layout de cards em grade 2 colunas ocupa muito espaço com informações repetitivas
- Webhooks inline nas caixas (edição dentro do card) é frágil e pouco legível
- Nenhuma indicação de hierarquia de permissões visível para o admin
- Mobile: botões de ação pequenos e difíceis de tocar

---

## Solução: Página Admin Unificada com Tabs

Consolidar tudo em **uma única página** `/dashboard/admin` com **3 tabs**:

```
[ Caixas de Entrada ] [ Usuários & Acesso ] [ Equipe de Atendimento ]
```

### Mudanças de rota

- Nova rota: `/dashboard/admin` (substitui as 3 separadas)
- Rotas antigas redirecionam para `/dashboard/admin` com tab correspondente
- Sidebar: item único "Administração" com ícone `ShieldCheck` (apenas super_admin)

---

## Tab 1 — Caixas de Entrada (atual `/dashboard/inboxes`)

**Layout: Lista vertical com accordion por caixa**

Cada caixa expande para revelar:
- Instância vinculada + status de conexão
- Membros com avatar + role badge
- Webhooks em campos de edição inline com botão salvar
- Botão "Gerenciar Membros" abrindo o dialog existente

**Melhorias visuais:**
- Ícone de status colorido (verde = online, cinza = offline)
- Contador de membros como badge
- Header da caixa mais limpo: nome + instância + badges

---

## Tab 2 — Usuários & Acesso (atual `/dashboard/users`)

**Layout: Tabela responsiva em vez de grid de cards**

Colunas: Avatar + Nome | Email | Tipo | Instâncias | Ações

**Melhoria chave:** O botão "Gerenciar Instâncias" abre diretamente o dialog existente. O toggle de admin vira um switch inline na tabela.

**Melhorias visuais:**
- Badge colorido: `Super Admin` (verde com escudo) vs `Usuário` (cinza)
- Linha selecionada com highlight
- Ações em dropdown menu (3 pontos) em vez de botões expostos, liberando espaço na linha

---

## Tab 3 — Equipe de Atendimento (atual `/dashboard/inbox-users`)

**Layout: Lista com agrupamento por caixa de entrada**

Em vez de agrupar por usuário (atual), agrupa por **caixa de entrada**, tornando mais claro "quem está em qual caixa":

```
┌─ Caixa: Neo Blindados - Suporte ──────────────────┐
│ [👤 Ana] Agente   [👤 Carlos] Gestor              │
│ [+ Adicionar membro]                               │
└────────────────────────────────────────────────────┘
```

Botão "Novo Membro" abre o `CreateInboxUserDialog` existente.

---

## Melhorias de UX transversais

### Header da página
```
[ 🛡 Administração ]                      [ + Criar Novo ▼ ]
                                              ├ Nova Caixa
                                              ├ Novo Usuário Admin
                                              └ Novo Membro de Atendimento
```

O dropdown "Criar Novo" permite criar qualquer entidade sem mudar de tab.

### Hierarquia de permissões visível
Adicionar um pequeno painel de legenda fixo no topo:
```
Admin de Caixa = gerencia membros e etiquetas da caixa
Gestor = atribui conversas, vê relatórios
Agente = atende conversas
Super Admin = acesso total ao sistema
```

### Mobile-first
- Tabs com scroll horizontal e ícones
- Tabela de usuários colapsa para lista de cards no mobile (< md)
- Botões de ação com tamanho mínimo 44px de toque

---

## Arquivos a criar/modificar

### Criar: `src/pages/dashboard/AdminPanel.tsx`
Página principal unificada com os 3 tabs. Importa os dialogs existentes sem reescrevê-los.

### Modificar: `src/App.tsx`
- Adicionar rota `/dashboard/admin` → `AdminPanel`
- Manter rotas antigas como redirect para não quebrar bookmarks

### Modificar: `src/components/dashboard/Sidebar.tsx`
- Substituir os 3 itens admin (Usuários, Equipe de Atendimento, Caixas de Entrada) por **1 item único**: `Administração` apontando para `/dashboard/admin`
- Manter item "Configurações" separado

### Manter sem alteração (reutilizados como dialogs):
- `ManageInboxUsersDialog.tsx` — gerenciar membros de uma caixa
- `ManageUserInstancesDialog.tsx` — gerenciar instâncias de um usuário
- `CreateInboxUserDialog.tsx` — criar novo agente/gestor
- `ManageInstanceAccessDialog.tsx` (se existir)

---

## Estrutura da página AdminPanel

```text
AdminPanel
├── Header (título + badge de contagem + botão "Criar Novo" dropdown)
├── Tabs
│   ├── Tab "Caixas de Entrada"
│   │   ├── SearchBar
│   │   └── InboxList (accordion)
│   │       └── InboxItem (expande com membros + webhooks + ações)
│   │
│   ├── Tab "Usuários"
│   │   ├── SearchBar
│   │   └── UsersTable (responsiva)
│   │       └── UserRow (avatar, nome, email, tipo, instâncias, ações dropdown)
│   │
│   └── Tab "Equipe"
│       ├── SearchBar
│       └── InboxTeamList (agrupado por caixa)
│           └── InboxTeamCard (avatares de membros + botão gerenciar)
│
├── Dialogs (todos os existentes reutilizados)
│   ├── CreateInboxDialog
│   ├── CreateUserDialog (admin)
│   ├── CreateInboxUserDialog
│   ├── ManageInboxUsersDialog
│   └── ManageUserInstancesDialog
```

---

## Detalhes técnicos de implementação

### AdminPanel.tsx — estrutura principal

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('inboxes');
  
  // Shared state for dialogs
  const [createType, setCreateType] = useState<'inbox' | 'admin-user' | 'inbox-user' | null>(null);
  
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <AdminHeader onCreateNew={setCreateType} />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="inboxes">
            <Inbox className="w-4 h-4 mr-2" /> Caixas <Badge>{inboxes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="users">
            <Shield className="w-4 h-4 mr-2" /> Usuários <Badge>{users.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" /> Equipe <Badge>{teamCount}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="inboxes"><InboxesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="team"><TeamTab /></TabsContent>
      </Tabs>
      
      {/* Shared dialogs */}
    </div>
  );
};
```

### Tabela de Usuários (mobile-responsive)

Desktop: `<table>` com colunas Avatar/Nome | Email | Tipo | Instâncias | Ações  
Mobile (< md): lista de cards verticais com as mesmas informações

### Agrupamento da Equipe por Caixa

```tsx
// Transforma: users com memberships[] → inboxes com members[]
const inboxTeam = inboxes.map(inbox => ({
  ...inbox,
  members: teamUsers.flatMap(u =>
    u.memberships
      .filter(m => m.inbox_id === inbox.id)
      .map(m => ({ ...u, role: m.role }))
  )
}));
```

---

## Resultado esperado

**Sidebar antes (4 itens admin):**
```
Usuários
Equipe de Atendimento
Caixas de Entrada
Configurações
```

**Sidebar depois (2 itens admin):**
```
🛡 Administração
⚙ Configurações
```

**Página unificada:**
```
┌─────────────────────────────────────────────────────┐
│ 🛡 Administração                    [ + Criar Novo ▼]│
│                                                      │
│ [ Caixas (3) ]  [ Usuários (5) ]  [ Equipe (8) ]    │
│ ──────────────────────────────────────────────────── │
│                                                      │
│ [content of active tab]                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

Sem nenhuma mudança de banco de dados necessária — toda a lógica e queries existem, apenas o layout e a navegação mudam.
