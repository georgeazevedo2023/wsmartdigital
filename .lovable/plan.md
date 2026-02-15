

# Esconder Caixas de Entrada ate selecionar uma Instancia

## Problema
Atualmente, quando nenhuma instancia esta selecionada, todas as caixas de entrada sao exibidas. O comportamento correto e: a secao de caixas de entrada so deve mostrar opcoes depois que pelo menos uma instancia for selecionada.

## Alteracao

### Arquivo: `src/components/dashboard/CreateInboxUserDialog.tsx`

1. **Alterar `filteredInboxes`** (linha 71-77): quando `selectedInstanceIds` estiver vazio, retornar array vazio em vez de todas as inboxes.

```typescript
const filteredInboxes = useMemo(
  () =>
    selectedInstanceIds.length > 0
      ? inboxes.filter((ib) => selectedInstanceIds.includes(ib.instance_id))
      : [],  // era: inboxes (mostrava todas)
  [inboxes, selectedInstanceIds]
);
```

2. **Atualizar mensagem vazia** (linha 261-263): quando nenhuma instancia estiver selecionada, exibir "Selecione uma instancia primeiro".

```typescript
{filteredInboxes.length === 0 ? (
  <p className="text-sm text-muted-foreground">
    {selectedInstanceIds.length > 0
      ? 'Nenhuma caixa para as instancias selecionadas'
      : 'Selecione uma instancia primeiro'}
  </p>
) : ( ... )}
```

Apenas um arquivo modificado, duas linhas alteradas.
