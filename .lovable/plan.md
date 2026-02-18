
# Fix: Nenhum agente aparece no seletor — Correção da query

## Causa raiz confirmada

O erro HTTP 400 visível nos logs de rede diz exatamente:

> "Could not find a relationship between 'inbox_users' and 'user_profiles' in the schema cache"

O código atual tenta fazer um join aninhado do Supabase:
```typescript
supabase.from('inbox_users').select('user_id, user_profiles(id, full_name)')
```

Isso só funciona quando existe uma **chave estrangeira declarada** entre as tabelas. A tabela `inbox_users` tem a coluna `user_id` que referencia `auth.users`, não `user_profiles`. Por isso a query falha, `data` vem vazio, e nenhum agente aparece.

O banco de dados está correto — a query direta via `JOIN` retorna Arthur, Bruno e Milena normalmente.

## Solução

Substituir a query com join aninhado por **duas queries separadas** em `ContactInfoPanel.tsx`:

1. Buscar os `user_id`s via `inbox_users` (já funciona)
2. Buscar os nomes via `user_profiles` com `.in('id', userIds)` (funciona com a política RLS que criamos)

```typescript
// Passo 1: buscar user_ids da inbox
const { data: members } = await supabase
  .from('inbox_users')
  .select('user_id')
  .eq('inbox_id', conversation.inbox_id);

const userIds = members?.map(m => m.user_id) ?? [];

// Passo 2: buscar nomes dos perfis
const { data: profiles } = await supabase
  .from('user_profiles')
  .select('id, full_name')
  .in('id', userIds);
```

Isso evita o erro de foreign key não encontrado e usa a política RLS "Inbox members can view co-member profiles" que já está correta.

## Arquivo a modificar

- **`src/components/helpdesk/ContactInfoPanel.tsx`**: Substituir `fetchAgents` para usar duas queries sequenciais em vez do join aninhado que está falhando

## Resultado esperado

O dropdown exibirá: **— Nenhum —**, Arthur, Bruno, Milena (em ordem alfabética), e o botão ✕ para remover atribuição continuará funcionando.
