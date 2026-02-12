
# Adicionar Envio de Audio no Helpdesk

## Resumo

Adicionar um botao de microfone no ChatInput do Helpdesk que permite gravar audio diretamente do navegador e enviar como mensagem de voz (PTT) para o contato via UAZAPI.

## O que muda para o usuario

- Um botao de microfone aparece ao lado do campo de texto no chat
- Ao clicar e segurar (ou clicar para iniciar/parar), o audio e gravado
- Durante a gravacao, aparece um indicador visual com tempo decorrido e botao para cancelar
- Ao finalizar, o audio e enviado como mensagem de voz (PTT) no WhatsApp
- O audio aparece no chat com o player customizado ja existente

## Mudancas Tecnicas

### 1. Novo action `send-audio` no proxy (`supabase/functions/uazapi-proxy/index.ts`)

Adicionar um novo case `send-audio` que usa o endpoint `/send/media` da UAZAPI com:
- `number`: JID do contato
- `type`: `"audio"`
- `file`: audio em base64
- `ptt`: `true` (para enviar como mensagem de voz nativa)

### 2. Atualizar `ChatInput.tsx` (`src/components/helpdesk/ChatInput.tsx`)

- Adicionar estado para controle de gravacao (`isRecording`, `mediaRecorder`, `recordingTime`)
- Usar a API `MediaRecorder` do navegador para capturar audio do microfone
- Formato de saida: `audio/webm` ou `audio/ogg` (compativel com WhatsApp)
- Converter o blob gravado para base64 antes de enviar
- UI durante gravacao: indicador vermelho pulsante, timer, botao cancelar (X) e botao enviar
- Ao enviar: chamar o proxy com action `send-audio`, salvar na tabela `conversation_messages` com `media_type: 'audio'`

### 3. Fluxo de gravacao

```text
[Microfone] --> clique --> inicia gravacao
                          |
                          v
              [Indicador vermelho + timer]
              [Botao X cancelar] [Botao enviar]
                          |
                     clique enviar
                          |
                          v
              blob -> base64 -> proxy -> UAZAPI /send/media
                                         (type=audio, ptt=true)
                          |
                          v
              salvar em conversation_messages
              (direction=outgoing, media_type=audio)
```

### Arquivos Modificados
- `supabase/functions/uazapi-proxy/index.ts` - novo case `send-audio`
- `src/components/helpdesk/ChatInput.tsx` - UI de gravacao e envio de audio
