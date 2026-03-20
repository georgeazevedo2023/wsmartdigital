

## Refatoração: ConversationList.tsx + useHelpDesk.ts

### 1. ConversationList.tsx (~228 linhas → ~80 linhas)

Extrair dois sub-componentes:

**`src/components/helpdesk/ConversationFilters.tsx`** (~100 linhas)
- Recebe: `searchQuery`, `onSearchChange`, filtros (assignment, priority, label), callbacks de mudança, `inboxLabels`, `hasActiveFilters`, `onClearFilters`
- Renderiza: input de busca + linha de selects (atribuição, prioridade, etiqueta) + botão "limpar filtros"
- Move as constantes `assignmentOptions` e `priorityOptions` para este arquivo

**`ConversationList.tsx` simplificado** (~80 linhas)
- Compõe `ConversationFilters` + loop de `ConversationItem` + loading/empty states + `ManageLabelsDialog`

`ConversationItem.tsx` já existe e não precisa de mudanças.

### 2. useHelpDesk.ts (~314 linhas → ~80 linhas orquestrador)

Separar em 3 hooks especializados:

**`src/hooks/helpdesk/useHelpdeskInboxes.ts`** (~60 linhas)
- Estado: `inboxes`, `selectedInboxId`, `syncing`
- Lógica: `fetchInboxes` (com suporte a `inboxParam`), `handleSync`, `handleInboxChange`

**`src/hooks/helpdesk/useHelpdeskConversations.ts`** (~120 linhas)
- Estado: `conversations`, `selectedConversation`, `loading`, filtros (status, search, assignment, priority, label)
- Lógica: `fetchConversations`, `handleSelectConversation`, `handleUpdateConversation`, `filteredConversations` (memo)
- Recebe `selectedInboxId` e `user` como parâmetros

**`src/hooks/helpdesk/useHelpdeskLabels.ts`** (~60 linhas)
- Estado: `inboxLabels`, `conversationLabelsMap`, `labelFilter`, `agentNamesMap`, `conversationNotesSet`
- Lógica: `fetchLabels`, `fetchConversationLabels`, `fetchConversationNotes`, `fetchAgentNames`, `handleLabelsChanged`
- Recebe `selectedInboxId` como parâmetro

**`src/hooks/useHelpDesk.ts` orquestrador** (~80 linhas)
- Importa os 3 hooks, compõe estado de UI (`mobileView`, `showContactInfo`, `showConversationList`, `manageLabelsOpen`)
- Mantém a mesma interface de retorno — zero breaking changes para `HelpDesk.tsx`

### Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/helpdesk/ConversationFilters.tsx` |
| Editar | `src/components/helpdesk/ConversationList.tsx` |
| Criar | `src/hooks/helpdesk/useHelpdeskInboxes.ts` |
| Criar | `src/hooks/helpdesk/useHelpdeskConversations.ts` |
| Criar | `src/hooks/helpdesk/useHelpdeskLabels.ts` |
| Editar | `src/hooks/useHelpDesk.ts` |

