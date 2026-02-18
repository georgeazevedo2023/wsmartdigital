
# Agente Responsável: Auto-atribuição, Transferência e Remoção

## Diagnóstico do Problema Atual

Existem três pontos de falha:

1. **Auto-atribuição não reflete na UI**: A função `autoAssignAgent()` no `ChatInput` atualiza o banco, mas o `selectedConversation` no `HelpDesk.tsx` não é sincronizado — a tela continua mostrando "Nenhum" como agente.

2. **Lista de agentes vazia no ContactInfoPanel**: A query de `inbox_users` faz join com `user_profiles`, mas a política RLS de `user_profiles` só permite que cada usuário veja o próprio perfil. Agentes não conseguem listar outros agentes.

3. **Badge de agente na lista não exibe nome**: O `agentNamesMap` é preenchido corretamente, mas como o `assigned_to` da conversa não é atualizado no estado local após a auto-atribuição, o badge nunca aparece.

## Solução

### 1. `src/components/helpdesk/ChatInput.tsx`
- Após `autoAssignAgent()`, emitir um broadcast `assigned-agent` com o `conversation_id` e `assigned_to: user.id`
- Isso notifica o `HelpDesk.tsx` para atualizar o estado local da conversa em tempo real

### 2. `src/pages/dashboard/HelpDesk.tsx`
- Subscrever ao evento broadcast `assigned-agent` no canal `helpdesk-conversations`
- Ao receber, atualizar `conversations` e `selectedConversation` com o novo `assigned_to`

### 3. `src/components/helpdesk/ContactInfoPanel.tsx`
- Substituir a query de `inbox_users` (que falha por RLS) por uma alternativa que usa o `agentNamesMap` já disponível no `HelpDesk.tsx`
- Receber `agentNamesMap` como prop e combinar com os membros da inbox via uma query que funciona para todos os papéis
- Adicionar opção "Sem agente" para **remover** atribuição (já existe como `__none__` mas precisa disparar corretamente)
- Ao atribuir/transferir, atualizar localmente via broadcast `assigned-agent`

### 4. `src/components/helpdesk/ChatPanel.tsx`
- Exibir o nome do agente responsável na área abaixo do nome do contato no header, usando `agentNamesMap`

## Fluxo Completo

```text
Agente envia mensagem
  → autoAssignAgent() → DB: conversations.assigned_to = user.id
  → broadcast 'assigned-agent' { conversation_id, assigned_to: user.id }

HelpDesk ouve broadcast 'assigned-agent'
  → atualiza conversations[id].assigned_to
  → atualiza selectedConversation.assigned_to
  → ConversationItem mostra badge com nome do agente

ContactInfoPanel (seletor manual)
  → lista agentes via agentNamesMap (prop recebida)
  → ao selecionar → onUpdateConversation → DB + broadcast 'assigned-agent'
  → ao selecionar "Nenhum" → assigned_to = null + broadcast
```

## Arquivos Afetados

- **`src/components/helpdesk/ChatInput.tsx`**: broadcast após auto-atribuição
- **`src/pages/dashboard/HelpDesk.tsx`**: escutar broadcast e atualizar estado; passar `agentNamesMap` ao `ContactInfoPanel`
- **`src/components/helpdesk/ContactInfoPanel.tsx`**: receber `agentNamesMap` como prop para preencher lista de agentes sem depender de RLS; broadcast ao fazer atribuição manual
- **`src/components/helpdesk/ChatPanel.tsx`**: mostrar nome do agente responsável no header

## Detalhes Técnicos

- O broadcast `assigned-agent` usa o canal `helpdesk-conversations` já existente, sem criar canais novos
- O `ContactInfoPanel` receberá a prop `agentNamesMap: Record<string, string>` — o `HelpDesk.tsx` já a possui e precisa apenas passá-la adiante
- A remoção de atribuição (`__none__`) define `assigned_to: null` tanto no DB quanto no broadcast, e o badge some automaticamente
- Para a lista de agentes no `ContactInfoPanel`, será feita uma query em `inbox_users` filtrando pelo `inbox_id` e cruzando os `user_id` com o `agentNamesMap` já carregado — evitando a necessidade de ler `user_profiles` diretamente
