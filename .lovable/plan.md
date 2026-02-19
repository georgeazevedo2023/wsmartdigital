
# Correção: Dropdown "Responsável" mostrando apenas membros do quadro

## Causa Raiz

No arquivo `src/pages/dashboard/KanbanBoard.tsx`, a função `loadTeamMembers` tem essa lógica incorreta:

```typescript
const loadTeamMembers = async (boardData: BoardData) => {
  if (boardData.inbox_id) {
    // Busca membros da inbox ← correto
  } else {
    // Se não tem inbox, busca TODOS os usuários ← ERRADO
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .order('full_name');
    setTeamMembers((data || []) as TeamMember[]);
  }
};
```

Isso faz com que Arthur, Bruno, Casa do Agricultor, George Azevedo e Milena apareçam no dropdown — mesmo que apenas Gustavo tenha sido adicionado ao quadro como membro direto.

## Correção

A função precisa ser reescrita para tratar **três fontes de membros** em ordem de prioridade:

1. **Com inbox**: buscar membros da `inbox_users` via join com `user_profiles` (já funciona)
2. **Sem inbox, com membros diretos**: buscar apenas usuários de `kanban_board_members` para o board atual
3. **Sem inbox, sem membros diretos**: lista vazia (ou apenas o super admin)

### Nova lógica de `loadTeamMembers`

```typescript
const loadTeamMembers = async (boardData: BoardData) => {
  if (boardData.inbox_id) {
    // Manter lógica existente: membros da inbox
    const { data } = await supabase
      .from('inbox_users')
      .select('user_profiles(id, full_name, email)')
      .eq('inbox_id', boardData.inbox_id);
    const members = (data || [])
      .map((d: any) => d.user_profiles)
      .filter(Boolean) as TeamMember[];
    setTeamMembers(members);
  } else {
    // Sem inbox: apenas membros diretos do quadro via kanban_board_members
    const { data } = await supabase
      .from('kanban_board_members')
      .select('user_id, user_profiles(id, full_name, email)')
      .eq('board_id', boardData.id);
    const members = (data || [])
      .map((d: any) => d.user_profiles)
      .filter(Boolean) as TeamMember[];
    setTeamMembers(members);
  }
};
```

Para isso funcionar, o Supabase precisa conseguir fazer join de `kanban_board_members` com `user_profiles`. Como `kanban_board_members.user_id` não tem foreign key explícita para `user_profiles.id`, o join via `.select('user_profiles(...)` pode não funcionar automaticamente.

**Alternativa mais segura** (buscar os IDs dos membros e depois buscar os perfis):

```typescript
const loadTeamMembers = async (boardData: BoardData) => {
  if (boardData.inbox_id) {
    // Membros da inbox (lógica existente)
    ...
  } else {
    // 1. Buscar IDs dos membros diretos do quadro
    const { data: memberRows } = await supabase
      .from('kanban_board_members')
      .select('user_id')
      .eq('board_id', boardData.id);
    
    const memberIds = (memberRows || []).map(r => r.user_id);
    
    if (memberIds.length === 0) {
      setTeamMembers([]);
      return;
    }
    
    // 2. Buscar perfis apenas desses usuários
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', memberIds)
      .order('full_name');
    
    setTeamMembers((profiles || []) as TeamMember[]);
  }
};
```

## Arquivo a Modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/dashboard/KanbanBoard.tsx` | Corrigir `loadTeamMembers` para usar membros diretos (`kanban_board_members`) quando não há inbox vinculada ao quadro |

**Total: 1 arquivo, ~15 linhas alteradas**

## Resultado Esperado

- Quadro **sem inbox**: dropdown "Responsável" mostra **apenas** os usuários adicionados na aba "Acesso" do EditBoardDialog (ex: somente Gustavo)
- Quadro **com inbox**: dropdown "Responsável" continua mostrando os membros da caixa de entrada (comportamento existente e correto)
- **Sem regressão**: nenhuma outra funcionalidade é afetada
