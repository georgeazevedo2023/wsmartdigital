
## Automatizar Criacao de Usuarios Auth no Destino

### Situacao Atual
A migracao lista os 8 usuarios e pede para criar manualmente no dashboard do Supabase destino. Isso e trabalhoso e propenso a erros.

### Solucao
Automatizar a criacao dos usuarios no Supabase destino usando a Admin API (`auth.admin.createUser`). O sistema vai:

1. Buscar os usuarios do projeto origem (ja funciona)
2. Criar cada usuario no projeto destino com o **mesmo UUID**, email e metadados
3. Definir uma senha temporaria padrao para todos
4. Mostrar resultado no log

### Como funciona para voce

Apos a migracao, cada usuario vai poder fazer login no novo sistema usando:
- **Email**: o mesmo de antes
- **Senha temporaria**: `Trocar@123` (voce informa para cada usuario trocar depois)

Os UUIDs sao preservados, entao todas as referencias nas tabelas (`user_profiles`, `user_roles`, `inbox_users`, etc.) continuam funcionando.

### Detalhes Tecnicos

**Arquivo 1: `supabase/functions/migrate-to-external/index.ts`**

Adicionar nova action `migrate-auth-users` que:
- Busca usuarios da origem via `pureAdminClient.auth.admin.listUsers()`
- Para cada usuario, cria no destino via `externalClient.auth.admin.createUser()` com:
  - `id`: mesmo UUID original
  - `email`: mesmo email
  - `email_confirm: true` (para nao precisar confirmar)
  - `password`: senha temporaria `Trocar@123`
  - `user_metadata`: mesmos metadados (full_name, etc.)
- Retorna contagem de sucesso/falha

**Arquivo 2: `src/components/dashboard/MigrationWizard.tsx`**

- Alterar o step `auth` de `get-auth-users` para `migrate-auth-users`
- Atualizar descricao de "Lista usuarios para criacao manual" para "Cria usuarios no destino"
- Remover o card de "Crie manualmente" e substituir por resultado automatizado
- Mostrar a senha temporaria no log para o admin saber

### Resumo
- 2 arquivos modificados
- Usuarios criados automaticamente com mesmo UUID e senha temporaria
- Zero trabalho manual necessario
