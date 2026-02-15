
# Remover papel "Vendedor" do sistema de Helpdesk

## Resumo
Remover o valor `vendedor` do enum `inbox_role`, mantendo apenas `admin`, `gestor` e `agente`.

## Alteracoes

### 1. Migracao de banco de dados
- Atualizar qualquer registro existente com role `vendedor` para `agente`
- Recriar o enum `inbox_role` sem o valor `vendedor` (Postgres exige recriar o enum para remover valores)
- Atualizar a coluna `role` da tabela `inbox_users` para usar o novo enum

```sql
-- Converter vendedores existentes para agentes
UPDATE public.inbox_users SET role = 'agente' WHERE role = 'vendedor';

-- Recriar enum sem vendedor
ALTER TYPE public.inbox_role RENAME TO inbox_role_old;
CREATE TYPE public.inbox_role AS ENUM ('admin', 'gestor', 'agente');
ALTER TABLE public.inbox_users
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.inbox_role USING role::text::public.inbox_role,
  ALTER COLUMN role SET DEFAULT 'agente';
DROP TYPE public.inbox_role_old;

-- Recriar funcao get_inbox_role com novo tipo de retorno
CREATE OR REPLACE FUNCTION public.get_inbox_role(...)
```

### 2. ManageInboxUsersDialog.tsx
- Remover `vendedor` de `ROLE_LABELS` e `ROLE_COLORS`
- O select de roles ja usa o tipo `InboxRole` do types.ts, que sera atualizado automaticamente apos a migracao

### Arquivos modificados
- Nova migracao SQL (remover vendedor do enum)
- `src/components/dashboard/ManageInboxUsersDialog.tsx` (remover referencias ao vendedor)
