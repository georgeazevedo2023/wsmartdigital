

# Otimização e Componentização do AdminPanel

## Diagnóstico

O arquivo `AdminPanel.tsx` tem **1598 linhas** e contém vários padrões repetidos:

1. **TooltipProvider repetido ~30x** — Já existe um `<TooltipProvider>` global em `App.tsx`. Todos os `<TooltipProvider>` locais são redundantes e podem ser removidos, mantendo apenas `<Tooltip>`, `<TooltipTrigger>`, `<TooltipContent>`.

2. **Código duplicado com `InboxManagement.tsx` (646 linhas) e `UsersManagement.tsx` (587 linhas)** — Esses dois arquivos contêm lógica quase idêntica ao que já existe no AdminPanel (fetch inboxes, fetch users, create/delete handlers, mesmos tipos). Parecem ser as páginas anteriores que o AdminPanel unificado substituiu.

3. **Padrão de confirmação (AlertDialog) repetido 3x** — Delete inbox, delete user, remove membership usam a mesma estrutura.

4. **`formatPhone` duplicada** — Existe em AdminPanel e UsersManagement.

5. **InboxCard recebe 16 props** — Muitas são estados de edição de webhook que poderiam ser gerenciados internamente.

## Plano de Mudanças

### 1. Criar componente reutilizável `ActionTooltip`
**Arquivo:** `src/components/ui/action-tooltip.tsx`

Wrapper simples que elimina a repetição de `<TooltipProvider><Tooltip><TooltipTrigger>...<TooltipContent>`:
```tsx
const ActionTooltip = ({ label, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);
```
Remove ~120 linhas de boilerplate do AdminPanel.

### 2. Criar componente reutilizável `ConfirmDialog`
**Arquivo:** `src/components/ui/confirm-dialog.tsx`

Props: `open`, `onOpenChange`, `title`, `description`, `onConfirm`, `isLoading`, `confirmLabel`, `destructive`, `icon`.

Substitui os 3 AlertDialogs repetidos no AdminPanel (~60 linhas) e pode ser reutilizado em outras páginas.

### 3. Criar `src/lib/formatPhone.ts`
Mover `formatPhone` para um utilitário compartilhado, remover duplicatas de AdminPanel e UsersManagement.

### 4. Refatorar `InboxCard` — gerenciar estado de webhook internamente
Mover os estados de edição de webhook (`editingWebhookId`, `editWebhookValue`, etc.) para dentro do próprio `InboxCard`, recebendo apenas `inbox`, `onSaveWebhook(id, field, value)` como prop. Reduz de 16 props para ~6.

### 5. Extrair sub-componentes para arquivos separados
**Novos arquivos em `src/components/admin/`:**
- `AdminStatsBar.tsx` — Barra de estatísticas
- `InboxCard.tsx` — Card de inbox com webhook editing interno
- `UserCard.tsx` — Card de usuário
- `TeamSection.tsx` — Seção de equipe agrupada por inbox
- `WebhookRow.tsx` — Linha de webhook editável (usado dentro de InboxCard)

### 6. Remover todos os `<TooltipProvider>` locais do AdminPanel
Como já há um global em `App.tsx`, simplesmente usar `<Tooltip>` direto.

### 7. Remover `InboxManagement.tsx` e `UsersManagement.tsx` se não estiverem em uso
Verificar rotas — se o AdminPanel já é o substituto unificado, essas páginas podem ser removidas (~1230 linhas eliminadas).

## Estimativa de Redução

| Área | Linhas removidas |
|------|-----------------|
| TooltipProvider boilerplate | ~120 |
| ConfirmDialog consolidação | ~60 |
| Webhook state internalized | ~40 |
| Sub-componentes extraídos | AdminPanel fica ~400 linhas (de 1598) |
| Páginas duplicadas removidas | ~1230 |
| **Total** | **~1050+ linhas** |

## Detalhes Técnicos

### Arquivos criados
- `src/components/ui/action-tooltip.tsx`
- `src/components/ui/confirm-dialog.tsx`
- `src/lib/formatPhone.ts`
- `src/components/admin/AdminStatsBar.tsx`
- `src/components/admin/InboxCard.tsx`
- `src/components/admin/UserCard.tsx`
- `src/components/admin/TeamSection.tsx`
- `src/components/admin/WebhookRow.tsx`

### Arquivos modificados
- `src/pages/dashboard/AdminPanel.tsx` — Refatorado para importar sub-componentes
- `src/pages/dashboard/UsersManagement.tsx` — Importar `formatPhone` do utilitário

### Arquivos possivelmente removidos
- `src/pages/dashboard/InboxManagement.tsx` (se não usado em rotas)
- `src/pages/dashboard/UsersManagement.tsx` (se não usado em rotas)

Antes de remover, verificarei as rotas em `App.tsx` para confirmar.

