
# Corrigir Envio de Audio PTT no Helpdesk

## Problema Raiz

O codigo existente no projeto ja revela a resposta: no arquivo `process-scheduled-messages/index.ts`, a UAZAPI possui endpoints dedicados por tipo de midia:

```text
/send/image
/send/video
/send/audio
/send/ptt     <-- endpoint correto para mensagens de voz
/send/document
```

O codigo atual do `send-audio` esta usando `/send/media` (endpoint generico) com `type: 'audio'` e `file: base64`. Embora a UAZAPI retorne 200, a mensagem nao e entregue porque:

1. O endpoint `/send/media` pode nao processar PTT corretamente
2. O campo `file` com base64 puro pode nao ser reconhecido (a UAZAPI pode esperar `url` ou base64 com prefixo data URI)
3. O formato WebM gravado pelo navegador Chrome pode nao ser compativel

## Solucao

### 1. Proxy (`supabase/functions/uazapi-proxy/index.ts`)

Alterar o case `send-audio` para:

- Usar o endpoint dedicado `/send/ptt` em vez de `/send/media`
- Enviar o base64 com o prefixo data URI completo no campo `file` (ex: `data:audio/ogg;base64,...`), pois a UAZAPI pode precisar detectar o tipo pelo prefixo
- Remover o `type` e `ptt` do body (o endpoint `/send/ptt` ja implica isso)
- Adicionar log da resposta raw para debug futuro

Payload corrigido:
```json
{
  "number": "5581999999999@s.whatsapp.net",
  "file": "data:audio/ogg;base64,SGVsbG8..."
}
```

### 2. ChatInput (`src/components/helpdesk/ChatInput.tsx`)

- Garantir que o base64 enviado mantenha o prefixo data URI (ja foi corrigido na versao anterior)
- Nenhuma mudanca adicional necessaria se o prefixo ja esta sendo mantido

## Arquivos Modificados
- `supabase/functions/uazapi-proxy/index.ts` - mudar endpoint para `/send/ptt` e ajustar payload
