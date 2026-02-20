
# Corrigir Entidades Dinamicas no Detalhe do Card

## Problema Encontrado

Ha um bug de **sincronizacao de estado** no `EditBoardDialog`. Quando o usuario cria uma entidade nova (ex: "Bancos") e um campo `entity_select` vinculado a ela na mesma operacao de salvar:

1. `saveEntities()` insere a entidade no banco e obtem o UUID real
2. `saveEntities()` chama `setFields(...)` para atualizar o `entity_id` temporario para o UUID real
3. **Porem**, `setFields` e uma atualizacao de estado React (assincrona) --- o valor de `fields` no loop seguinte (linha 442) ainda contem o ID temporario `new_*`
4. Resultado: o campo e salvo com `entity_id = null`, pois o ID temporario nao e reconhecido

## Solucao

Alterar `saveEntities()` para **retornar** o mapa de IDs temporarios para reais (`entityIdMap`), e usa-lo diretamente no loop de salvamento dos campos, sem depender do `setFields` assincrono.

## Mudancas

### Arquivo: `src/components/kanban/EditBoardDialog.tsx`

**1. `saveEntities()` retorna o `entityIdMap`**
- Alterar a assinatura para `async (): Promise<Record<string, string>>`
- Retornar `entityIdMap` no final da funcao
- Manter o `setFields` para atualizar a UI, mas nao depender dele para a logica de salvamento

**2. `handleSave()` usa o mapa retornado**
- Capturar: `const entityIdMap = await saveEntities();`
- No loop de campos, antes de montar o payload, resolver o `entity_id`:
  ```text
  const resolvedEntityId = field.entity_id
    ? (entityIdMap[field.entity_id] || field.entity_id)
    : null;
  ```
- Usar `resolvedEntityId` no payload em vez de `field.entity_id`

| Arquivo | Mudanca |
|---|---|
| `src/components/kanban/EditBoardDialog.tsx` | `saveEntities` retorna `entityIdMap`; `handleSave` usa o mapa para resolver `entity_id` dos campos antes de salvar |

## Resultado

Ao criar entidade + campo `entity_select` e salvar, o campo sera corretamente vinculado ao UUID real da entidade, e o dropdown aparecera no detalhe do card.
