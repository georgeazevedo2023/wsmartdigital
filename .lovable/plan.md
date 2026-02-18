
# Fix Crítico: Recursão infinita nas políticas RLS

## O problema

A última migração criou uma política em `inbox_users` que consulta a própria tabela `inbox_users`:

```sql
-- CAUSA DO PROBLEMA: inbox_users consultando inbox_users
CREATE POLICY "Inbox members can view co-members"
ON public.inbox_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inbox_users my_membership  -- <-- self-reference!
    WHERE my_membership.user_id = auth.uid()
    AND my_membership.inbox_id = inbox_users.inbox_id
  )
);
```

Quando o Postgres avalia essa política para qualquer linha de `inbox_users`, ele precisa consultar `inbox_users` novamente para verificar o `EXISTS`, o que dispara a mesma política, criando um loop infinito. Resultado: **erro 42P17 - infinite recursion** que derruba absolutamente todas as queries que tocam `inbox_users` ou `user_profiles` (que também faz JOIN em `inbox_users`).

## A solução correta: função SECURITY DEFINER

O padrão correto para evitar recursão em RLS é criar uma **função com `SECURITY DEFINER`**, que executa com os privilégios do owner (superuser), bypassando completamente as políticas RLS ao fazer a consulta interna:

```sql
-- Função que verifica membership SEM acionar RLS
CREATE OR REPLACE FUNCTION public.is_inbox_member(_user_id uuid, _inbox_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inbox_users
    WHERE user_id = _user_id AND inbox_id = _inbox_id
  );
$$;
```

Com essa função, as políticas podem verificar membership sem recursão:

```sql
-- Política sem recursão
CREATE POLICY "Inbox members can view co-members"
ON public.inbox_users FOR SELECT
USING (
  public.is_inbox_member(auth.uid(), inbox_id)
  --    ^^ chama a função SECURITY DEFINER que bypassa RLS
);
```

## O que a migração fará

1. **Dropar** a política problemática `"Inbox members can view co-members"` em `inbox_users`
2. **Dropar** a política problemática `"Inbox members can view co-member profiles"` em `user_profiles` (também causa recursão via inbox_users)
3. **Criar** a função `is_inbox_member(_user_id, _inbox_id)` com `SECURITY DEFINER`
4. **Recriar** ambas as políticas usando a função segura

## Como funciona após o fix

```text
Milena consulta inbox_users (para listar co-membros):
  → Política "Inbox members can view co-members" é avaliada
  → Chama is_inbox_member(milena_id, inbox_id) -- SECURITY DEFINER, sem RLS
  → Função confirma: Milena É membro dessa inbox
  → Retorna TRUE → Milena vê a linha
  → Resultado: retorna Arthur, Bruno, Milena (todos os membros da inbox)

Milena consulta user_profiles (para resolver nomes):
  → Política "Inbox members can view co-member profiles" é avaliada
  → Chama is_inbox_member(milena_id, inbox_id da linha) -- SECURITY DEFINER
  → Sem recursão pois a função bypassa RLS
  → Retorna TRUE → Milena vê o perfil de Bruno/Arthur
```

## Políticas RLS finais (após migração)

Tabela `inbox_users`:

| Política | Operação | Condição |
|---|---|---|
| `Inbox admins and gestors can manage members` | ALL | admin/gestor da inbox |
| `Super admins can manage all inbox_users` | ALL | super_admin role |
| `Users can view own inbox memberships` | SELECT | `auth.uid() = user_id` |
| `Inbox members can view co-members` | SELECT | `is_inbox_member(auth.uid(), inbox_id)` |

Tabela `user_profiles`:

| Política | Operação | Condição |
|---|---|---|
| `Users can view own profile` | SELECT | `auth.uid() = id` |
| `Inbox members can view co-member profiles` | SELECT | `is_inbox_member(auth.uid(), iu.inbox_id)` via JOIN seguro |

## Arquivo a criar

- **Nova migração SQL**: Remove as políticas problemáticas, cria a função SECURITY DEFINER, e recria as políticas corretamente
- **Sem mudanças de código** — `ContactInfoPanel.tsx` já está correto com as duas queries sequenciais
