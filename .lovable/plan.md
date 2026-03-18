

## Refatoração do ChatPanel.tsx

O arquivo tem ~375 linhas com lógica de mensagens, realtime, IA e renderização misturadas. A refatoração separa em 4 partes.

### Estrutura final

```text
src/components/helpdesk/
├── ChatPanel.tsx          (~80 linhas - orquestrador)
├── ChatHeader.tsx         (~120 linhas - header com status, IA, notas)
├── ChatMessageList.tsx    (~50 linhas - lista de mensagens + scroll)
├── ChatInput.tsx          (já existe, sem mudanças)
├── MessageBubble.tsx      (já existe, sem mudanças)
└── useChatMessages.ts     (~120 linhas - hook dedicado)
```

### 1. Hook `useChatMessages.ts`
Extrai toda a lógica de dados do ChatPanel:
- Estado `messages`, `loading`
- `fetchMessages` (query ao banco)
- Realtime via broadcast (`new-message` e `transcription-updated`)
- Auto-scroll com `bottomRef`
- Separação `chatMessages` / `notes`
- Estado e lógica de IA (`iaAtivada`, `handleActivateIA`)

Interface: `useChatMessages(conversation)` retorna `{ chatMessages, notes, loading, bottomRef, iaAtivada, ativandoIa, handleActivateIA, fetchMessages, setMessages, setIaAtivada }`

### 2. Sub-componente `ChatHeader.tsx`
Recebe via props: `conversation`, `agentName`, `iaAtivada`, `ativandoIa`, `notes`, `onActivateIA`, `onUpdateConversation`, callbacks de toggle (info, list, back, notes).

Renderiza: botões de navegação, nome do contato, select de status, badge/botão de IA, botão de notas, botões info/toggle.

### 3. Sub-componente `ChatMessageList.tsx`
Recebe: `chatMessages`, `loading`, `bottomRef`, `instanceId`, `agentNamesMap`.

Renderiza: spinner de loading, empty state, lista de `MessageBubble`, div de scroll anchor.

### 4. `ChatPanel.tsx` simplificado (~80 linhas)
Orquestra os 3 elementos: chama `useChatMessages`, renderiza `ChatHeader` + `ChatMessageList` + `ChatInput` + `NotesPanel`. Mantém 100% da API de props existente.

