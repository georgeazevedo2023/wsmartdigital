

## Pagina de Migracao Automatizada para Supabase Externo

### Visao Geral
Criar uma pagina dentro do Admin Panel que permite ao super admin inserir as credenciais de um Supabase externo e executar a migracao automatica do banco de dados (schema, funcoes, RLS, storage, dados filtrados) diretamente, sem precisar copiar/colar SQL manualmente.

### Credenciais Necessarias
O usuario precisara fornecer 3 dados do Supabase de destino:
- **SUPABASE_EXTERNAL_URL**: URL do projeto externo
- **SUPABASE_EXTERNAL_SERVICE_ROLE_KEY**: chave service role
- **SUPABASE_EXTERNAL_DB_URL**: connection string postgres (para executar DDL)

A Database URL e encontrada em: Supabase Dashboard -> Settings -> Database -> Connection string -> URI

### Arquitetura

```text
Frontend (AdminPanel)          Edge Function              Supabase Externo
       |                            |                           |
       |-- 1. Credenciais --------->|                           |
       |                            |-- 2. Testa conexao ------>|
       |<-- 3. OK ------------------|                           |
       |                            |                           |
       |-- 4. Migrar Passo N ------>|                           |
       |                            |-- 5. Gera SQL local ----->| (le do DB atual)
       |                            |-- 6. Executa no externo ->| (escreve no externo)
       |<-- 7. Resultado ----------|                           |
```

### Componentes

#### 1. Nova Edge Function: `migrate-to-external`
- Recebe credenciais do Supabase externo + acao (test-connection, migrate-step)
- Usa o driver Postgres nativo do Deno (`deno-postgres`) para conectar ao banco externo via Database URL
- Executa DDL (CREATE TABLE, funcoes, RLS) diretamente no banco externo
- Para cada passo, gera o SQL a partir do banco atual (reutilizando a logica existente do `database-backup`) e executa no externo
- Retorna status de sucesso/erro para cada operacao

#### 2. Nova pagina/aba no AdminPanel: `MigrationWizard.tsx`
Interface visual com:
- Formulario para inserir as 3 credenciais
- Botao "Testar Conexao" que valida se as credenciais funcionam
- 6 passos de migracao (mesma ordem do backup), cada um com:
  - Botao "Executar" individual
  - Status: pendente / executando / sucesso / erro
  - Detalhes do erro se houver
  - Contagem de objetos migrados (ex: "12 tabelas criadas")
- Barra de progresso geral

#### 3. Passos da Migracao (executados individualmente)
1. **Schema**: ENUMs + CREATE TABLE IF NOT EXISTS + FKs + Indexes
2. **Funcoes**: CREATE OR REPLACE FUNCTION + indexes dependentes
3. **RLS**: ALTER TABLE ENABLE RLS + DROP/CREATE POLICY
4. **Storage**: Criar buckets (via Supabase client com service role)
5. **Dados**: INSERT dos dados filtrados (com ON CONFLICT DO NOTHING)
6. **Auth Users**: Exibir lista de usuarios para criacao manual (nao automatizavel via SQL)

### Seguranca
- Credenciais do Supabase externo sao passadas apenas na requisicao, NAO armazenadas no banco
- Apenas super_admin pode acessar a funcionalidade
- A edge function valida o token do usuario antes de executar
- Connection string e usada apenas durante a sessao de migracao

### Arquivos a Criar/Modificar

**Novos:**
- `supabase/functions/migrate-to-external/index.ts` - Edge function de migracao
- `src/components/dashboard/MigrationWizard.tsx` - Componente do wizard de migracao

**Modificar:**
- `src/pages/dashboard/AdminPanel.tsx` - Adicionar nova aba "Migracao"
- `supabase/config.toml` - Registrar nova edge function com `verify_jwt = false`

### Detalhes Tecnicos

**Edge Function - `migrate-to-external/index.ts`:**
- Usa `https://deno.land/x/postgres/mod.ts` para conexao direta ao banco externo
- Reutiliza as queries do `database-backup` para extrair schema, funcoes, RLS, etc. do banco atual
- Aplica as mesmas transformacoes de idempotencia (IF NOT EXISTS, DROP IF EXISTS)
- Actions suportadas:
  - `test-connection`: testa a conexao com o banco externo
  - `migrate-schema`: cria ENUMs, tabelas, FKs, indexes simples
  - `migrate-functions`: cria funcoes + indexes dependentes
  - `migrate-rls`: habilita RLS + cria policies
  - `migrate-storage`: cria buckets via Supabase client
  - `migrate-data`: insere dados filtrados
  - `get-auth-users`: retorna lista de usuarios para referencia

**Frontend - `MigrationWizard.tsx`:**
- Estado local para credenciais (nao persistido)
- Estado de progresso por passo
- Cada passo chama a edge function com a acao correspondente
- Exibe logs em tempo real de cada operacao
- Permite re-executar passos que falharam

