

# Botao "Ativar IA" no cabecalho do chat

## Resumo

Adicionar um botao "Ativar IA" no cabecalho do chat que envia um webhook para ativar a IA do agente n8n. Quando o webhook do n8n retornar mensagens com `status_ia="ligada"`, o botao sera substituido por um indicador verde "IA Ativada".

## Como vai funcionar

1. O usuario clica em "Ativar IA" no cabecalho do chat
2. O sistema envia um POST para `https://fluxwebhook.wsmart.com.br/webhook/receb_out_neo` com `status_ia=ligar` e dados do contato/conversa
3. Quando o n8n envia mensagens de volta com `status_ia="ligada"`, o botao muda para um badge verde "IA Ativada"

## Alteracoes tecnicas

### 1. `supabase/functions/whatsapp-webhook/index.ts`
- Detectar o campo `status_ia` no payload recebido (tanto no formato raw quanto no unwrapped)
- Quando `status_ia="ligada"`, incluir essa informacao no broadcast do realtime para o frontend
- Adicionar `status_ia` ao payload de broadcast

### 2. `src/components/helpdesk/ChatPanel.tsx`
- Adicionar estado `iaAtivada` (boolean) controlado por conversa
- Renderizar botao "Ativar IA" ou badge "IA Ativada" no cabecalho, ao lado do seletor de status
- Ao clicar "Ativar IA":
  - Fazer POST via edge function proxy (para evitar CORS) para o webhook do n8n com payload contendo `status_ia: "ligar"`, `chatid`, `phone` e `instanceId`
- Escutar eventos de broadcast com `status_ia="ligada"` para trocar o botao pelo badge verde
- Resetar o estado ao trocar de conversa

### 3. `supabase/functions/fire-outgoing-webhook/index.ts` (reutilizar como proxy)
- Ja existe uma edge function proxy para webhooks de saida que contorna CORS
- Vamos criar uma nova edge function simples `activate-ia` para enviar o POST ao webhook do n8n, ou reutilizar o proxy existente

### 4. Nova edge function `supabase/functions/activate-ia/index.ts`
- Recebe `chatid`, `phone`, `instanceId` do frontend
- Faz POST para `https://fluxwebhook.wsmart.com.br/webhook/receb_out_neo` com `status_ia: "ligar"` e os dados do contato
- Retorna sucesso/erro

## Arquivos afetados

- `supabase/functions/whatsapp-webhook/index.ts` - propagar `status_ia` no broadcast
- `supabase/functions/activate-ia/index.ts` - nova edge function para disparar webhook
- `src/components/helpdesk/ChatPanel.tsx` - botao/badge + logica de estado

