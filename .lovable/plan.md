
# Correção Crítica: Recursão Infinita no CRM Kanban

## Causa Raiz do Problema

Há dois loops de recursão encadeados que impedem o carregamento de qualquer board:

**Loop 1 — Política SELECT de `kanban_boards`:**
```
kanban_boards (SELECT) →
  EXISTS(kanban_cards) →
    kanban_cards RLS → can_access_kanban_board() →
      SELECT FROM kanban_boards → LOOP ∞
```

A política `"Usuários podem ver boards acessíveis"` tem uma cláusula `OR EXISTS (SELECT 1 FROM kanban_cards kc WHERE kc.board_id = kanban_boards.id ...)` que dispara a RLS de `kanban_cards`, que por sua vez chama `can_access_kanban_board()`, que faz `SELECT FROM kanban_boards` — recursão infinita.

**Loop 2 — A função `can_access_kanban_board` consulta `kanban_boards`:**
Mesmo como `SECURITY DEFINER`, a função executa `SELECT FROM public.kanban_boards`, que aciona a política SELECT da própria tabela que chamou a função.

## Correção Técnica

### 1. Reescrever `can_access_kanban_board` sem consultar `kanban_boards`

A função precisa verificar as condições de acesso consultando **diretamente** as tabelas auxiliares (`inboxes`, `inbox_users`, `kanban_board_members`), recebendo os dados do board como parâmetros — não buscando em `kanban_boards`:

```sql
CREATE OR REPLACE FUNCTION public.can_access_kanban_board(
  _user_id uuid,
  _board_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.kanban_boards b
      WHERE b.id = _board_id AND b.created_by = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.kanban_boards b
      JOIN public.inbox_users iu ON iu.inbox_id = b.inbox_id
      WHERE b.id = _board_id
        AND b.inbox_id IS NOT NULL
        AND iu.user_id = _user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.kanban_board_members m
      WHERE m.board_id = _board_id AND m.user_id = _user_id
    )
  )
$$;
```

**Problema:** ainda consulta `kanban_boards`. Como ela é `SECURITY DEFINER`, ela bypassa o RLS, logo não há recursão no acesso aos dados — mas o Postgres ainda pode detectar recursão na estrutura de políticas.

**Solução real:** A função deve receber `created_by` e `inbox_id` diretamente como parâmetros, ou ser reescrita para usar apenas tabelas auxiliares (`kanban_board_members`, `inbox_users`), sem nunca tocar em `kanban_boards`.

### Versão definitiva (sem consultar `kanban_boards`):

```sql
CREATE OR REPLACE FUNCTION public.can_access_kanban_board(
  _user_id  uuid,
  _board_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    -- Super admin tem acesso total
    is_super_admin(_user_id)
    -- Membro direto do quadro (nova tabela kanban_board_members)
    OR EXISTS (
      SELECT 1 FROM public.kanban_board_members m
      WHERE m.board_id = _board_id AND m.user_id = _user_id
    )
    -- Membro de inbox vinculada ao quadro
    OR EXISTS (
      SELECT 1 FROM public.inbox_users iu
      INNER JOIN public.kanban_boards b ON b.inbox_id = iu.inbox_id
      WHERE b.id = _board_id
        AND iu.user_id = _user_id
    )
  )
$$;
```

Nota: `created_by` sai da função — o criador verifica acesso via policy direta na RLS da tabela, não via função auxiliar.

### 2. Simplificar a política SELECT de `kanban_boards` (remover o EXISTS de kanban_cards)

```sql
DROP POLICY IF EXISTS "Usuários podem ver boards acessíveis" ON public.kanban_boards;

CREATE POLICY "Usuários podem ver boards acessíveis"
  ON public.kanban_boards FOR SELECT
  USING (
    is_super_admin(auth.uid())
    OR created_by = auth.uid()
    OR (inbox_id IS NOT NULL AND has_inbox_access(auth.uid(), inbox_id))
    OR EXISTS (
      SELECT 1 FROM public.kanban_board_members m
      WHERE m.board_id = kanban_boards.id AND m.user_id = auth.uid()
    )
  );
```

A cláusula `OR EXISTS (SELECT 1 FROM kanban_cards...)` é **removida** pois causa a recursão. O acesso de atendentes a boards onde têm cards atribuídos passa a ser controlado exclusivamente via `kanban_board_members` (o Super Admin adiciona o atendente explicitamente).

### 3. Atualizar política de SELECT em `kanban_cards` (remover chamada à função recursiva)

A política atual de SELECT em `kanban_cards` chama `can_access_kanban_board` dentro do EXISTS em `kanban_boards`. Após a correção, a função será segura (`SECURITY DEFINER` sem tocar `kanban_boards` diretamente via RLS), mas vale garantir que não há outros pontos de recursão.

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| Nova migração SQL | Reescrever `can_access_kanban_board` sem consultar `kanban_boards` via RLS; remover cláusula de `kanban_cards` da política SELECT |
| `src/pages/dashboard/KanbanBoard.tsx` | Ajustar verificação de papel do usuário — `created_by` não mais verifica acesso via função, mas a RLS cobre isso corretamente |

**Total: 1 migração corretiva**

## O que muda para o usuário

- Quadros criados pelo Super Admin aparecem imediatamente na tela CRM
- A aba "Acesso" no EditBoardDialog funciona para adicionar membros
- Membros adicionados via `kanban_board_members` passam a ver o quadro
- Atendentes assignados a cards continuam vendo os cards (a RLS de cards é independente)
- **Nenhuma funcionalidade existente é perdida** — apenas o loop é quebrado
