
# Carrossel enviado nao aparece no HelpDesk

## Problema
Quando voce envia um carrossel (ou qualquer mensagem) pelo Disparador de Leads, a mensagem e enviada com sucesso pelo WhatsApp, mas **nao aparece no HelpDesk**. Isso acontece porque o Disparador salva apenas no historico de envios (`broadcast_logs`), sem criar o registro na tabela de mensagens do atendimento (`conversation_messages`).

## Solucao
Apos cada envio bem-sucedido pelo Disparador de Leads, o sistema vai automaticamente salvar a mensagem na conversa do HelpDesk, criando ou encontrando a conversa correspondente ao contato.

## O que sera feito

1. **Criar funcao auxiliar no `LeadMessageForm.tsx`** que, apos cada envio individual bem-sucedido, localiza (ou cria) a conversa do contato no HelpDesk e insere a mensagem na tabela `conversation_messages`.

2. **Integrar nos 3 fluxos de envio do Leads Broadcaster:**
   - Envio de texto (`handleSendText`)
   - Envio de midia (imagem/video/audio/documento)
   - Envio de carrossel (`handleSendCarousel`)

3. **Fazer o mesmo no `BroadcastMessageForm.tsx`** para mensagens enviadas diretamente a contatos (quando `excludeAdmins` esta ativo e envia para participantes individuais).

## Secao Tecnica

### Logica da funcao auxiliar

```text
saveToHelpdesk(contactJid, contactPhone, contactName, messageData)
  |
  +-> Buscar inbox vinculada a instancia selecionada
  +-> Buscar contato pelo JID (ou criar via upsert)
  +-> Buscar conversa aberta/pendente (ou criar nova)
  +-> Inserir em conversation_messages:
       - direction: 'outgoing'
       - content: texto da mensagem ou descricao do carrossel
       - media_type: 'text' | 'image' | 'carousel' etc.
       - media_url: se aplicavel
  +-> Atualizar last_message_at da conversa
  +-> Broadcast realtime para atualizar o HelpDesk em tempo real
```

### Arquivos modificados:
- `src/components/broadcast/LeadMessageForm.tsx` - Adicionar funcao `saveToHelpdesk` e chamar nos 3 handlers de envio
- `src/components/broadcast/BroadcastMessageForm.tsx` - Mesmo tratamento para envios a participantes individuais
