
# Aumentar fontes do Kanban para melhor acessibilidade

## Problema
O Kanban usa fontes muito pequenas (`text-[10px]` = 10px) em varios elementos, enquanto o menu lateral usa `text-sm` (14px). Isso dificulta a leitura, especialmente para pessoas com necessidades de acessibilidade.

## Mudancas

### Arquivo: `src/components/kanban/KanbanCardItem.tsx`

| Elemento | Antes | Depois |
|---|---|---|
| Titulo do card | `text-sm` (14px) | `text-base` (16px) |
| Nome/valor dos campos extras | `text-[10px]` (10px) | `text-sm` (14px) |
| Tags | `text-[10px]` (10px) | `text-xs` (12px) |
| Nome do responsavel | `text-[10px]` (10px) | `text-sm` (14px) |
| "Sem responsavel" | `text-[10px]` (10px) | `text-sm` (14px) |
| Initials do avatar | `text-[9px]` (9px) | `text-xs` (12px) |
| Avatar | `w-5 h-5` | `w-6 h-6` |
| Tags extras counter | `text-[10px]` (10px) | `text-xs` (12px) |

### Arquivo: `src/components/kanban/KanbanColumn.tsx`

| Elemento | Antes | Depois |
|---|---|---|
| Nome da coluna | `text-sm` (14px) | `text-base` (16px) |
| Contador de cards | `text-xs` (12px) | `text-sm` (14px) |
| "Sem cards aqui" | `text-xs` (12px) | `text-sm` (14px) |
| Input novo card | `text-sm` (14px) | `text-sm` (sem mudanca) |
| Botao "Adicionar card" | `text-xs` (12px) | `text-sm` (14px) |
| Largura da coluna | `min-w-[280px] max-w-[280px]` | `min-w-[300px] max-w-[300px]` |

### Arquivo: `src/pages/dashboard/KanbanBoard.tsx`

| Elemento | Antes | Depois |
|---|---|---|
| Titulo do board (header) | `text-sm` (14px) | `text-base` (16px) |
| Descricao do board | `text-[10px]` (10px) | `text-xs` (12px) |
| Label "Filtrar:" | `text-[10px]` (10px) | `text-xs` (12px) |
| Chips de filtro | `text-[10px]` (10px) | `text-xs` (12px) |
| Badge "Visualizador" | `text-[10px]` (10px) | `text-xs` (12px) |
| Contador de cards | `text-xs` (12px) | `text-sm` (14px) |

## Resultado
Todas as fontes do Kanban ficarao compativeis com o tamanho usado no menu lateral (`text-sm` / 14px como base minima), melhorando significativamente a legibilidade e acessibilidade.
