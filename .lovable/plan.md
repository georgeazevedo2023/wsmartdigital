

# Auto-atribuir agente ao responder uma conversa

## Objetivo

Quando um agente enviar uma mensagem (texto, audio ou arquivo) em uma conversa, atribuir automaticamente essa conversa para ele se ela ainda nao estiver atribuida, ou transferir para ele se estiver atribuida a outro agente.

## Alteracao

### `src/components/helpdesk/ChatInput.tsx`

Adicionar uma funcao auxiliar `autoAssignAgent` que sera chamada apos o envio bem-sucedido de qualquer tipo de mensagem (texto, audio, arquivo). A logica:

1. Verificar se `conversation.assigned_to` ja e o usuario atual (`user.id`) - se sim, nao fazer nada
2. Caso contrario, atualizar `conversations.assigned_to` para `user.id`
3. Exibir um toast discreto informando a atribuicao automatica

Pontos de insercao da chamada `autoAssignAgent()`:
- `handleSend()` - apos envio de texto (linha ~439, antes de `onMessageSent()`) - apenas para mensagens normais, nao para notas privadas
- `handleSendAudio()` - apos envio de audio (linha ~230, antes de `onMessageSent()`)
- `handleSendFile()` - apos envio de arquivo (linha ~343, antes de `onMessageSent()`)

### Funcao auxiliar

```typescript
const autoAssignAgent = async () => {
  if (!user || conversation.assigned_to === user.id) return;
  try {
    await supabase
      .from('conversations')
      .update({ assigned_to: user.id })
      .eq('id', conversation.id);
  } catch (err) {
    console.error('Auto-assign error:', err);
  }
};
```

Nenhuma migracao necessaria. Apenas uma alteracao em um arquivo.

