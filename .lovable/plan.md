
# Seleção de Campos a Exibir no Card do Kanban

## Problema

Atualmente, todos os campos com valor aparecem automaticamente no card (até 5). O usuário quer poder **escolher individualmente** quais campos aparecem no card, além do campo "Título".

## Solução

Adicionar uma coluna `show_on_card` (boolean) na tabela `kanban_fields` e um novo toggle **"Exibir no card"** na aba Campos do EditBoardDialog. Apenas campos com `show_on_card = true` (ou `is_primary = true`) serão renderizados no KanbanCardItem.

## Mudanças Necessárias

### 1. Banco de dados — nova coluna `show_on_card`

Migration SQL:
```sql
ALTER TABLE public.kanban_fields 
ADD COLUMN show_on_card boolean NOT NULL DEFAULT false;
```

- Campos novos terão `show_on_card = false` por padrão (comportamento conservador — nada aparece no card a menos que o usuário ative)
- O campo primário (`is_primary = true`) sempre aparece como título, independentemente do `show_on_card`

### 2. `src/components/kanban/EditBoardDialog.tsx` — novo toggle por campo

Adicionar `show_on_card` à interface `KanbanField`:
```typescript
interface KanbanField {
  // ...campos existentes
  show_on_card: boolean; // novo
}
```

Na seção de cada campo, adicionar um terceiro toggle ao lado de "Título do card" e "Obrigatório":

```
[ Switch ] Título do card
[ Switch ] Exibir no card      ← novo
[ Switch ] Obrigatório
```

O campo primário (`is_primary = true`) não precisa do toggle "Exibir no card" — ele sempre aparece como título.

Incluir `show_on_card` no payload de INSERT e UPDATE durante o `handleSave`.

### 3. `src/components/kanban/KanbanCardItem.tsx` — filtrar por `show_on_card`

Alterar o filtro de campos exibidos:

**Antes:**
```typescript
card.fieldValues
  .filter(fv => !fv.isPrimary && fv.value)
  .slice(0, 5)
```

**Depois:**
```typescript
card.fieldValues
  .filter(fv => !fv.isPrimary && fv.value && fv.showOnCard)
  .slice(0, 5)
```

Adicionar `showOnCard` à interface `CardData.fieldValues`:
```typescript
fieldValues?: Array<{ 
  name: string; 
  value: string; 
  isPrimary: boolean;
  showOnCard: boolean; // novo
}>
```

### 4. `src/pages/dashboard/KanbanBoard.tsx` — propagar `show_on_card`

Em `loadCards`, ao mapear os `fieldValues` do card, incluir `showOnCard`:
```typescript
fieldValues: (fields || []).map(f => ({
  name: f.name,
  value: allFieldsMap[card.id]?.find(d => d.fieldId === f.id)?.value || '',
  isPrimary: f.is_primary,
  showOnCard: f.show_on_card, // novo
})).filter(fv => fv.value),
```

## Resultado Visual na Aba Campos

```text
┌─────────────────────────────────────────────────┐
│  ⠿  Nome do Cliente  [Texto ▾]  ↑ ↓  🗑         │
│      ● Título do card                            │
│      ○ Exibir no card  ← oculto (já é o título) │
│      ○ Obrigatório                               │
├─────────────────────────────────────────────────┤
│  ⠿  CPF              [Texto ▾]  ↑ ↓  🗑         │
│      ○ Título do card                            │
│      ● Exibir no card  ← ATIVO → aparece no card│
│      ○ Obrigatório                               │
├─────────────────────────────────────────────────┤
│  ⠿  Observações       [Texto ▾]  ↑ ↓  🗑        │
│      ○ Título do card                            │
│      ○ Exibir no card  ← inativo → só no detalhe│
│      ○ Obrigatório                               │
└─────────────────────────────────────────────────┘
```

## Resultado Visual no Card

```text
┌────────────────────────────────┐
│  George Azevedo          ⠿     │  ← campo Título (is_primary)
│  CPF: 123.456.789-00           │  ← show_on_card = true
│  [G] Gustavo                   │  ← responsável
└────────────────────────────────┘
```
(Observações não aparece porque `show_on_card = false`)

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adiciona coluna `show_on_card boolean DEFAULT false` à `kanban_fields` |
| `src/components/kanban/EditBoardDialog.tsx` | Interface + toggle "Exibir no card" por campo + payload de save |
| `src/components/kanban/KanbanCardItem.tsx` | Interface `fieldValues` + filtro por `showOnCard` |
| `src/pages/dashboard/KanbanBoard.tsx` | Propaga `show_on_card` ao mapear `fieldValues` |

**Total: 1 migration + 3 arquivos**
