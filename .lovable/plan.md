

# Kanban: Texto maior + Fundo branco com cards coloridos

## Objetivo
Melhorar a legibilidade do Kanban com textos maiores e criar uma versao com fundo branco e cards coloridos (baseados na cor da coluna).

---

## Mudancas

### 1. `src/components/kanban/KanbanCardItem.tsx` - Textos maiores e card colorido

**Textos maiores:**
- Titulo do card: `text-sm` -> `text-base font-semibold` (16px)
- Campos customizados: `text-[10px]` -> `text-sm` (14px)
- Tags: `text-[10px]` -> `text-xs` (12px)
- Nome do responsavel: `text-[10px]` -> `text-sm` (14px)
- "Sem responsavel": `text-[10px]` -> `text-sm`
- Padding do card: `p-3` -> `p-4`

**Card colorido:**
- Receber prop `columnColor: string` no componente
- Aplicar borda esquerda colorida: `border-l-4` com `borderLeftColor: columnColor`
- Fundo do card: `bg-card` -> `bg-white dark:bg-card` (branco no light, mantém dark)

### 2. `src/components/kanban/KanbanColumn.tsx` - Fundo branco e textos maiores

- Fundo da coluna: `bg-muted/30` -> `bg-white dark:bg-muted/30`
- Header: nome da coluna `text-sm` -> `text-base font-bold`
- Contador: `text-xs` -> `text-sm`
- "Sem cards aqui": `text-xs` -> `text-sm`
- Botao "Adicionar card": `text-xs` -> `text-sm`
- Passar `columnColor` para cada `KanbanCardItem`

### 3. `src/pages/dashboard/KanbanBoard.tsx` - Header e fundo

- Fundo do board: adicionar `bg-slate-50 dark:bg-background` no container principal
- Header titulo: `text-sm` -> `text-lg`
- Descricao: `text-[10px]` -> `text-xs`
- Filtro chips: `text-[10px]` -> `text-xs`
- Label "Filtrar": `text-[10px]` -> `text-xs`
- Card count: `text-xs` -> `text-sm`

---

## Resultado visual esperado

- Fundo geral cinza claro (`bg-slate-50`) no modo claro
- Colunas com fundo branco
- Cards com fundo branco + borda esquerda colorida (cor da coluna/etapa)
- Todos os textos visivelmente maiores e mais legíveis
- No modo dark, mantém o visual atual (sem quebrar o tema existente)

---

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/components/kanban/KanbanCardItem.tsx` | Textos maiores, prop `columnColor`, borda colorida, fundo branco |
| `src/components/kanban/KanbanColumn.tsx` | Textos maiores, fundo branco, passar `columnColor` |
| `src/pages/dashboard/KanbanBoard.tsx` | Textos maiores no header, fundo `bg-slate-50` |

