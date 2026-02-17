

# Adicionar status_ia="desligada" ao enviar mensagens pelo Helpdesk

## Resumo

Quando um agente envia qualquer mensagem (texto, audio, imagem ou documento) pelo Helpdesk, o sistema vai:
1. Incluir `status_ia: "desligada"` no payload do webhook de saida
2. Fazer broadcast de `status_ia: "desligada"` para o frontend
3. O botao "IA Ativada" (verde) volta a ser "Ativar IA" (botao clicavel)

O botao "Ativar IA" continua funcionando como antes: ao clicar, dispara `status_ia: "ligar"` para o webhook do n8n e aguarda o retorno com `status_ia: "ligada"` para trocar pelo badge verde.

## Alteracoes tecnicas

### 1. `src/components/helpdesk/ChatInput.tsx`
- Na funcao `fireOutgoingWebhook`, adicionar `status_ia: "desligada"` ao payload enviado ao webhook
- Nos broadcasts manuais (texto, audio, arquivo), incluir `status_ia: "desligada"` no payload do canal `helpdesk-realtime` para que o ChatPanel receba e resete o estado

### 2. `src/components/helpdesk/ChatPanel.tsx`
- No listener de broadcast, alem de detectar `status_ia === "ligada"`, tambem detectar `status_ia === "desligada"` e setar `iaAtivada = false`

## Detalhes de implementacao

### ChatInput.tsx - fireOutgoingWebhook (linha ~62-83)
Adicionar `status_ia: 'desligada'` no objeto payload, ao lado de `pausar_agente: 'sim'`.

### ChatInput.tsx - Broadcasts de texto (linha ~510-522), audio (linha ~276-288), arquivo (linha ~402-414)
Adicionar `status_ia: 'desligada'` em cada payload de broadcast no canal `helpdesk-realtime`.

### ChatPanel.tsx - Listener de broadcast (linha ~91-94)
Adicionar condicao: se `status_ia === 'desligada'`, setar `iaAtivada(false)`.

## Arquivos afetados

- `src/components/helpdesk/ChatInput.tsx` - adicionar status_ia nos payloads
- `src/components/helpdesk/ChatPanel.tsx` - detectar status_ia desligada no broadcast

