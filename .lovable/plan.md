
# Filtros de Atribuição e Prioridade na Lista de Conversas

## O que será feito

1. **Remover** do cabeçalho os ícones de etiquetas (Tags), reload (RefreshCw) e o badge de não-lidas (195)
2. **Adicionar** na `ConversationList` dois novos filtros:
   - **Atribuição**: "Minhas" (atribuídas ao agente logado), "Não atribuídas" e "Todas"
   - **Prioridade**: "Alta", "Média", "Baixa" e "Todas"
3. **Manter** o filtro de etiquetas (Select por label) que já existe dentro da lista
4. **Filtrar** a lista de conversas via estado local, sem precisar de novas queries ao banco (os dados já estão carregados)

---

## Layout proposto na barra de filtros (dentro de `ConversationList`)

```text
[ Abertas ] [ Pendentes ] [ Resolvidas ] [ Todas ]   ← linha 1: status (já existe)

[ Todas | Minhas | Não atribuídas ]   Prioridade: [ Todas ▼ ]   ← linha 2: NOVOS

[ 🔍 Buscar conversa... ]   ← linha 3: busca (já existe)
```

---

## Arquivos a modificar

### 1. `src/pages/dashboard/HelpDesk.tsx`

- Remover importação e uso dos ícones `Tags` e `RefreshCw` do header unificado (`unifiedHeader`)
- Remover o badge `unreadCount` do header
- Adicionar estados `assignmentFilter` (`'todas' | 'minhas' | 'nao-atribuidas'`) e `priorityFilter` (`'todas' | 'alta' | 'media' | 'baixa'`)
- Atualizar `filteredConversations` para aplicar os dois novos filtros:
  ```typescript
  // Filtro de atribuição
  if (assignmentFilter === 'minhas' && c.assigned_to !== user?.id) return false;
  if (assignmentFilter === 'nao-atribuidas' && c.assigned_to !== null) return false;
  // Filtro de prioridade
  if (priorityFilter !== 'todas' && c.priority !== priorityFilter) return false;
  ```
- Passar `assignmentFilter`, `onAssignmentFilterChange`, `priorityFilter` e `onPriorityFilterChange` para `ConversationList` via `listProps`

### 2. `src/components/helpdesk/ConversationList.tsx`

- Adicionar 4 novas props na interface:
  ```typescript
  assignmentFilter?: 'todas' | 'minhas' | 'nao-atribuidas';
  onAssignmentFilterChange?: (v: 'todas' | 'minhas' | 'nao-atribuidas') => void;
  priorityFilter?: 'todas' | 'alta' | 'media' | 'baixa';
  onPriorityFilterChange?: (v: 'todas' | 'alta' | 'media' | 'baixa') => void;
  ```
- Adicionar linha de filtros de atribuição (3 botões tipo tab, igual ao filtro de status):
  - **Todas** | **Minhas** | **Não atribuídas**
- Adicionar Select de prioridade ao lado:
  - Todas / Alta / Média / Baixa
- Remover nenhuma funcionalidade existente — os filtros de etiqueta e busca permanecem

---

## Sem mudanças de banco de dados

Todos os dados necessários já estão em memória (`conversations` com campo `assigned_to` e `priority`). Os novos filtros são puramente client-side no `filteredConversations`.

## Resultado esperado

```text
Antes do header:
  [🏷 ícone tags] [🔄 reload] [195 badge]

Depois do header:
  (limpo — apenas "Atendimento" + seletor de caixa)

Na lista de conversas:
  [ Abertas ] [ Pendentes ] [ Resolvidas ] [ Todas ]
  [ Todas ] [ Minhas ] [ Não atribuídas ]    Prioridade: [ Todas ▼ ]
  [ 🔍 Buscar conversa... ]
  ──────────────────────────
  (lista filtrada)
```
