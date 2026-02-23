

## Corrigir Erros na Migracao de Dados

### Problema 1: Arrays serializados como JSONB
Na linha 474 do edge function, o check `Array.isArray(v)` vem DEPOIS de `typeof v === 'object'`. Como arrays sao objetos em JavaScript, eles caem no branch de JSONB antes de chegar ao branch de Array. Resultado: colunas do tipo `text[]` recebem JSON ao inves de `ARRAY[...]`.

**Correcao:** Mover o `Array.isArray(v)` para ANTES do `typeof v === 'object'`.

### Problema 2: Ordem de insercao viola Foreign Keys
As tabelas sao inseridas em ordem alfabetica. Isso causa erros de FK:
- `conversation_labels` precisa de `conversations` (que e alto volume e excluida)
- `inbox_users` precisa de `inboxes`
- `kanban_card_data` precisa de `kanban_cards`
- `kanban_board_members` precisa de `kanban_boards`

**Correcao:** Ordenar as tabelas topologicamente usando as foreign keys do banco, garantindo que tabelas referenciadas sejam inseridas primeiro. Tabelas cujas dependencias estao em HIGH_VOLUME_TABLES (e portanto sem dados) terao seus inserts executados com erros esperados - usar `ON CONFLICT DO NOTHING` e nao contar como falha fatal.

### Mudancas no arquivo `supabase/functions/migrate-to-external/index.ts`

**1. Fix Array check (linhas 468-476):**
```text
Antes:
  if (typeof v === 'object') return jsonb...
  if (Array.isArray(v)) return ARRAY[...]

Depois:
  if (Array.isArray(v)) return ARRAY[...]
  if (typeof v === 'object') return jsonb...
```

**2. Ordenar tabelas por dependencia FK (bloco migrate-data):**
- Buscar FKs do banco local com query em `information_schema.table_constraints` + `key_column_usage` + `constraint_column_usage`
- Construir grafo de dependencias e ordenar topologicamente
- Inserir dados na ordem correta

### Arquivo modificado
- `supabase/functions/migrate-to-external/index.ts`
