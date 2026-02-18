
# Módulo Kanban CRM — Plano de Implementação por Etapas

Este documento detalha a arquitetura e as etapas de implementação do módulo Kanban CRM para o WsmartQR. O módulo é dividido em 4 etapas sequenciais, cada uma entregando valor imediato e servindo de base para a próxima.

---

## Visão Geral da Arquitetura

```text
┌─────────────────────────────────────────────────────────────┐
│                     KANBAN CRM MODULE                       │
├─────────────────┬───────────────────┬───────────────────────┤
│   ETAPA 1       │   ETAPA 2         │   ETAPA 3             │
│   Fundação DB   │   Quadros + UI    │   Cards + Kanban      │
│   + Quadros     │   Operacional     │   Drag & Drop         │
├─────────────────┴───────────────────┴───────────────────────┤
│   ETAPA 4: Automações WhatsApp por Coluna                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Etapa 1 — Fundação: Banco de Dados e Navegação

### Objetivo
Criar todas as tabelas necessárias para o módulo completo, as políticas de RLS e adicionar o item "CRM" na sidebar.

### Tabelas a criar

**`kanban_boards`** — Quadros (Pipelines)
```sql
id, name, description, created_by (uuid),
visibility (enum: 'shared' | 'private'),
inbox_id (uuid, nullable → FK inboxes),
instance_id (text, nullable → FK instances),
created_at, updated_at
```

**`kanban_columns`** — Colunas/Etapas do Funil
```sql
id, board_id (FK), name, color (#hex),
position (integer), -- ordenação
automation_message (text, nullable), -- Etapa 4
created_at
```

**`kanban_fields`** — Campos Personalizados do Formulário
```sql
id, board_id (FK), name, field_type
(enum: 'text' | 'currency' | 'date' | 'select'),
options (jsonb, nullable), -- para campo Select
position (integer), is_primary (boolean), -- campo destaque no card
required (boolean), created_at
```

**`kanban_cards`** — Os Cards/Leads
```sql
id, board_id (FK), column_id (FK kanban_columns),
title (nome do cliente/lead),
assigned_to (uuid, nullable → user_profiles),
created_by (uuid), position (integer),
tags (text[]), created_at, updated_at
```

**`kanban_card_data`** — Valores dos Campos Personalizados
```sql
id, card_id (FK), field_id (FK kanban_fields),
value (text), created_at
```

### Políticas de RLS
- **Super Admin**: acesso total a todas as tabelas
- **Usuários (boards)**: podem ver boards que criaram ou onde têm cards atribuídos
- **Visibilidade `shared`**: todos os membros da inbox vinculada veem todos os cards
- **Visibilidade `private`**: usuário só vê cards onde `created_by = auth.uid()` OR `assigned_to = auth.uid()`
- **Columns/Fields**: herdado do board — quem acessa o board acessa suas colunas e campos
- **Cards**: filtro por visibilidade do board aplicado via função `SECURITY DEFINER`

### Mudanças de Frontend
- Adicionar item "CRM" com ícone `Kanban` na Sidebar (visível para todos os usuários autenticados)
- Criar rota `/dashboard/crm` no `App.tsx`
- Criar página placeholder `src/pages/dashboard/KanbanCRM.tsx`

### Arquivos afetados
- 1 migração SQL (nova)
- `src/components/dashboard/Sidebar.tsx`
- `src/App.tsx`
- `src/pages/dashboard/KanbanCRM.tsx` (novo)

---

## Etapa 2 — Gestão de Quadros: CRUD Completo + Construtor

### Objetivo
Tela onde admins gerenciam seus quadros: criar, editar, duplicar, excluir. Inclui o editor de colunas e editor de campos personalizados.

### Tela: Lista de Quadros (`/dashboard/crm`)

**Layout**: grade de cards, cada card mostra:
- Nome, descrição, badge de visibilidade (Compartilhado / Privado)
- Instância/Inbox vinculada (se houver)
- Número de colunas, número de cards
- Botões: Abrir, Editar, Duplicar, Excluir

**Botão "Criar Novo Quadro"**: abre Dialog com:
- Nome (obrigatório), Descrição
- Seletor de Inbox (lista as inboxes disponíveis)
- Seletor de Visibilidade: `Compartilhado` / `Individual/Privado`

**Botão "Duplicar"**: cria novo board com:
- Cópia das `kanban_columns` (posição, nome, cor)
- Cópia dos `kanban_fields` (tipo, nome, opções)
- Sufixo " (Cópia)" no nome
- Sem copiar `kanban_cards`

### Dialog: Editor do Quadro (Aba "Processo")

Divide-se em duas abas internas:

**Aba "Colunas"**:
- Lista ordenável de colunas com nome e cor
- Botão "+ Adicionar Coluna"
- Cada coluna: input de nome, color picker (paleta simples de 8 cores), botão excluir
- Ordenação via botões ▲▼ (sem drag-and-drop nesta etapa)

**Aba "Campos do Formulário"**:
- Lista de campos com nome e tipo
- Botão "+ Adicionar Campo"
- Cada campo: input de nome, select de tipo, toggle "Campo Principal" (exibe no card), toggle "Obrigatório"
- Para tipo "Seleção": área para adicionar opções separadas por vírgula

### Arquivos a criar/editar
- `src/pages/dashboard/KanbanCRM.tsx` (implementação completa da lista)
- `src/components/kanban/BoardCard.tsx` (card de quadro na lista)
- `src/components/kanban/CreateBoardDialog.tsx`
- `src/components/kanban/EditBoardDialog.tsx` (inclui editor de colunas e campos)

---

## Etapa 3 — Interface Operacional: O Kanban do Dia a Dia

### Objetivo
A tela principal onde os usuários trabalham: visualização kanban com colunas, cards e painel de detalhes.

### Rota: `/dashboard/crm/:boardId`

**Layout de 3 zonas**:
```text
┌──────────┬────────────────────────────────────────┬──────────────┐
│  Header  │  Barra de Filtros (Busca, Responsável)  │              │
├──────────┴────────────────────────────────────────┴──────────────┤
│  [Coluna 1]    [Coluna 2]    [Coluna 3]    [+ Nova Coluna]       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│  │ Card     │  │ Card     │  │          │                        │
│  │ Nome     │  │ Nome     │  │          │                        │
│  │ @resp    │  │ @resp    │  │          │                        │
│  │ 🏷️ tag   │  │ Placa XX │  │          │                        │
│  └──────────┘  └──────────┘  └──────────┘                        │
└────────────────────────────────────────────────────────────────┘
```

**Card Visual** (capa do card):
- Nome do cliente/lead (título)
- Avatar + nome do responsável (se atribuído)
- Tags como badges coloridos
- Valor do campo marcado como "Principal" (ex: placa, valor)
- Botão `+` ao fundo de cada coluna para criar novo card

**Painel de Detalhes do Card** (Sheet lateral ao clicar):
- Header: título editável, seletor de responsável, seletor de coluna
- Seção de Tags: input para adicionar/remover tags
- Formulário dinâmico: renderiza cada `kanban_field` do board com o input apropriado:
  - `text` → Input
  - `currency` → Input com máscara R$
  - `date` → DatePicker
  - `select` → Select com opções configuradas
- Botão "Salvar" persiste dados em `kanban_card_data`
- Botão "Excluir card"

**Filtro de Privacidade** (aplicado automaticamente no frontend):
- Se `board.visibility === 'private'` e usuário NÃO é super admin: query filtra `created_by = user.id OR assigned_to = user.id`
- Se `board.visibility === 'shared'`: carrega todos os cards das colunas

**Movimentação de Cards**:
- Drag & Drop entre colunas usando `@dnd-kit/core` (biblioteca a instalar)
- Ao mover, atualiza `kanban_cards.column_id` e dispara verificação de automação (Etapa 4)

### Arquivos a criar
- `src/pages/dashboard/KanbanBoard.tsx` (tela operacional)
- `src/components/kanban/KanbanColumn.tsx`
- `src/components/kanban/KanbanCardItem.tsx` (card visual)
- `src/components/kanban/CardDetailSheet.tsx` (painel lateral)
- `src/components/kanban/DynamicFormField.tsx` (renderizador de campo)

### Rota adicional em `App.tsx`
```typescript
<Route path="crm/:boardId" element={<Suspense ...><KanbanBoard /></Suspense>} />
```

---

## Etapa 4 — Automações: Mensagens por Coluna via WhatsApp

### Objetivo
Para boards vinculados a uma inbox/instância, permitir configurar mensagens automáticas que são enviadas quando um card é movido para uma coluna específica.

### Configuração (dentro do Editor de Colunas - Etapa 2)
- Campo "Mensagem Automática" (textarea) em cada coluna
- Suporte a variáveis: `{{nome}}`, `{{responsavel}}`, `{{data}}`
- Toggle para ativar/desativar por coluna

### Lógica de Disparo
Ao mover um card para uma coluna que tenha `automation_message` preenchida:

1. Frontend detecta o move no handler do DnD
2. Verifica se o board tem `inbox_id` e se a coluna tem `automation_message`
3. Se sim, verifica se o card tem um número de telefone associado (campo do tipo `text` marcado como "telefone" ou o nome do contato do HelpDesk)
4. Exibe modal de confirmação: "Enviar mensagem automática para [contato]?"
5. Ao confirmar, chama a edge function `uazapi-proxy` com a mensagem formatada

### Variáveis de Template
```text
{{nome}}        → kanban_cards.title
{{responsavel}} → nome do assigned_to
{{data}}        → data atual formatada
{{campo:NOME}}  → valor de campo personalizado por nome
```

### Arquivos afetados
- `src/components/kanban/CardDetailSheet.tsx` (lógica de automação)
- `src/pages/dashboard/KanbanBoard.tsx` (modal de confirmação de disparo)
- `src/components/kanban/AutomationConfirmDialog.tsx` (novo)
- Editor de colunas em `EditBoardDialog.tsx` (campo de mensagem)

---

## Resumo das Etapas

| Etapa | O que entrega | Dependências |
|-------|--------------|-------------|
| 1 | Banco de dados + Sidebar + Rota | Nenhuma |
| 2 | CRUD de Quadros + Editor de Colunas/Campos + Duplicar | Etapa 1 |
| 3 | Interface Kanban Operacional + Drag & Drop + Filtro de Privacidade | Etapa 2 |
| 4 | Automações de Mensagem por Coluna | Etapas 2 e 3 |

---

## Detalhes Técnicos

### Nova dependência
- `@dnd-kit/core` e `@dnd-kit/sortable` — biblioteca de drag & drop acessível e compatível com React 18

### Segurança
- Privacidade dos cards reforçada no RLS do banco (não apenas no frontend)
- Função `SECURITY DEFINER` para verificar visibilidade do board sem recursão
- Super Admin acessa tudo; agentes regulares ficam restritos pelas políticas

### Compatibilidade
- O módulo é independente dos módulos existentes (HelpDesk, Broadcast)
- A vinculação com Inbox é opcional — o CRM funciona standalone
- Reutiliza componentes existentes: `Avatar`, `Badge`, `Sheet`, `Dialog`, `Select`, `DatePicker`

---

Posso iniciar pela **Etapa 1** agora. Assim que aprovada e testada, seguimos para a Etapa 2, e assim por diante. Deseja começar?
