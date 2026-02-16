
# Enriquecer payload do Webhook Outgoing

## Objetivo

Adicionar mais dados ao payload do webhook outgoing: timestamp, instancia, caixa de entrada, tipo de mensagem, conteudo da mensagem e URL publica de midia/documento.

## Alteracoes

### `src/components/helpdesk/ChatInput.tsx`

Modificar a funcao `fireOutgoingWebhook` para aceitar parametros com os dados da mensagem enviada e incluir todos os campos solicitados no payload.

**Assinatura atualizada:**

```typescript
const fireOutgoingWebhook = async (messageData: {
  message_type: 'text' | 'audio' | 'image' | 'document';
  content: string | null;
  media_url: string | null;
}) => { ... }
```

**Payload completo enviado ao n8n:**

```json
{
  "timestamp": "2026-02-16T02:15:00.000Z",
  "instance_name": "NeoBlindados",
  "instance_id": "uuid-da-instancia",
  "inbox_name": "Neo Blindados - Geral",
  "inbox_id": "uuid-da-inbox",
  "remotejid": "5511999999999@s.whatsapp.net",
  "fromMe": true,
  "agent_name": "George Azevedo",
  "agent_id": "66de650f-...",
  "pausar_agente": "sim",
  "message_type": "text",
  "message": "Ola, como posso ajudar?",
  "media_url": null
}
```

Para audio: `message_type: "audio"`, `message: null`, `media_url: "https://...storage.../audio.ogg"`
Para imagem: `message_type: "image"`, `message: null`, `media_url: "https://...storage.../foto.jpg"`
Para documento: `message_type: "document"`, `message: "arquivo.pdf"`, `media_url: "https://...storage.../arquivo.pdf"`

**Chamadas atualizadas nos 3 pontos de envio:**

1. Envio de texto (handleSend): `fireOutgoingWebhook({ message_type: 'text', content: text.trim(), media_url: null })`
2. Envio de audio (handleSendAudio): `fireOutgoingWebhook({ message_type: 'audio', content: null, media_url: audioPublicUrl })`
3. Envio de arquivo (handleSendFile): `fireOutgoingWebhook({ message_type: mediaType, content: isImage ? null : file.name, media_url: filePublicUrl })`

### Detalhes tecnicos

A funcao buscara os nomes da instancia e inbox diretamente do objeto `conversation.inbox` que ja contem `instance_id` e o nome da inbox. Para o nome da instancia, sera feita uma consulta rapida na tabela `instances`:

```typescript
const fireOutgoingWebhook = async (messageData: {
  message_type: string;
  content: string | null;
  media_url: string | null;
}) => {
  const inbox = conversation.inbox as any;
  const webhookUrl = inbox?.webhook_outgoing_url;
  if (!webhookUrl || !user) return;
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data: instanceInfo } = await supabase
      .from('instances')
      .select('name')
      .eq('id', inbox?.instance_id || '')
      .maybeSingle();

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors',
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        instance_name: instanceInfo?.name || '',
        instance_id: inbox?.instance_id || '',
        inbox_name: inbox?.name || '',
        inbox_id: inbox?.id || conversation.inbox_id,
        remotejid: conversation.contact?.jid,
        fromMe: true,
        agent_name: profile?.full_name || user.email,
        agent_id: user.id,
        pausar_agente: 'sim',
        message_type: messageData.message_type,
        message: messageData.content,
        media_url: messageData.media_url,
      }),
    });
  } catch (err) {
    console.error('Outgoing webhook error:', err);
  }
};
```

### Arquivo afetado
- `src/components/helpdesk/ChatInput.tsx` - funcao `fireOutgoingWebhook` e suas 3 chamadas

Nenhuma migracao necessaria.
