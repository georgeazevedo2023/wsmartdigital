
# Transcrição Automática de Áudios com Groq Whisper

## Visão Geral

Quando um áudio é recebido no webhook, o sistema vai automaticamente baixar o arquivo, enviar para a API da Groq (Whisper Large V3) para transcrição, salvar o texto no banco de dados, e exibir abaixo do player de áudio na interface.

## Arquitetura

```text
Webhook recebe áudio
  -> Insere mensagem no banco
  -> Baixa o MP3 via URL
  -> Envia para Groq Whisper API
  -> Atualiza campo "transcription" na mensagem
  -> UI exibe texto abaixo do AudioPlayer
```

## Mudanças

### 1. Banco de Dados (migração)

Adicionar coluna `transcription` na tabela `conversation_messages`:

```sql
ALTER TABLE public.conversation_messages
ADD COLUMN transcription text DEFAULT NULL;
```

### 2. Salvar a API Key da Groq como Secret

A chave da Groq será armazenada como secret seguro (`GROQ_API_KEY`) para uso na edge function.

### 3. Edge Function: `supabase/functions/transcribe-audio/index.ts`

Nova função que:
- Recebe `messageId` e `audioUrl`
- Baixa o arquivo de áudio da URL
- Envia como `multipart/form-data` para `https://api.groq.com/openai/v1/audio/transcriptions`
- Parâmetros: model `whisper-large-v3`, language `pt`, temperature `0`
- Atualiza o campo `transcription` da mensagem no banco

### 4. Webhook: `supabase/functions/whatsapp-webhook/index.ts`

Após inserir a mensagem de áudio com sucesso:
- Chama a edge function `transcribe-audio` de forma assíncrona (fire-and-forget) para não atrasar o webhook
- Passa o ID da mensagem inserida e a URL do áudio

### 5. UI: `src/components/helpdesk/MessageBubble.tsx`

- Quando `message.media_type === 'audio'` e `message.transcription` existe, exibir o texto abaixo do AudioPlayer
- Estilo: texto pequeno, itálico, cor suave, com ícone de microfone

### 6. Tipo Message no HelpDesk

Adicionar `transcription?: string` ao tipo `Message` usado no HelpDesk para que o campo seja carregado do banco e disponível na UI.

## Detalhes Técnicos

### Edge Function `transcribe-audio`

```typescript
// Fluxo principal:
const audioResponse = await fetch(audioUrl);
const audioBlob = await audioResponse.blob();

const formData = new FormData();
formData.append('file', audioBlob, 'audio.mp3');
formData.append('model', 'whisper-large-v3');
formData.append('temperature', '0');
formData.append('language', 'pt');
formData.append('response_format', 'verbose_json');
formData.append('prompt', 'Conversa o áudio em texto de forma clara e precisa.');

const result = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
  body: formData,
});

const { text } = await result.json();

// Atualizar no banco
await supabase.from('conversation_messages')
  .update({ transcription: text })
  .eq('id', messageId);
```

### Chamada assíncrona no Webhook

```typescript
// Após inserir mensagem de áudio com sucesso
if (mediaType === 'audio' && mediaUrl && insertedMsg) {
  fetch(`${SUPABASE_URL}/functions/v1/transcribe-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messageId: insertedMsg.id,
      audioUrl: mediaUrl,
    }),
  }).catch(err => console.error('Transcription call failed:', err));
}
```

### Exibição na UI

```typescript
// Abaixo do AudioPlayer no MessageBubble
{message.media_type === 'audio' && message.transcription && (
  <p className="text-[11px] text-muted-foreground italic mt-1 whitespace-pre-wrap">
    {message.transcription}
  </p>
)}
```

## Resultado

- Áudios recebidos são transcritos automaticamente em segundo plano
- Transcrição aparece abaixo do player assim que disponível
- Não atrasa o processamento do webhook (chamada assíncrona)
- Chave da Groq armazenada de forma segura como secret
