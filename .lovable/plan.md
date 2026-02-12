

# Corrigir Player de Audio para Mensagens Enviadas no Helpdesk

## Problema
Quando um audio e enviado pelo helpdesk, o destinatario recebe normalmente, mas na interface da conversa o player nao aparece. Apenas o horario e exibido (como visivel na screenshot: 07:20, 07:50, 07:56, 13:55).

## Causa Raiz
No `ChatInput.tsx`, ao enviar audio, a mensagem e salva no banco com `media_url: null` (linha 175-181). O `MessageBubble.tsx` so renderiza o `AudioPlayer` quando `message.media_url` existe (linha 138). Sem URL, o player nao aparece.

## Solucao
Armazenar o audio enviado no Lovable Cloud Storage e salvar a URL publica no campo `media_url` da mensagem.

### Fluxo Corrigido:
1. Usuario grava audio no browser
2. Audio e convertido para blob
3. **NOVO**: Upload do blob para o Storage (bucket `audio-messages`)
4. Audio e enviado para o destinatario via UAZAPI (sem mudanca)
5. Mensagem e salva no banco **com a URL do Storage** no campo `media_url`
6. O broadcast inclui a `media_url` real
7. O `MessageBubble` renderiza o `AudioPlayer` normalmente

### Secao Tecnica

**1. Criar bucket de Storage** (migracao SQL):
- Criar bucket `audio-messages` no Storage para armazenar os audios enviados
- Configurar politica de acesso para leitura publica e upload autenticado

**2. Modificar `src/components/helpdesk/ChatInput.tsx`**:
- Apos gravar o audio, fazer upload do blob para o Storage antes de salvar no banco
- Gerar um nome unico para o arquivo (ex: `{conversation_id}/{timestamp}.ogg`)
- Obter a URL publica do arquivo
- Incluir `media_url` no insert e no broadcast

Trecho relevante da mudanca:
```
// Upload audio to storage
const fileName = `${conversation.id}/${Date.now()}.ogg`;
const { data: uploadData } = await supabase.storage
  .from('audio-messages')
  .upload(fileName, blob, { contentType: blob.type });

const { data: publicUrl } = supabase.storage
  .from('audio-messages')
  .getPublicUrl(fileName);

// Save with media_url
await supabase.from('conversation_messages').insert({
  conversation_id: conversation.id,
  direction: 'outgoing',
  content: null,
  media_type: 'audio',
  media_url: publicUrl.publicUrl,  // <-- agora tem URL
  sender_id: user.id,
});
```

**3. Atualizar o broadcast** no mesmo arquivo:
- Incluir `media_url: publicUrl.publicUrl` no payload do broadcast (atualmente envia `null`)

**Arquivos modificados:**
- `src/components/helpdesk/ChatInput.tsx` - upload para Storage + salvar URL

**Migracao necessaria:**
- Criar bucket `audio-messages` no Storage com politica de leitura publica

