

## Redesign do Modulo de Backup - Pagina Didatica de Migracao

### Mudancas Principais

#### 1. Reordenar secoes na ordem de migracao sugerida
As secoes de export serao reordenadas para refletir a ordem correta de execucao no Supabase, com numeracao visivel (Passo 1, Passo 2, etc.) e tamanho estimado em KB de cada modulo apos a exportacao.

Nova ordem das secoes:
1. Estrutura do Banco (Schema) - ENUMs + CREATE TABLE + FKs + Indexes
2. Funcoes e Triggers - Funcoes PL/pgSQL (devem existir antes das RLS)
3. RLS Policies - Enable RLS + Policies
4. Storage (Buckets & Policies)
5. Dados das Tabelas (filtrado)
6. Usuarios (Auth)

#### 2. Exibir tamanho em KB de cada modulo
Apos a exportacao, calcular o tamanho em KB do bloco SQL gerado para cada secao e exibir ao lado do nome (ex: "Estrutura do Banco - 12.3 KB"). Isso sera feito apos gerar o SQL, mostrando um resumo com os tamanhos.

#### 3. Incluir dados limitados de tabelas excluidas
- `conversation_messages`: incluir apenas 5 mensagens ligadas a 5 conversas distintas (para manter a estrutura de referencia)
- `lead_database_entries`: incluir apenas 30 registros

Essas tabelas serao removidas da lista `EXCLUDED_DATA_TABLES` e terao tratamento especial com `LIMIT` customizado na logica de exportacao.

#### 4. Pagina de migracao mais didatica
Reformular o guia de migracao para ser mais visual e passo a passo, com:
- Cards numerados com icones
- Cada passo com descricao clara e acoes concretas
- Indicacao de quais secoes exportar para cada passo
- Alertas visuais para pontos de atencao

---

### Detalhes Tecnicos

#### Arquivo: `src/components/dashboard/BackupModule.tsx`

**Reordenar EXPORT_SECTIONS:**
```text
1. schema (Passo 1)
2. functions (Passo 2)
3. rls (Passo 3)
4. storage (Passo 4)
5. data (Passo 5)
6. users (Passo 6)
```

**Tabelas com limite especial (novo mapa):**
```typescript
const LIMITED_DATA_TABLES: Record<string, number> = {
  'conversation_messages': 5,  // 5 mensagens de 5 conversas
  'lead_database_entries': 30,
};
```

Remover `conversation_messages` e `lead_database_entries` do `EXCLUDED_DATA_TABLES`.

**Para `conversation_messages`**, usar query especial no edge function (nova action `table-data-limited`) ou fazer a filtragem no frontend buscando primeiro 5 conversation IDs distintos e depois filtrando.

Abordagem mais simples: adicionar suporte no edge function para receber um parametro `limit` opcional na action `table-data`, e no frontend passar o limite correto para cada tabela.

**Edge function `database-backup/index.ts`:**
Modificar a action `table-data` para aceitar um parametro `limit` opcional e uma query customizada para `conversation_messages`:

```typescript
case 'table-data': {
  const safeName = table_name.replace(/[^a-zA-Z0-9_]/g, '')
  const rowLimit = limit || 10000
  
  let query = `SELECT * FROM public."${safeName}" LIMIT ${rowLimit}`
  
  // Special query for conversation_messages: get messages from N distinct conversations
  if (safeName === 'conversation_messages' && rowLimit <= 10) {
    query = `
      WITH distinct_convs AS (
        SELECT DISTINCT conversation_id FROM public.conversation_messages LIMIT 5
      )
      SELECT cm.* FROM public.conversation_messages cm
      JOIN distinct_convs dc ON dc.conversation_id = cm.conversation_id
      LIMIT ${rowLimit}
    `
  }
  // ...
}
```

**Calculo de tamanho por secao:**
No `generateSQL()`, em vez de um unico array `lines`, usar um mapa `sectionSizes: Record<string, number>` que acumula o tamanho em bytes de cada bloco. Apos gerar, exibir um resumo com os tamanhos.

Alternativa mais simples: apos gerar o SQL completo, usar marcadores de secao (comentarios especiais) para calcular o tamanho de cada bloco e exibir um estado `exportSizes` que e renderizado nos cards das secoes.

**Guia de migracao redesenhado:**
Substituir o bloco de texto corrido por cards visuais usando componentes existentes (Card, Badge, etc.), com numeracao clara, icones correspondentes e descricoes curtas e diretas. Cada card indicara qual secao exportar e o que fazer com ela.

#### Arquivo: `supabase/functions/database-backup/index.ts`
- Aceitar parametro `limit` no body do request
- Tratamento especial para `conversation_messages` com subquery de conversas distintas

