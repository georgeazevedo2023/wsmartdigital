
# Fix definitivo: Bruno não aparece e opção "Nenhum" não funciona

## Diagnóstico completo

Confirmado via banco de dados que:
- A política RLS `"Inbox members can view co-member profiles"` está criada e funcionando corretamente
- Milena, Bruno e Arthur estão todos na mesma inbox (`79575754-f7a2-4945-8d88-bfc7e1f20ed4`)
- A query simulada como Milena retorna os 3 perfis corretamente

O problema real está no **timing e na lógica de fallback do código**:

1. `agentNamesMap` em `HelpDesk.tsx` é populado de forma assíncrona. Quando `ContactInfoPanel` renderiza, ele pode ainda estar vazio `{}`
2. Quando `agentNamesMap[uid]` é `undefined`, o fallback `uid.slice(0, 8)` exibe `"d3606f7a"` — um UUID truncado que parece um bug, não um nome
3. Na screenshot, o dropdown mostra apenas "Milena" porque o UUID truncado de Bruno não é reconhecido visualmente, ou `inboxUserIds` só retornou um registro

**Para "Nenhum" não funcionar**: No Select do Radix UI, quando `conversation.assigned_to` é `null`, o valor do Select é `'__none__'`. Ao selecionar "Nenhum" novamente, o `onValueChange` não dispara (mesmo valor). Se já está sem agente e abre o dropdown, o item "Nenhum" parece estar sem marcação visual correta.

## Solução

### `src/components/helpdesk/ContactInfoPanel.tsx`

Substituir a dependência do `agentNamesMap` externo por uma **query local direta** que busca os membros da inbox com seus nomes em uma única chamada usando `user_profiles` — que agora tem a política RLS correta.

```typescript
// Nova query que funciona após o fix de RLS
const { data } = await supabase
  .from('inbox_users')
  .select('user_id, user_profiles(id, full_name)')
  .eq('inbox_id', conversation.inbox_id);
```

Isso resolve o timing problem pois a lista de agentes é carregada diretamente no componente, sem depender do estado externo.

### Fluxo corrigido

```text
ContactInfoPanel monta
  → fetchAgentIds() query: inbox_users + join user_profiles
  → retorna [{user_id: milena_id, name: "Milena"}, {user_id: bruno_id, name: "Bruno"}, ...]
  → agents = [{user_id, full_name}] com nomes reais
  → dropdown exibe: "Nenhum", "Arthur", "Bruno", "Milena"
```

### Fix do "Nenhum" (remover atribuição)

O problema é que quando `assigned_to` já é `null`, o Select exibe o placeholder mas ao clicar "Nenhum" não dispara porque o valor não mudou (`__none__` → `__none__`). A solução é:
- Verificar se `conversation.assigned_to` é `null` e nesse caso o trigger continua funcionando
- Garantir que o `handleAssignAgent` com `value === '__none__'` realmente chama `update({ assigned_to: null })`

O código atual já tem essa lógica, mas vou garantir que o broadcast também é enviado com `assigned_to: null` explicitamente.

## Arquivo a modificar

### `src/components/helpdesk/ContactInfoPanel.tsx`
- Mudar `fetchAgentIds` para fazer join direto com `user_profiles` via query aninhada do Supabase
- Remover dependência do `agentNamesMap` externo para o dropdown (manter apenas para exibição no header do chat)
- Garantir que o "Nenhum" funciona corretamente com `null`

## Nenhuma mudança de banco necessária

A política RLS já está correta. Apenas o código precisa ser atualizado.
