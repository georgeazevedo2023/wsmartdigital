
## Problema: Audio Enviado Não Aparece na Conversa

### Raiz do Problema

O fluxo atual para enviar áudio é:
1. **ChatInput** grava o áudio e envia via `/uazapi-proxy` para WhatsApp
2. **ChatInput** salva a mensagem diretamente no banco de dados (linha 175-181)
3. **ChatInput** chama `onMessageSent()` que executa `fetchMessages()` no ChatPanel

O problema é que `fetchMessages()` é chamado **imediatamente**, mas há um delay de rede. Além disso, a mensagem foi **insertida com timestamp `created_at` DEFAULT (now())**, o que pode não sincronizar perfeitamente com o servidor.

Mais importante: **O webhook nunca recebe notificação sobre a mensagem outgoing**, então nunca envia o broadcast via `helpdesk-realtime` que o ChatPanel está escutando. A mensagem aparece no DB mas não chega em tempo real via broadcast.

### Solução Proposta

#### Opção 1 (Recomendada - Rápida e Simples)
Adicionar um broadcast manual no **ChatInput** após salvar a mensagem outgoing:

**Arquivo**: `src/components/helpdesk/ChatInput.tsx`

```typescript
// Após salvar a mensagem no DB (linha 175-181), adicionar:
const { data: messageData } = await supabase
  .from('conversation_messages')
  .select('*')
  .eq('id', insertedMessage.id)
  .single();

// Fazer broadcast manual para notificar o ChatPanel em tempo real
const broadcastPayload = {
  conversation_id: conversation.id,
  message_id: messageData.id,
  direction: 'outgoing',
  media_type: 'audio',
  content: null,
  media_url: null,
  created_at: new Date().toISOString(),
};

await supabase.channel('helpdesk-realtime').send('broadcast', {
  event: 'new-message',
  payload: broadcastPayload,
});
```

**Benefícios**:
- Instantâneo - não depende do webhook
- Mantém consistência com o padrão do webhook
- Mensagem aparece imediatamente no chat

**Tempo estimado**: 15 minutos

#### Opção 2 (Mais Robusta - Mas Mais Complexa)
Criar uma edge function `send-audio-sync` que:
1. Envia áudio via proxy
2. Salva no DB
3. Faz o broadcast
4. Retorna tudo em uma transação

Isso eliminaria lógica duplicada no frontend.

**Tempo estimado**: 45 minutos

### Arquivos a Modificar
- `src/components/helpdesk/ChatInput.tsx` - adicionar broadcast manual após save

### Por Que Não Aparecia
- A mensagem foi salva no DB ✅
- O fetch foi chamado ✅
- MAS o broadcast nunca foi enviado, então:
  - O subscription no ChatPanel (`helpdesk-realtime`) nunca disparou
  - A tela não fez re-render automático
  - Apenas ao trocar de conversa e voltar a mensagem aparecia

### Recomendação
**Implementar Opção 1** (broadcast manual) - é a fix mais rápida e testada. Depois, considerar refatorar para uma edge function centralizada (Opção 2) para eliminar duplicação de lógica entre texto, áudio e mídias.

