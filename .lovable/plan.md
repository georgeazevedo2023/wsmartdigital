

## Corrigir Ordem de Criacao de Funcoes - Ordenacao Topologica por Dependencia

### Problema
As funcoes estao sendo criadas em ordem alfabetica. `can_access_kanban_board` depende de `is_super_admin`, mas e criada antes dela. Resultado: erro `function is_super_admin(uuid) does not exist`.

Cadeia de dependencias:
```text
is_super_admin        (sem dependencias)
is_gerente            (sem dependencias)
has_role              (sem dependencias)
has_inbox_access      (sem dependencias)
is_inbox_member       (sem dependencias)
get_inbox_role        (sem dependencias)
can_access_kanban_board  -> depende de is_super_admin, is_inbox_member
can_access_kanban_card   -> depende de is_super_admin, can_access_kanban_board
```

### Solucao
Ordenar topologicamente as funcoes antes de executa-las: funcoes sem dependencias primeiro, depois as que dependem delas.

### Mudanca no arquivo `supabase/functions/migrate-to-external/index.ts`

No bloco `migrate-functions` (linhas ~225-258), apos buscar as funcoes, adicionar logica de ordenacao:

1. Para cada funcao, verificar quais outras funcoes publicas ela referencia no seu corpo (`definition`)
2. Construir um grafo de dependencias
3. Ordenar topologicamente (funcoes base primeiro, dependentes depois)
4. Executar nessa ordem

```text
Antes:  [can_access_kanban_board, can_access_kanban_card, exec_sql, get_inbox_role, ...]
Depois: [is_super_admin, is_gerente, has_role, get_inbox_role, ..., can_access_kanban_board, can_access_kanban_card]
```

### Implementacao tecnica

Adicionar uma funcao auxiliar `topoSortFunctions` que:
- Recebe o array de funcoes com `function_name` e `definition`
- Para cada funcao, procura referencias a outras funcoes publicas no corpo
- Faz uma ordenacao topologica (Kahn's algorithm)
- Retorna o array ordenado

### Resumo
- 1 arquivo modificado: `supabase/functions/migrate-to-external/index.ts`
- Adicionar ~30 linhas de logica de ordenacao topologica
- Nenhuma mudanca no frontend
