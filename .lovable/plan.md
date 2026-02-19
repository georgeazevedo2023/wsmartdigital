
# Correção: campos "Exibir no card" não aparecem no card

## Diagnóstico

O problema está em `loadCards` na linha 135 de `KanbanBoard.tsx`:

```typescript
const currentFields = fields.length > 0 ? fields : [];
```

`loadCards` é chamada dentro de `loadAll()`, logo após `setFields(...)`. Porém, em React, `useState` é **assíncrono** — o estado `fields` dentro de `loadCards` ainda reflete o valor anterior (vazio), não o que acabou de ser definido. Por isso `show_on_card` nunca é passado corretamente para os cards.

## Prova

```typescript
// loadAll():
setFields(fieldRes.data);       // ← atualiza estado (async)
await loadCards(boardData);      // ← ainda lê fields = [] !!!
```

O `allFieldsMap` é construído corretamente, mas `currentFields` é uma lista vazia, então `fieldValuesArr` também fica vazio → nenhum campo extra aparece.

## Solução

Passar `fieldRes.data` diretamente para `loadCards` como parâmetro, em vez de depender do estado `fields`. Assim a função sempre terá os dados corretos, independente do ciclo de render do React.

### Mudanças em `src/pages/dashboard/KanbanBoard.tsx`

**1. Alterar a assinatura de `loadCards`** para receber `fieldsData` como parâmetro:

```typescript
// Antes:
const loadCards = async (boardData: BoardData) => {
  const currentFields = fields.length > 0 ? fields : [];
  
// Depois:
const loadCards = async (boardData: BoardData, fieldsData: KanbanField[]) => {
  const currentFields = fieldsData;
```

**2. Em `loadAll`, passar `fieldRes.data` ao chamar `loadCards`**:

```typescript
// Antes:
await loadCards(boardData);

// Depois:
const parsedFields = (fieldRes.data || []).map(f => ({
  ...f,
  options: f.options ? (f.options as string[]) : null,
})) as KanbanField[];
setFields(parsedFields);
await loadCards(boardData, parsedFields); // ← passa diretamente
```

**3. Remover a linha problemática de dentro de `loadCards`**:
```typescript
// Remover:
const currentFields = fields.length > 0 ? fields : [];
// Usar diretamente: currentFields → fieldsData (parâmetro)
```

**4. Também corrigir o `show_on_card` no mapeamento** — garantir que o campo seja lido corretamente do objeto:

```typescript
fieldValues: fieldsData
  .map(f => ({
    name: f.name,
    value: cardFieldMap[f.id] || '',
    isPrimary: f.is_primary,
    showOnCard: f.show_on_card ?? false,  // ← sem cast (any)
  }))
  .filter(fv => fv.value),
```

## Tipo KanbanField

Verificar se `KanbanField` já inclui `show_on_card`. Se não, adicionar:

```typescript
// Em src/components/kanban/DynamicFormField.tsx
export interface KanbanField {
  // ...
  show_on_card: boolean; // adicionar se não existir
}
```

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/dashboard/KanbanBoard.tsx` | Passar `fieldsData` como parâmetro para `loadCards`; usar diretamente em vez do estado `fields` |
| `src/components/kanban/DynamicFormField.tsx` | Adicionar `show_on_card` ao tipo `KanbanField` (se ausente) |

**Total: 1-2 arquivos — sem alteração de banco de dados**

## Resultado Esperado

Após a correção, ao marcar "Exibir no card" nos campos CPF e Whatsapp, eles aparecerão imediatamente no card ao recarregar ou ao voltar ao board.
