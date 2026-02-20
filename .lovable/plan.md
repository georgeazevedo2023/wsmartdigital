

# Entidades Dinamicas no Kanban CRM

## Resumo

Criar um sistema de entidades reutilizaveis por quadro, onde o Super Admin define "tabelas de lookup" (ex: Planos, Bancos, Pizzas) com valores predefinidos. Campos do tipo `entity_select` referenciam essas entidades, e os cards salvam o **ID** do valor selecionado (nunca texto puro), habilitando relatorios futuros como "plano mais vendido" ou "pizza mais pedida".

---

## Banco de Dados

### Novas Tabelas

**`kanban_entities`** - Entidades por quadro

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| board_id | uuid FK kanban_boards | Quadro proprietario |
| name | text NOT NULL | Nome da entidade (ex: "Planos") |
| position | integer | Ordem de exibicao |
| created_at | timestamptz | |

**`kanban_entity_values`** - Valores de cada entidade

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| entity_id | uuid FK kanban_entities | Entidade pai |
| label | text NOT NULL | Texto exibido (ex: "Ouro") |
| position | integer | Ordem |
| created_at | timestamptz | |

### Alteracao no Enum

Adicionar `'entity_select'` ao enum `kanban_field_type`.

### Alteracao na tabela `kanban_fields`

Adicionar coluna `entity_id uuid` (nullable, FK para `kanban_entities`) --- usada quando `field_type = 'entity_select'` para indicar qual entidade esse campo referencia.

### Armazenamento dos dados

Quando `field_type = 'entity_select'`, o valor salvo em `kanban_card_data.value` sera o **UUID** do `kanban_entity_values` selecionado, nunca o texto.

### RLS

- `kanban_entities`: Super admin gerencia tudo; usuarios com acesso ao board podem ler (SELECT via `can_access_kanban_board`)
- `kanban_entity_values`: Super admin gerencia tudo; usuarios com acesso ao board da entidade podem ler

---

## Frontend

### 1. EditBoardDialog --- Nova aba "Entidades"

Adicionar uma 5a aba no TabsList: **Entidades**.

Conteudo:
- Lista de entidades do quadro com botao "Adicionar Entidade"
- Cada entidade mostra nome + lista de valores editaveis inline
- Botao para adicionar/remover valores
- Segue o mesmo padrao visual das abas Colunas e Campos

### 2. EditBoardDialog --- Aba Campos atualizada

- Adicionar `{ value: 'entity_select', label: 'Entidade' }` ao array `FIELD_TYPES`
- Quando `field_type === 'entity_select'`, mostrar um Select para escolher qual entidade do quadro esse campo referencia
- Salvar o `entity_id` no campo

### 3. DynamicFormField --- Novo tipo `entity_select`

- Quando `field.field_type === 'entity_select'`, buscar os valores da entidade via `entity_id`
- Renderizar um Select com os valores da entidade
- O `onChange` salva o UUID do valor selecionado

### 4. KanbanBoard + KanbanCardItem --- Resolver IDs para labels

- Ao carregar o board, buscar tambem `kanban_entities` e `kanban_entity_values` do board
- Ao montar `fieldValues` dos cards, para campos `entity_select`, traduzir o UUID salvo para o label correspondente
- Na capa do card, exibir o label (texto) e nao o UUID

### 5. CardDetailSheet --- Exibir com resolucao

- Passar as entidades carregadas para o DynamicFormField
- O campo exibe o Select com os valores disponiveis, e o valor salvo (UUID) e pre-selecionado

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| Nova migracao SQL | Criar tabelas `kanban_entities` e `kanban_entity_values`, alterar enum, adicionar `entity_id` em `kanban_fields`, RLS |
| `src/components/kanban/EditBoardDialog.tsx` | Nova aba Entidades; atualizar FIELD_TYPES; salvar/carregar entidades; vincular entity_id aos campos |
| `src/components/kanban/DynamicFormField.tsx` | Novo tipo `entity_select` com Select populado pela entidade; interface atualizada com `entity_id` |
| `src/pages/dashboard/KanbanBoard.tsx` | Carregar entidades e valores; resolver UUIDs para labels nos fieldValues dos cards |
| `src/components/kanban/CardDetailSheet.tsx` | Passar entidades para DynamicFormField |

---

## Fluxo de Uso

1. Super Admin abre EditBoardDialog > aba **Entidades**
2. Cria entidade "Planos" com valores "Ouro", "Prata", "Bronze"
3. Vai na aba **Campos**, cria campo "Tipo de Plano" com tipo **Entidade**, seleciona "Planos"
4. Agente abre card, ve campo "Tipo de Plano" com dropdown mostrando Ouro/Prata/Bronze
5. Seleciona "Ouro" --- sistema salva o UUID do valor "Ouro" em `kanban_card_data`
6. Na capa do card, aparece "Tipo de Plano: Ouro" (resolvido do UUID para label)

