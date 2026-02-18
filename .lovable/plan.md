
# Auto-atribuição ao enviar mensagem: fix do feedback visual em tempo real

## O que já está funcionando

A lógica central já existe no `ChatInput.tsx`:
- A função `autoAssignAgent()` já existe (linha 26-46)
- Já é chamada ao enviar texto (linha 551), áudio (linha 313) e arquivo (linha 440)
- O broadcast `assigned-agent` já é disparado via `helpdesk-conversations`
- O `HelpDesk.tsx` já escuta o broadcast e atualiza `selectedConversation`

## O problema real

A função `autoAssignAgent()` no `ChatInput` apenas:
1. Faz UPDATE no banco
2. Dispara broadcast

Mas **não chama nenhum callback local imediato**. Isso cria dois problemas:

1. O `ContactInfoPanel` depende do `conversation.assigned_to` recebido como prop. Se o broadcast chegar com delay ou a conversa não estiver selecionada no canal certo, o dropdown continua mostrando "— Nenhum —"

2. O `ChatInput` não tem referência ao `onUpdateConversation` do `ContactInfoPanel` — eles são componentes irmãos, ambos recebendo `conversation` do `HelpDesk` pai

## Solução

Adicionar um **callback `onAgentAssigned`** no `ChatInput` para que, após auto-atribuição, o estado local seja atualizado imediatamente no `HelpDesk.tsx` (sem depender do broadcast):

### 1. `ChatInput.tsx` — adicionar prop `onAgentAssigned`

```typescript
interface ChatInputProps {
  conversation: Conversation;
  onMessageSent: () => void;
  onAgentAssigned?: (conversationId: string, agentId: string) => void; // NOVA
  // ...
}
```

E dentro de `autoAssignAgent()`, após o update bem-sucedido:

```typescript
const autoAssignAgent = async () => {
  if (!user || conversation.assigned_to === user.id) return;
  try {
    await supabase
      .from('conversations')
      .update({ assigned_to: user.id })
      .eq('id', conversation.id);

    // Callback imediato para UI local
    onAgentAssigned?.(conversation.id, user.id); // NOVO

    // Broadcast para outros agentes
    await supabase.channel('helpdesk-conversations').send({...});
  } catch (err) {...}
};
```

### 2. `HelpDesk.tsx` — passar callback e processar atualização

Criar um handler `handleAgentAssigned` que atualiza `selectedConversation` e `conversations` localmente:

```typescript
const handleAgentAssigned = (conversationId: string, agentId: string) => {
  setConversations(prev =>
    prev.map(c => c.id === conversationId ? { ...c, assigned_to: agentId } : c)
  );
  setSelectedConversation(prev =>
    prev?.id === conversationId ? { ...prev, assigned_to: agentId } : prev
  );
};
```

E passar para o `ChatInput`:
```tsx
<ChatInput
  conversation={selectedConversation}
  onMessageSent={handleMessageSent}
  onAgentAssigned={handleAgentAssigned} // NOVO
  ...
/>
```

### 3. `ChatPanel.tsx` — propagar a prop até `ChatInput`

O `ChatInput` está dentro do `ChatPanel`. Será necessário passar `onAgentAssigned` como prop também pelo `ChatPanel`.

## Arquivos a modificar

- **`src/components/helpdesk/ChatInput.tsx`**: Adicionar prop `onAgentAssigned` e chamá-la dentro de `autoAssignAgent()`
- **`src/components/helpdesk/ChatPanel.tsx`**: Adicionar e propagar prop `onAgentAssigned`
- **`src/pages/dashboard/HelpDesk.tsx`**: Criar `handleAgentAssigned` e passar para `ChatPanel`

## Resultado esperado

Quando Milena enviar uma mensagem em uma conversa sem agente:
1. A mensagem é enviada
2. `autoAssignAgent()` faz o UPDATE no banco
3. `onAgentAssigned` é chamado imediatamente → o dropdown "Agente Responsável" muda de "— Nenhum —" para "Milena" instantaneamente, sem depender do broadcast
4. O broadcast ainda é disparado para que outros agentes conectados também vejam a mudança em tempo real
