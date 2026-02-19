
# Melhorias para o Kanban CRM

Baseado na análise completa do código (`KanbanBoard.tsx`, `KanbanCardItem.tsx`, `CardDetailSheet.tsx`, `KanbanColumn.tsx`, `BoardCard.tsx`) e na imagem enviada, identificamos oportunidades de melhoria organizadas por impacto.

---

## 1. Criação de card inline (sem dialog)

**Problema atual:** Ao clicar em "+ Adicionar card", abre um Dialog modal com apenas um campo de título. Isso quebra o fluxo e é lento.

**Melhoria:** Substituir o Dialog por um **campo de input inline** na base da coluna — igual ao Trello/Linear. O usuário digita direto na coluna, pressiona Enter e o card é criado.

**Impacto:** Reduz cliques de 3 para 1. Criação muito mais rápida.

---

## 2. Filtro por Responsável no header do board

**Problema atual:** A busca (`search`) filtra por título, tag e nome do responsável via texto livre. Não existe um filtro dedicado por responsável.

**Melhoria:** Adicionar um **seletor de responsável** no header do board (ao lado do campo de busca) para filtrar os cards de um atendente específico com um clique. Isso é especialmente útil para gerentes que gerenciam times.

**Impacto:** Visibilidade rápida da carteira de um atendente.

---

## 3. Contador de cards por responsável no header

**Problema atual:** O header mostra apenas o total de cards (ex: "1 card"). Não há informação sobre distribuição por responsável.

**Melhoria:** Exibir **avatares dos responsáveis** com contagem de cards no header, como chips clicáveis que funcionam como filtro rápido.

**Impacto:** Gestão visual de carga de trabalho da equipe.

---

## 4. Coluna vazia com drag-and-drop melhorado

**Problema atual:** Colunas vazias mostram apenas "Sem cards aqui" e têm altura mínima de 120px. Em quadros com poucas colunas e muitas colunas vazias, a área de drop pode ser difícil de acertar.

**Melhoria:** Aumentar a área mínima das colunas vazias para `min-h-[200px]` e adicionar um ícone visual de zona de drop ativa (borda tracejada animada ao arrastar sobre ela).

**Impacto:** Drag-and-drop mais confiável em colunas vazias.

---

## 5. Histórico de movimentações no card (audit log)

**Problema atual:** Não há registro de quando um card mudou de coluna, foi reatribuído ou teve campos alterados.

**Melhoria:** Adicionar uma seção "Histórico" no `CardDetailSheet` mostrando as últimas ações (ex: "Gustavo moveu para Simulação há 2h"). Requer uma nova tabela `kanban_card_history` no banco.

**Impacto:** Rastreabilidade do lead no funil.

---

## 6. Campo de notas/observações no card

**Problema atual:** O `CardDetailSheet` tem campos dinâmicos e tags, mas não tem um campo livre de texto/notas para registrar observações sobre o lead.

**Melhoria:** Adicionar um campo `Textarea` de "Notas internas" persistido na tabela `kanban_cards` (coluna `notes TEXT`). Simples de implementar, alto valor prático.

**Impacto:** Substitui o uso de tags para comunicação interna entre atendentes.

---

## 7. Indicador visual de "cards sem responsável"

**Problema atual:** Cards sem responsável não têm nenhuma indicação visual de alerta.

**Melhoria:** Exibir um ícone de usuário com `?` ou cor diferente no rodapé do card quando não há responsável atribuído. Opcional: filtro para mostrar apenas cards sem responsável.

**Impacto:** Evita leads "esquecidos" sem atendente.

---

## Plano de Implementação (prioridade alta)

As três melhorias de maior impacto com menor esforço de implementação são:

### Prioridade 1 - Criação inline de card
- Remover o Dialog de `addCardOpen` do `KanbanBoard.tsx`
- Adicionar estado `inlineAddColumn: string | null` 
- Modificar `KanbanColumn.tsx` para receber `isAddingInline` e renderizar um `<Input>` + botões Confirm/Cancel no lugar do botão "+ Adicionar card"
- Ao confirmar (Enter ou clique), chama `handleAddCard` com o título inline

### Prioridade 2 - Filtro por responsável
- Adicionar estado `filterAssignee: string | null` em `KanbanBoard.tsx`
- Adicionar um `<Select>` de membros da equipe no header, ao lado do campo de busca
- Aplicar o filtro em `filteredCards` com `.filter(c => !filterAssignee || c.assigned_to === filterAssignee)`

### Prioridade 3 - Notas internas no card
- Migração SQL: `ALTER TABLE kanban_cards ADD COLUMN notes TEXT;`
- Adicionar `notes` no `CardData` e `CardDetailSheet`
- Adicionar `<Textarea>` de "Notas" na sheet de detalhes
- Salvar junto com o card no `handleSave`

---

## Arquivos que serão modificados

| Arquivo | Mudanças |
|---|---|
| `src/pages/dashboard/KanbanBoard.tsx` | Remover Dialog, adicionar filtro por responsável, passar props de inline add |
| `src/components/kanban/KanbanColumn.tsx` | Input inline de criação de card |
| `src/components/kanban/CardDetailSheet.tsx` | Campo de notas + coluna `notes` |
| `src/components/kanban/KanbanCardItem.tsx` | Indicador visual de sem responsável |
| Nova migração SQL | `kanban_cards` + coluna `notes TEXT` |

Qual dessas melhorias você quer implementar primeiro? Podemos fazer todas de uma vez ou priorizar as que fazem mais diferença para o seu uso atual.
