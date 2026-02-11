
# Reescrever Webhook e Configurar Forwarding com n8n

## Análise da Situação Atual

### Problema
O webhook `whatsapp-webhook` foi configurado para o formato **Evolution API** (com estrutura `key.remoteJid`, `key.fromMe`, etc.), mas a UAZAPI envia payloads em um formato completamente diferente. O payload do n8n mostra:

```json
{
  "EventType": "messages",
  "instanceName": "motorac",
  "message": {
    "chatid": "558193856099@s.whatsapp.net",
    "text": "Bom dia",
    "fromMe": false,
    "messageid": "3A5967E9F494363C76D0",
    "mediaType": "",
    "messageTimestamp": 1770817524000
  },
  "chat": { ... }
}
```

### Solução Proposta

1. **Reescrever o webhook** para processar o formato UAZAPI (não Evolution API)
2. **Suportar múltiplos tipos de mídia** (texto, áudio, imagem, vídeo)
3. **Configurar n8n** para encaminhar o payload recebido ao webhook do Lovable
4. **Garantir deduplicação correta** usando `messageid` da UAZAPI

---

## Parte 1: Reescrever o Webhook (`whatsapp-webhook/index.ts`)

### Mudanças Principais

**1. Aceitar o formato UAZAPI V2**
- Campo `EventType: "messages"` para filtrar eventos corretos
- Campo `instanceName` para identificar a instância
- Estrutura diferente de `message` e `chat`

**2. Suportar Múltiplos Tipos de Mídia**

Segundo a documentação da UAZAPI e o payload de exemplo:

| Tipo | Campo | Extração |
|------|-------|----------|
| **Texto** | `message.text` ou `message.content` | Direto no campo |
| **Imagem** | `message.mediaType === 'image'` | URL em `message.fileURL`, caption em `message.caption` |
| **Vídeo** | `message.mediaType === 'video'` | URL em `message.fileURL`, caption em `message.caption` |
| **Áudio** | `message.mediaType === 'audio'` | URL em `message.fileURL` |
| **Documento** | `message.mediaType === 'document'` | URL em `message.fileURL`, nome em `message.fileName` |

**3. Mapear Campos UAZAPI → Banco de Dados**

| UAZAPI | Banco de Dados |
|--------|---|
| `message.messageid` | `external_id` (para deduplicação) |
| `message.chatid` | `contact_jid` (finder de contato) |
| `message.sender` ou `message.sender_pn` | Número do contato |
| `message.fromMe` | `direction` (outgoing vs incoming) |
| `message.text` ou `message.content` | `content` |
| `message.fileURL` | `media_url` |
| `message.mediaType` | `media_type` (normalizado) |
| `message.messageTimestamp` | `created_at` (converter de ms para ISO 8601) |
| `chat.wa_contactName` ou `message.senderName` | Nome do contato |

**4. Normalizar Tipos de Mídia**

UAZAPI pode retornar variações de tipos. Normalizar para padrão interno:

```text
UAZAPI Input → Sistema Interno
"image" → "image"
"video" → "video"
"audio" → "audio"
"document", "pdf" → "document"
"text", "" → "text" (padrão)
```

**5. Processar Mensagens Enviadas Também**

O campo `fromMe: true` indica mensagens enviadas pelo celular/API. Deve-se:
- Processar tanto `fromMe: true` quanto `fromMe: false`
- Usar `direction: 'outgoing'` para `fromMe: true`
- Usar `direction: 'incoming'` para `fromMe: false`

Isso permite que conversas saibam quando mensagens foram enviadas pelo celular do usuário.

**6. Melhorias de Logging e Resiliência**

- Log detalhado da resposta da UAZAPI (primeiros 500 chars)
- Log do tipo de mídia recebido
- Log de sucesso/erro na inserção de mensagens
- Verificação de `external_id` duplicado antes de inserir

---

## Parte 2: Configurar n8n para Encaminhar o Webhook

### Passos no n8n

1. **Obter o webhook recebido** (já está funcionando em `https://flux.wsmart.com.br/webhook/medix`)

2. **Adicionar nó HTTP Request** no fluxo n8n:
   - **Method**: POST
   - **URL**: `https://tjuokxdkimrtyqsbzskj.supabase.co/functions/v1/whatsapp-webhook`
   - **Body**: Encaminhar o payload original recebido da UAZAPI
   - **Headers**: `Content-Type: application/json`

3. **Estrutura do Fluxo n8n**:
   ```
   Webhook UAZAPI (entrada)
        ↓
   Body (processa o JSON)
        ↓
   HTTP Request (POST para Lovable)
        ↓
   Return (responde ao n8n)
   ```

4. **Payload Encaminhado**:
   O nó HTTP deve encaminhar todo o `body` recebido do webhook, sem modificações:
   ```json
   {
     "EventType": "messages",
     "instanceName": "motorac",
     "message": { ... },
     "chat": { ... }
   }
   ```

---

## Parte 3: Frontend - Suporte a Mídia (Já Implementado)

O `MessageBubble.tsx` já suporta:
- ✅ Imagem (`media_type === 'image'`)
- ✅ Vídeo (`media_type === 'video'`)
- ✅ Áudio (`media_type === 'audio'`)

O `ChatPanel.tsx` já tem Realtime configurado, então novas mensagens aparecerão automaticamente após a inserção no banco.

---

## Arquivos a Modificar

### 1. `supabase/functions/whatsapp-webhook/index.ts`
- Reescrever parser para aceitar formato UAZAPI V2
- Normalizar tipos de mídia
- Extrair corretamente campos de mensagem e contato
- Suportar mensagens enviadas (`fromMe: true`)
- Melhorar logging e tratamento de erros

**Estimativa**: ~200 linhas de código (atualmente tem ~200, será reorganizado)

### 2. n8n (Manual - Fora do Lovable)
- Adicionar nó HTTP Request no fluxo existente
- Configurar para encaminhar ao webhook do Lovable
- Testar com mensagem de teste

---

## Fluxo de Funcionamento Após Implementação

```
1. UAZAPI envia webhook para n8n
   ↓
2. n8n recebe em https://flux.wsmart.com.br/webhook/medix
   ↓
3. nó HTTP Request encaminha para Lovable:
   POST https://tjuokxdkimrtyqsbzskj.supabase.co/functions/v1/whatsapp-webhook
   ↓
4. Webhook insere em conversation_messages
   ↓
5. Supabase Realtime notifica ChatPanel
   ↓
6. Mensagem aparece automaticamente no chat (sem clicar em sync)
```

---

## Detalhes da Implementação do Webhook

### Estrutura do Código

```text
1. Validar EventType (deve ser "messages")
2. Extrair instanceName e validar instância no banco
3. Extrair dados de message e chat
4. Normalizar campos UAZAPI → Schema local
5. Upsert contato (jid, phone, name)
6. Find ou create conversa
7. Verificar duplicate external_id
8. Inserir message
9. Atualizar conversation.last_message_at
10. Log de sucesso
```

### Tratamento de Tipos de Mídia

```typescript
const mediaType = normalizeMediaType(message.mediaType);
const mediaUrl = message.fileURL || '';
const content = message.text || message.content || message.caption || '';

// Para mídia, extrair conteúdo de caption/text
if (mediaType !== 'text' && content === '' && message.fileName) {
  content = message.fileName; // Usar nome do arquivo como fallback
}
```

### Deduplicação

```typescript
// Verificar se external_id já existe
const { data: existingMsg } = await supabase
  .from('conversation_messages')
  .select('id')
  .eq('external_id', externalId)
  .maybeSingle();

if (existingMsg) {
  return { ok: true, skipped: true, reason: 'duplicate' };
}
```

---

## Próximos Passos Após Implementação

1. ✅ Reescrever webhook (Lovable faz)
2. 🔧 Configurar HTTP Request no n8n (Usuário faz - instruções fornecidas)
3. 🧪 Testar com mensagem de texto
4. 🧪 Testar com imagem/áudio/vídeo
5. ✅ Verificar se mensagens aparecem instantaneamente

---

## Documentação para o Usuário (n8n)

Após a implementação do webhook, você será guiado para:

1. Abrir seu fluxo n8n que recebe em `/webhook/medix`
2. Adicionar um nó **HTTP Request** após o webhook trigger
3. Configurar:
   - **URL**: `https://tjuokxdkimrtyqsbzskj.supabase.co/functions/v1/whatsapp-webhook`
   - **Method**: POST
   - **Headers**: `Content-Type: application/json`
   - **Body**: `{{ $json }}` (encaminhar payload original)
4. Salvar e testar

