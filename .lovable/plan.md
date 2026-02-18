
# Redesign dos Filtros do Helpdesk — Mobile First, UX Moderno

## Problema atual

A screenshot mostra 3 fileiras separadas de filtros:
1. `[ Abertas ] [ Pendentes ] [ Resolvidas ] [ Todas ]`
2. `[ Todas ] [ Minhas ] [ Não atribuídas ]   Prioridade: [ Todas ▼ ]`
3. `[ 🔍 Buscar conversa... ]`

Isso ocupa muito espaço vertical, especialmente no mobile, e a hierarquia visual não é clara. Além disso, o header tem "Atendimento" à esquerda e o seletor de caixa à direita com espaço desperdiçado.

---

## Solução: Redesign em 3 frentes

### 1. Header mais rico — aproveitar o espaço ao lado de "Atendimento"

Mover os filtros de **status** (Abertas / Pendentes / Resolvidas / Todas) para o próprio header, ao lado do título "Atendimento". Isso libera espaço na lista e dá contexto imediato.

```
[ Atendimento ]  [ Abertas ] [ Pendentes ] [ Resolvidas ] [ Todas ]        Caixa: [Neo Blindados - Geral ▼]
```

No mobile, os tabs de status ficam abaixo do título/seletor em uma linha horizontal com scroll.

### 2. Dentro da lista — filtros compactos em 1 única linha

Substituir as 2 fileiras de filtros (atribuição + prioridade) por uma única linha com visual de pill/badge, usando ícones para economizar espaço:

```
[ 🔍 Buscar conversa... ]
[ Todas ▾ ] [ Prioridade ▾ ] [ Etiqueta ▾ ]  ← dropdowns compactos
```

Os filtros de atribuição e prioridade viram dois selects compactos lado a lado com ícones, usando `w-full` no mobile para responsividade.

### 3. ConversationItem — melhorias visuais

- Adicionar badge colorido de prioridade como texto (não só o dot) quando prioridade ≠ normal
- Melhorar espaçamento e tipografia para maior clareza

---

## Layout final proposto

**Desktop:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Atendimento    [Abertas][Pendentes][Resolvidas][Todas]    Caixa: [Neo ▼] │
├──────────────────────────────────────────────────────────────────────────┤
│ Lista (w-80)              │  Chat Panel                 │  Info Panel    │
│                           │                             │                │
│ [🔍 Buscar...]            │                             │                │
│ [Atribuição ▼][Prior. ▼] │                             │                │
│ ─────────────────         │                             │                │
│ items...                  │                             │                │
└──────────────────────────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌────────────────────────────────┐
│ Atendimento    Caixa: [Neo ▼]  │
│ [Abertas][Pend.][Resol.][Tod.] │ ← scroll horizontal
├────────────────────────────────┤
│ [🔍 Buscar...]                 │
│ [Atribuição ▼] [Prioridade ▼] │
│ ────────────────────────────── │
│ items...                       │
└────────────────────────────────┘
```

---

## Arquivos a modificar

### `src/pages/dashboard/HelpDesk.tsx`

- Reestruturar `unifiedHeader`:
  - Linha 1 (desktop): `Atendimento` + tabs de status centralizados + seletor de caixa
  - Linha 1-2 (mobile): `Atendimento` + seletor / tabs de status em scroll horizontal
- Remover `statusFilter` e `onStatusFilterChange` do `listProps` (os tabs saem da lista)
- Manter `assignmentFilter`, `priorityFilter` e busca dentro da lista

### `src/components/helpdesk/ConversationList.tsx`

- **Remover** os tabs de status (vão para o header)
- **Substituir** as 2 linhas de filtros de atribuição + prioridade por **2 selects compactos em 1 linha**:
  - Select "Atribuição": ícone `UserCheck` + "Todas / Minhas / Não atribuídas"
  - Select "Prioridade": ícone `AlertCircle` + "Todas / Alta / Média / Baixa"
- Busca fica no topo da lista (antes dos filtros), para acesso imediato
- Filtro de etiqueta se mantém como terceiro select, visível apenas se houver etiquetas

### Interface de props — `ConversationList`

Remover props que saem para o header:
- `statusFilter` e `onStatusFilterChange` → saem da lista

Manter e melhorar:
- `assignmentFilter` + `onAssignmentFilterChange`
- `priorityFilter` + `onPriorityFilterChange`
- busca, etiquetas

---

## Detalhes técnicos de implementação

### Header unificado (novo)

```tsx
// Desktop
<div className="flex items-center gap-3 px-4 py-2 border-b ...">
  <h2>Atendimento</h2>
  {/* Tabs de status — ficam no header */}
  <div className="hidden md:flex items-center gap-1 flex-1">
    {statusTabs.map(tab => (
      <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
        className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors',
          statusFilter === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
        )}>{tab.label}</button>
    ))}
  </div>
  {/* Seletor de caixa */}
  <Select ...>
</div>

// Mobile: segunda linha com tabs em scroll
<div className="md:hidden flex gap-1 px-3 py-1.5 border-b overflow-x-auto no-scrollbar">
  {statusTabs.map(tab => (...))}
</div>
```

### Filtros dentro da lista (novo — 1 linha)

```tsx
<div className="p-3 space-y-2 border-b border-border/50">
  {/* Busca */}
  <div className="relative">
    <Search ... />
    <Input placeholder="Buscar conversa..." ... />
  </div>
  
  {/* Filtros compactos */}
  <div className="flex gap-2">
    <Select value={assignmentFilter} onValueChange={...}>
      <SelectTrigger className="flex-1 h-8 text-xs">
        <UserCheck className="w-3.5 h-3.5 mr-1" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas</SelectItem>
        <SelectItem value="minhas">Minhas</SelectItem>
        <SelectItem value="nao-atribuidas">Não atribuídas</SelectItem>
      </SelectContent>
    </Select>
    
    <Select value={priorityFilter} onValueChange={...}>
      <SelectTrigger className="flex-1 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      ...
    </Select>
  </div>
  
  {/* Etiqueta — só se houver */}
  {inboxLabels.length > 0 && <Select .../>}
</div>
```

---

## Resultado visual esperado

- Header mais denso e informativo: título + status tabs + seletor de caixa em uma linha
- Lista com apenas 2 linhas de controle: busca + 2 dropdowns compactos
- Mobile: tabs de status com scroll horizontal, ocupando menos altura vertical
- Hierarquia clara: status (contexto global) no header, filtros finos (atribuição, prioridade) na lista
- Sem mudanças de banco de dados ou lógica de negócio
