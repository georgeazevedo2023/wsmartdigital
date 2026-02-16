
# Exibir nome e ID do agente acima das mensagens enviadas

## Objetivo

Mostrar o nome do agente e seu user ID acima de cada mensagem enviada (outgoing) no chat do Helpdesk, para que fique claro qual agente enviou cada mensagem.

## Alteracoes

### 1. `src/pages/dashboard/HelpDesk.tsx`
- Passar a prop `agentNamesMap` para o componente `ChatPanel` (nos dois pontos de renderizacao: mobile e desktop)

### 2. `src/components/helpdesk/ChatPanel.tsx`
- Adicionar `agentNamesMap?: Record<string, string>` na interface `ChatPanelProps`
- Passar `agentNamesMap` para cada `MessageBubble`

### 3. `src/components/helpdesk/MessageBubble.tsx`
- Adicionar `agentNamesMap?: Record<string, string>` na interface `MessageBubbleProps`
- Para mensagens outgoing que possuem `sender_id`, exibir acima do conteudo da mensagem:
  - Nome do agente (buscado no `agentNamesMap` pelo `sender_id`)
  - ID do agente (o proprio `sender_id` truncado)
- O texto sera exibido em fonte pequena (text-[11px]) com cor discreta (text-emerald-400/70) para manter a legibilidade sem poluir visualmente

### Exemplo visual

```text
  ┌─────────────────────────────┐
  │ João Silva · abc1234...     │  <- nome + ID truncado
  │ Olá, como posso ajudar?     │
  │                       14:30 │
  └─────────────────────────────┘
```

### Detalhes tecnicos

A logica no `MessageBubble` sera:

```tsx
{isOutgoing && !isNote && message.sender_id && agentNamesMap?.[message.sender_id] && (
  <span className="text-[11px] text-emerald-400/70 block mb-0.5">
    {agentNamesMap[message.sender_id]} · {message.sender_id.substring(0, 8)}
  </span>
)}
```

Nenhuma migracao necessaria. O `sender_id` ja e salvo nas mensagens e o `agentNamesMap` ja existe no estado do HelpDesk.
