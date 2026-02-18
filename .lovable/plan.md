
# Gerenciamento de Acesso ao Quadro Kanban — Solução Completa

## Diagnóstico do Problema

O usuário aponta dois problemas interligados:

**Problema 1 — Não existe onde configurar quem acessa um quadro sem WhatsApp/Inbox**
Hoje, o único mecanismo de acesso ao CRM é via `inbox_id`: o Super Admin vincula o quadro a uma Caixa de Entrada, e todos os membros dessa caixa passam a ver o quadro. Mas:
- Nem todo cliente tem integração com WhatsApp
- Quadros sem `inbox_id` ficam inacessíveis para todos (exceto o Super Admin)
- Não existe forma de o Super Admin dizer "esse usuário pode acessar esse quadro"

**Problema 2 — Privacidade de cards entre atendentes (ex: imobiliária)**
A visibilidade `shared` / `private` já existe no banco, mas precisa ser bem comunicada e fácil de configurar. O requisito é: em modo "Individual", um corretor não vê os clientes de outro — esse controle precisa ser explícito e opcional.

## Solução: Membros Diretos no Quadro

Criar um sistema de **membros diretos** por quadro, independente de inbox. O Super Admin pode adicionar qualquer usuário (gerente ou atendente) a qualquer quadro, definindo um papel: **Editor** ou **Visualizador**.

```text
COMO UM QUADRO CONCEDE ACESSO:

    Quadro Kanban
         │
         ├── Via Inbox (existente) ────────► todos os membros da inbox
         │
         └── Via Membros Diretos (NOVO) ───► usuários individuais
              com papel: Editor | Visualizador

Qualquer das duas rotas concede acesso. Sem nenhuma das duas,
apenas o Super Admin vê o quadro.
```

## O que Será Implementado

### ETAPA 1 — Banco de Dados: Tabela `kanban_board_members`

Nova tabela para associar usuários a quadros diretamente:

```sql
CREATE TABLE public.kanban_board_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id  uuid NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL,
  role      text NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, user_id)
);
ALTER TABLE public.kanban_board_members ENABLE ROW LEVEL SECURITY;

-- Super admin gerencia todos os membros
CREATE POLICY "Super admins gerenciam membros do board"
  ON public.kanban_board_members FOR ALL
  USING (is_super_admin(auth.uid()));

-- Usuários veem seus próprios acessos
CREATE POLICY "Usuários veem seus acessos"
  ON public.kanban_board_members FOR SELECT
  USING (auth.uid() = user_id);
```

Atualizar `can_access_kanban_board` para incluir membros diretos:

```sql
CREATE OR REPLACE FUNCTION public.can_access_kanban_board(_user_id uuid, _board_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kanban_boards b
    WHERE b.id = _board_id AND (
      is_super_admin(_user_id)
      OR b.created_by = _user_id
      OR (b.inbox_id IS NOT NULL AND has_inbox_access(_user_id, b.inbox_id))
      OR EXISTS (
        SELECT 1 FROM public.kanban_board_members m
        WHERE m.board_id = _board_id AND m.user_id = _user_id
      )
    )
  )
$$;
```

### ETAPA 2 — Nova aba "Acesso" no `EditBoardDialog`

O Super Admin, ao editar um quadro, verá uma 4ª aba chamada **"Acesso"** com:

**Seção 1 — Acesso via WhatsApp (se inbox vinculada)**
Exibe a inbox conectada e a quantidade de membros. Botão para desvincular.

**Seção 2 — Membros Diretos**
Lista os usuários com acesso individual. Para cada membro mostra:
- Avatar + nome + email
- Badge do papel (Editor ou Visualizador)
- Botão de remover

**Seção 3 — Adicionar Membro**
Um campo de busca que filtra os usuários do sistema (via `user_profiles` + `user_roles`) e permite adicionar com papel selecionado.

```text
┌─────────────────────────────────────────────────────────────┐
│  Geral  │  Colunas  │  Campos  │  [Acesso]                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Visibilidade dos Leads                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  [🔒 Individual] Cada atendente vê só seus leads   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Acesso via WhatsApp / Caixa de Entrada                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Sem caixa vinculada — Sem integração WhatsApp     │    │
│  └────────────────────────────────────────────────────┘    │
│  (ou, se tiver inbox:)                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  📨  Suporte - Time A     5 membros      [Desvincular]  │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Membros com Acesso Direto              [+ Adicionar]      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  [AV] Ana Vendas    ✏️ Editor      [Remover]        │    │
│  │  [JC] João Corretor 👁️ Visualizador [Remover]       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  [Buscar por nome ou email...]  [Editor ▼]  [Adicionar]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ETAPA 3 — Indicador de Membros no `BoardCard`

O card do quadro na lista (`KanbanCRM.tsx`) ganhará um badge mostrando quantos membros têm acesso:

```text
┌─────────────────────────────────────────────────┐
│  Pipeline Corretores                    [...]   │
│  Quadro para gestão de leads imobiliários        │
│                                                 │
│  📋 4 colunas   🃏 12 cards                      │
│  [🔒 Individual]  [👥 3 membros]                │
│                                                 │
│  [          Abrir Quadro →          ]           │
└─────────────────────────────────────────────────┘
```

### ETAPA 4 — Controle de papel no `KanbanBoard`

Ao abrir um quadro, o sistema verifica se o usuário é:
- `super_admin`: acesso total (já funciona)
- Membro direto com papel `editor`: pode criar/mover cards
- Membro direto com papel `viewer`: só lê, não pode criar ou mover cards
- Membro via inbox: acesso de editor (comportamento atual)

Implementação: uma query ao abrir o board verifica `kanban_board_members` e retorna o `role` do usuário atual, ajustando `canAddCard` e `isDraggable` nas colunas.

### ETAPA 5 — Lógica de Privacidade mais Clara

O campo `visibility` (`shared` / `private`) já existe e já funciona no RLS. O que falta é comunicar isso melhor.

**Shared (Compartilhado)**: todos os membros do quadro veem todos os cards
**Private (Individual)**: cada membro só vê os cards onde é `created_by` ou `assigned_to`

Isso será reforçado visualmente:
- No `BoardCard`: badge colorido indicando o modo
- Na aba "Acesso": explicação contextual clara do que cada modo significa
- No `CreateBoardDialog`: descrições melhoradas com exemplos (ex: "Ideal para times de vendas onde cada corretor vê apenas seus clientes")

## Fluxo Completo do Super Admin

```text
1. /dashboard/crm → clicar "Novo Quadro"
2. Dialog Criar: nome, descrição, visibilidade (Compartilhado/Individual)
   → Inbox WhatsApp: OPCIONAL (se não tiver integração, deixar em "Sem conexão")
3. Quadro criado → aparece na grade
4. Clicar "..." → "Editar" → aba "Acesso"
5. Seção "Membros com Acesso Direto" → clicar "+ Adicionar"
6. Buscar por "Ana" → selecionar "Ana Vendas" → papel: Editor → "Adicionar"
7. Ana faz login → vê o quadro no CRM → pode criar e mover cards
8. Se visibilidade = Individual: Ana não vê cards de João e vice-versa
```

## Arquivos a Criar/Modificar

| Arquivo | Mudança |
|---|---|
| Nova migração SQL | Criar `kanban_board_members`, atualizar `can_access_kanban_board`, RLS |
| `src/components/kanban/EditBoardDialog.tsx` | Adicionar 4ª aba "Acesso" com gerenciamento de membros |
| `src/components/kanban/CreateBoardDialog.tsx` | Melhorar descrições de visibilidade com contexto real |
| `src/components/kanban/BoardCard.tsx` | Adicionar badge de membros diretos, buscar contagem |
| `src/pages/dashboard/KanbanCRM.tsx` | Enriquecer dados com contagem de membros diretos |
| `src/pages/dashboard/KanbanBoard.tsx` | Verificar papel do usuário (`viewer`/`editor`) ao carregar board |

**Total: 1 migração + 5 arquivos modificados**

## Considerações de Segurança

- O RLS via `can_access_kanban_board` é a barreira principal — não importa o que o frontend mostre, o banco só retorna dados para quem tem acesso
- A tabela `kanban_board_members` tem RLS própria: somente Super Admin gerencia, usuário vê apenas seus próprios acessos
- A função `can_access_kanban_board` é `SECURITY DEFINER` — roda com privilégios elevados para evitar recursão no RLS
- O papel `viewer` é verificado **no frontend** (UX) mas também deve ser aplicado via política de INSERT nos cards: membros com papel `viewer` não podem inserir em `kanban_cards`

## Resultado Esperado

- Super Admin cria quadros sem precisar de WhatsApp — pode adicionar usuários diretamente pela aba "Acesso"
- Gerentes e Atendentes adicionados individualmente veem o quadro no menu CRM automaticamente
- Quadros com visibilidade "Individual" garantem que cada atendente veja apenas seus próprios leads (ex: corretores de imóveis)
- A regra de privacidade é claramente comunicada na criação e edição do quadro
- Boards sem acesso configurado continuam invisíveis para usuários não autorizados
- A integração WhatsApp continua sendo opcional e independente do controle de acesso
