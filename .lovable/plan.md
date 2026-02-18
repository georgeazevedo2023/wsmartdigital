
# Fix definitivo: Bruno não aparece — RLS de `inbox_users` bloqueia a query

## Causa raiz confirmada via banco de dados

A query de duas etapas está correta no código. O problema está na **política RLS da tabela `inbox_users`**:

```
Policy: "Users can view own inbox memberships"
USING (auth.uid() = user_id)
```

Esta política faz com que Milena, ao executar:
```typescript
supabase.from('inbox_users').select('user_id').eq('inbox_id', conversation.inbox_id)
```

...receba **apenas a própria linha** (seu próprio `user_id`). Bruno e Arthur ficam invisíveis para ela. A segunda query no `user_profiles` recebe só o ID de Milena, e é por isso apenas ela aparece.

Simulação confirmada no banco:
- Banco real tem: Arthur, Bruno, Milena na inbox
- Milena vê apenas: ela própria (1 row)

## Solução

### 1. Nova política RLS em `inbox_users` (migração)

Adicionar uma política que permite que membros de uma inbox vejam os outros membros da mesma inbox:

```sql
CREATE POLICY "Inbox members can view co-members"
ON public.inbox_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inbox_users my_membership
    WHERE my_membership.user_id = auth.uid()
      AND my_membership.inbox_id = inbox_users.inbox_id
  )
);
```

**Como funciona:** Milena pode ver qualquer linha de `inbox_users` onde `inbox_id` seja uma inbox que ela mesma já faz parte. Isso é seguro — ela não vê membros de inboxes alheias.

## Por que apenas o banco precisa mudar

O código em `ContactInfoPanel.tsx` já está implementado corretamente com as duas queries sequenciais. Uma vez que a política RLS libere a leitura dos co-membros em `inbox_users`, a query retornará os IDs de Arthur, Bruno e Milena, e a segunda query em `user_profiles` (já protegida pela política "Inbox members can view co-member profiles") resolverá os nomes corretamente.

## Fluxo após o fix

```text
Milena acessa ContactInfoPanel
  → Query 1: inbox_users WHERE inbox_id = X
    → Retorna: [milena_id, bruno_id, arthur_id]  ✓ (antes: só [milena_id])
  → Query 2: user_profiles WHERE id IN [milena_id, bruno_id, arthur_id]
    → Retorna: [{Milena}, {Bruno}, {Arthur}]     ✓ (antes: só [{Milena}])
  → Dropdown exibe: — Nenhum —, Arthur, Bruno, Milena  ✓
```

## Arquivo a modificar

- **`supabase/migrations/`**: Nova migração adicionando a política RLS em `inbox_users`
- **Nenhum arquivo de código precisa ser modificado** — `ContactInfoPanel.tsx` já está correto

## Políticas finais na tabela `inbox_users`

| Política existente | Função |
|---|---|
| `Inbox admins and gestors can manage members` | CRUD para admins/gestores |
| `Super admins can manage all inbox_users` | CRUD para super admins |
| `Users can view own inbox memberships` | Usuário vê seus próprios vínculos |
| **`Inbox members can view co-members`** ← **NOVA** | Membros veem colegas da mesma inbox |
