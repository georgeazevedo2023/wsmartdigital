

## Tratar Erros Esperados em Tabelas com FK para Tabelas de Alto Volume

### Problema
`conversation_labels` tem FK para `conversations`, que esta na lista `HIGH_VOLUME_TABLES` (excluida da migracao de dados). O INSERT falha com violacao de FK, o que e esperado, mas o sistema conta como erro.

### Solucao
Identificar tabelas cujas dependencias FK apontam para tabelas em `HIGH_VOLUME_TABLES`. Para essas tabelas, tratar falhas de INSERT como "esperado" e nao como erro.

### Mudancas no arquivo `supabase/functions/migrate-to-external/index.ts`

**No bloco `migrate-data` (linhas ~462-470):**
Apos construir o grafo de FKs, criar um Set de tabelas que dependem de `HIGH_VOLUME_TABLES`:

```text
const tablesWithHighVolumeDeps = new Set<string>()
for (const fk of fkRows) {
  if (HIGH_VOLUME_TABLES.includes(fk.parent) && allTableNames.includes(fk.child)) {
    tablesWithHighVolumeDeps.add(fk.child)
  }
}
```

**No bloco de insercao (linhas ~536-538):**
Se a tabela esta em `tablesWithHighVolumeDeps`, nao contar falha como erro:

```text
if (r.success) { 
  tableRows += batch.length; totalSuccess++ 
} else if (tablesWithHighVolumeDeps.has(tableName)) {
  // Esperado - FK aponta para tabela de alto volume que foi excluida
  details.push(`⊘ ${tableName}: pulada (depende de tabela de alto volume)`)
} else { 
  totalFailed++; errors.push(...); tableFailed = true 
}
```

Na pratica, em vez de tentar inserir e falhar, podemos **pular a tabela inteira** se todas as suas FKs obrigatorias apontam para HIGH_VOLUME_TABLES, ja que os dados nao terao referencia valida.

### Resumo
- 1 arquivo modificado: `supabase/functions/migrate-to-external/index.ts`
- ~10 linhas adicionadas
- Resultado: migracao mostra 0 erros, tabelas dependentes de alto volume sao marcadas como "pulada"
