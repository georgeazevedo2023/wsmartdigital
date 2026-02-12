
# Corrigir Envio de Audio no Helpdesk

## Problema Identificado

O ChatInput envia o token da instancia com a chave `instanceToken` no body da requisicao:
```json
{ "action": "send-audio", "instanceToken": "xxx", "jid": "...", "audio": "..." }
```

Porem, o proxy na linha 41 faz destructuring de `token` (nao `instanceToken`):
```javascript
const { action, instanceName, token: instanceToken, groupjid } = body
```

Resultado: a variavel `instanceToken` fica `undefined`, a validacao `!instanceToken` retorna `true` na linha 672 e o proxy retorna 400 **antes** de qualquer `console.log`, por isso nao ha logs.

Alem disso, a UAZAPI pode rejeitar audio em formato WebM. O formato mais compativel e OGG com codec Opus.

## Correcoes

### 1. Proxy (`supabase/functions/uazapi-proxy/index.ts`)

- Na linha 41, extrair tambem `instanceToken` do body como fallback:
  ```javascript
  const { action, instanceName, token: bodyToken, groupjid, instanceToken: altToken } = body
  const instanceToken = bodyToken || altToken
  ```
  Isso garante compatibilidade com ambos os formatos de payload sem quebrar os outros cases.

- Adicionar log antes da validacao no case `send-audio` para facilitar debug futuro.

### 2. ChatInput (`src/components/helpdesk/ChatInput.tsx`)

- Priorizar formato `audio/ogg;codecs=opus` na selecao do mimeType (mais compativel com WhatsApp).
- Incluir a data URI prefix no base64 (`data:audio/ogg;base64,...`) para que o proxy possa detectar e limpar o prefixo corretamente, seguindo o mesmo padrao do `send-media`.

## Arquivos Modificados
- `supabase/functions/uazapi-proxy/index.ts` - corrigir extracao do token do body
- `src/components/helpdesk/ChatInput.tsx` - ajustar formato de audio preferido
