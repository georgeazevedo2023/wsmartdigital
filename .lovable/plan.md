
# Corrigir Exibição da Transcrição e Adicionar Loading Indicator

## Problema Identificado

A transcrição está funcionando corretamente no backend (os logs confirmam que o áudio foi transcrito e salvo). O problema é que:

1. A mensagem de áudio é inserida primeiro SEM transcrição
2. A transcrição é adicionada via UPDATE alguns segundos depois
3. O canal realtime do ChatPanel só escuta eventos de broadcast (`new-message`), que são disparados apenas na inserção -- o UPDATE posterior com a transcrição não dispara um refresh na UI
4. Resultado: o usuário vê a mensagem sem transcrição e precisa recarregar manualmente

## Solução

### 1. Webhook: Notificar o frontend quando a transcrição chegar

Modificar a edge function `transcribe-audio` para, após salvar a transcrição no banco, enviar um broadcast no canal `helpdesk-realtime` com evento `transcription-updated`, incluindo o `messageId`, `conversationId` e o texto da transcrição.

Para isso, a edge function precisa receber também o `conversationId` como parâmetro. O webhook será atualizado para enviá-lo.

### 2. ChatPanel: Escutar evento de transcrição

Atualizar o `ChatPanel.tsx` para escutar o evento `transcription-updated` no canal broadcast. Quando recebido, atualizar o campo `transcription` da mensagem correspondente no state local (sem precisar refazer o fetch completo).

### 3. MessageBubble: Adicionar loading indicator

No `MessageBubble.tsx`, quando `media_type === 'audio'` e `transcription` for `null` ou `undefined`, e a mensagem for `incoming`, exibir um indicador de "Transcrevendo..." com animação de pulso abaixo do player.

### 4. Webhook: Passar conversationId para transcribe-audio

Atualizar a chamada no webhook para incluir o `conversationId` no body enviado para a edge function.

## Detalhes Técnicos

### Arquivo: `supabase/functions/transcribe-audio/index.ts`
- Receber `conversationId` além de `messageId` e `audioUrl`
- Após salvar no banco, enviar broadcast via Supabase Realtime:
```typescript
await supabase.channel('helpdesk-realtime').send({
  type: 'broadcast',
  event: 'transcription-updated',
  payload: { messageId, conversationId, transcription }
})
```

### Arquivo: `supabase/functions/whatsapp-webhook/index.ts`
- Incluir `conversationId` na chamada para `transcribe-audio`

### Arquivo: `src/components/helpdesk/ChatPanel.tsx`
- Adicionar listener para evento `transcription-updated` no canal broadcast existente
- Atualizar mensagem no state local com a transcrição recebida

### Arquivo: `src/components/helpdesk/MessageBubble.tsx`
- Quando `media_type === 'audio'`, `direction === 'incoming'`, e sem `transcription`:
  - Exibir loading: "Transcrevendo..." com animação pulse
- Quando `transcription` existe: exibir o texto normalmente

## Resultado Esperado

- Transcrição aparece automaticamente no chat segundos após o áudio ser recebido, sem recarregar a página
- Loading "Transcrevendo..." visível enquanto o processo ocorre
- Transição suave do loading para o texto transcrito
