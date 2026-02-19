
# Correção do CardDetailSheet e KanbanCardItem

## Problemas Identificados

### 1. Responsável não salva (RLS bloqueando UPDATE)
A política de UPDATE em `kanban_cards` é:
```sql
USING (created_by = auth.uid() OR assigned_to = auth.uid() OR board creator)
```
Quando um Super Admin tenta atribuir responsável a um card que não criou e ainda não tem responsável, o UPDATE passa pela condição de board creator (quem criou o board) — mas se o usuário logado é o `created_by` do card, deveria funcionar. O problema real é outro: o `handleSave` no `CardDetailSheet` usa `title.trim()` como campo obrigatório, mas **o campo Title foi sincronizado com o campo primário dinâmico**. Se o usuário preenche o campo dinâmico "Nome do Cliente" mas deixa o "Nome/Título" vazio (por confusão), o save nem executa (`if (!title.trim()) return`).

**Solução**: Remover o campo title separado — usar o valor do campo primário como título automaticamente durante o save.

### 2. Nomes duplicados no dropdown
Na função `loadTeamMembers` com inbox, o query é:
```typescript
supabase.from('inbox_users').select('user_profiles(id, full_name, email)').eq('inbox_id', ...)
```
Se um usuário aparecer em múltiplos registros de `inbox_users` (cenário de múltiplos roles na mesma inbox), retorna perfis duplicados. 

**Solução**: Deduplicate o array de `teamMembers` por `id` após o fetch. Também deduplicate para o caso de boards sem inbox.

### 3. Remover campo "Nome / Título" duplicado
O `CardDetailSheet` exibe:
- Campo "Nome / Título" (estado `title`) — o título interno do card
- Campo "Nome do Cliente" com badge `principal` (campo dinâmico primário)

O usuário preenche os dois com o mesmo valor — redundante e confuso.

**Solução**: No `CardDetailSheet`:
- Ocultar o input de `title` separado
- Quando o campo primário `is_primary = true` existir, usar o seu valor como `title` automaticamente no `handleSave`
- Se não houver campo primário, manter o título como campo editável (fallback)

### 4. Exibir outros campos no card (KanbanCardItem)
Hoje o `KanbanCardItem` mostra apenas o `primaryFieldValue`. O usuário quer ver outros campos também.

**Solução em duas partes**:

**Parte A** — `loadCards` em `KanbanBoard.tsx`: buscar valores de **todos** os campos (não só o primário) e mapeá-los no `CardData`.

**Parte B** — `KanbanCardItem.tsx`: exibir até 2-3 campos não-primários abaixo do campo primário, no formato `Label: Valor`.

## Mudanças por Arquivo

### `src/components/kanban/KanbanCardItem.tsx`

Adicionar `fieldValues?: Array<{ name: string; value: string; isPrimary: boolean }>` ao `CardData`. Exibir campos adicionais no card:

```
┌─────────────────────────────────────┐
│  George Azevedo          ⠿          │  ← título (campo primário ou title)
│  Nome do Cliente: George Azevedo    │  ← primário (se title ≠ primaryField)
│  CPF: 123.456.789-00                │  ← outros campos
│  Valor: R$ 150.000,00               │  ← até 2 extras
│  [G] Gustavo                        │  ← responsável
└─────────────────────────────────────┘
```

Como o usuário quer remover o título separado, a exibição ficará:
```
┌─────────────────────────────────────┐
│  George Azevedo          ⠿          │  ← campo primário vira título
│  CPF: 123.456.789-00                │  ← outros campos aparecem
│  Valor: R$ 150.000,00               │
│  [G] Gustavo                        │
└─────────────────────────────────────┘
```

### `src/components/kanban/CardDetailSheet.tsx`

1. **Ocultar campo "Nome / Título"** quando houver campo primário
2. **Usar valor do campo primário como title** no `handleSave`:
   ```typescript
   const primaryField = fields.find(f => f.is_primary);
   const effectiveTitle = primaryField 
     ? (fieldValues[primaryField.id] || title) 
     : title;
   // Salvar effectiveTitle como title no kanban_cards
   ```
3. **Deduplicar teamMembers** por `id`:
   ```typescript
   const unique = [...new Map(members.map(m => [m.id, m])).values()];
   ```

### `src/pages/dashboard/KanbanBoard.tsx`

Em `loadCards`: carregar valores de **todos** os campos (não só o primário) e incluir no card:

```typescript
// Buscar todos os campos, não só o primário
const { data: cardData } = await supabase
  .from('kanban_card_data')
  .select('card_id, field_id, value')
  .in('card_id', cardIds);

// Mapear por card_id → array de { fieldId, value }
const allFieldsMap: Record<string, Array<{fieldId: string, value: string}>> = {};
(cardData || []).forEach(d => {
  if (!allFieldsMap[d.card_id]) allFieldsMap[d.card_id] = [];
  allFieldsMap[d.card_id].push({ fieldId: d.field_id, value: d.value || '' });
});

// Ao criar CardData, incluir fieldValues mapeados para os campos configurados
fieldValues: (fields || []).map(f => ({
  name: f.name,
  value: allFieldsMap[card.id]?.find(d => d.fieldId === f.id)?.value || '',
  isPrimary: f.is_primary,
})).filter(fv => fv.value), // só campos com valor
```

Em `loadTeamMembers`: deduplicar por `id`:
```typescript
const unique = [...new Map(members.map(m => [m.id, m])).values()];
setTeamMembers(unique);
```

## Arquivos Modificados

| Arquivo | Mudanças |
|---|---|
| `src/pages/dashboard/KanbanBoard.tsx` | `loadCards` busca todos os campos; `loadTeamMembers` deduplica |
| `src/components/kanban/KanbanCardItem.tsx` | Adiciona `fieldValues` ao `CardData`; exibe campos extras no card |
| `src/components/kanban/CardDetailSheet.tsx` | Remove input de título quando há campo primário; sincroniza título com campo primário no save; deduplica membros |

**Total: 3 arquivos modificados — nenhuma mudança de banco de dados necessária**
