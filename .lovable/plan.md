

## Corrigir SQL Export - Adicionar IF NOT EXISTS e DROP IF EXISTS

### Problema
O SQL gerado pelo backup usa `CREATE INDEX`, `ALTER TABLE ADD CONSTRAINT`, `CREATE POLICY` e `CREATE TRIGGER` sem protecao contra duplicatas. Quando o banco de destino ja tem esses objetos, a importacao falha com erro `relation "xxx" already exists`.

### Solucao
Modificar o `BackupModule.tsx` para gerar SQL idempotente (seguro para rodar multiplas vezes) em todas as secoes:

### Mudancas no arquivo `src/components/dashboard/BackupModule.tsx`

**1. Indexes (linha ~276):**
Substituir a saida direta do `indexdef` por uma versao com `IF NOT EXISTS`:
```sql
-- Antes:
CREATE UNIQUE INDEX broadcast_logs_pkey ON public.broadcast_logs USING btree (id);

-- Depois:
CREATE UNIQUE INDEX IF NOT EXISTS broadcast_logs_pkey ON public.broadcast_logs USING btree (id);
```
Logica: fazer replace no `indexdef` retornado pelo Postgres, inserindo `IF NOT EXISTS` apos `CREATE INDEX` ou `CREATE UNIQUE INDEX`.

**2. Foreign Keys (linha ~268):**
Adicionar `DROP CONSTRAINT IF EXISTS` antes de cada `ADD CONSTRAINT`:
```sql
ALTER TABLE public.broadcast_logs DROP CONSTRAINT IF EXISTS broadcast_logs_user_fk;
ALTER TABLE public.broadcast_logs ADD CONSTRAINT broadcast_logs_user_fk FOREIGN KEY ...;
```

**3. Policies (linhas ~322 e ~354):**
Adicionar `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`:
```sql
DROP POLICY IF EXISTS "policy_name" ON public.table_name;
CREATE POLICY "policy_name" ON public.table_name ...;
```

**4. Triggers (linha ~422):**
Adicionar `DROP TRIGGER IF EXISTS` antes de cada `CREATE TRIGGER`:
```sql
DROP TRIGGER IF EXISTS trigger_name ON public.table_name;
CREATE TRIGGER trigger_name ...;
```

**5. ENUMs (ja existente):**
Verificar que os ENUMs ja usam o bloco `DO $$ ... IF NOT EXISTS` (confirmado no codigo atual).

### Resumo das alteracoes
- Apenas 1 arquivo modificado: `src/components/dashboard/BackupModule.tsx`
- ~5 pontos de insercao de logica `IF NOT EXISTS` / `DROP IF EXISTS`
- Nenhuma mudanca na edge function
- O SQL gerado sera idempotente e podera ser executado multiplas vezes sem erro

