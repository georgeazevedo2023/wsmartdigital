

# Webhook Outgoing para Caixas de Entrada

## Objetivo

Adicionar um campo de "Webhook Outgoing" em cada caixa de entrada. Quando um agente responder pelo Helpdesk, o sistema envia um POST para essa URL com os dados: `remotejid`, `fromMe: true`, nome e ID do agente, e `pausar_agente: "sim"`.

## Alteracoes

### 1. Migracao de banco de dados

Adicionar coluna `webhook_outgoing_url` na tabela `inboxes`:

```sql
ALTER TABLE public.inboxes ADD COLUMN webhook_outgoing_url text;
```

### 2. `src/pages/dashboard/InboxManagement.tsx`

- Adicionar estado e logica para editar/exibir o `webhook_outgoing_url` no card da inbox, similar ao `webhook_url` existente
- O campo sera exibido abaixo do webhook atual, com icone e label "Webhook Outgoing"
- Suportar edicao inline, copia e salvamento, seguindo o mesmo padrao visual do webhook existente
- Adicionar campo "Webhook Outgoing URL" no dialog de criacao de nova inbox

### 3. `src/components/helpdesk/ChatInput.tsx`

- Receber via props o `webhook_outgoing_url` da inbox atual (ou buscar da tabela `inboxes` ao enviar)
- Criar funcao `fireOutgoingWebhook` que faz POST (mode: "no-cors") para a URL configurada com o payload:

```json
{
  "remotejid": "5511999999999@s.whatsapp.net",
  "fromMe": true,
  "agent_name": "George Azevedo",
  "agent_id": "66de650f-...",
  "pausar_agente": "sim"
}
```

- Chamar `fireOutgoingWebhook` apos o envio bem-sucedido de texto, audio e arquivo (nos mesmos pontos onde `autoAssignAgent` e chamado, excluindo notas privadas)

### 4. Fluxo de dados

- `HelpDesk.tsx` ja busca a inbox selecionada; passar o `webhook_outgoing_url` para `ChatPanel` e depois para `ChatInput`
- Alternativamente, buscar direto no `ChatInput` usando `conversation.inbox_id` para simplificar

### Exemplo visual no card da inbox

```text
  ┌──────────────────────────────────────────────┐
  │  Neo Blindados - Geral              👥 1     │
  │  📱 NeoBlindados                             │
  │  Criada em 15/02/2026                        │
  │                                              │
  │  🔗 https://fluxwebhook.../neo_em_george     │  <- webhook (incoming)
  │  📤 https://fluxwebhook.../outgoing_neo      │  <- webhook outgoing (NOVO)
  │                                              │
  │  [       Gerenciar Membros       ]  🗑       │
  └──────────────────────────────────────────────┘
```

### Detalhes tecnicos

A funcao `fireOutgoingWebhook` no `ChatInput`:

```typescript
const fireOutgoingWebhook = async () => {
  const webhookUrl = conversation.inbox?.webhook_outgoing_url;
  if (!webhookUrl || !user) return;
  try {
    // Buscar nome do agente
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors',
      body: JSON.stringify({
        remotejid: conversation.contact?.jid,
        fromMe: true,
        agent_name: profile?.full_name || user.email,
        agent_id: user.id,
        pausar_agente: 'sim',
      }),
    });
  } catch (err) {
    console.error('Outgoing webhook error:', err);
  }
};
```

### Arquivos afetados
- Migracao SQL (nova coluna `webhook_outgoing_url`)
- `src/pages/dashboard/InboxManagement.tsx` - exibir/editar webhook outgoing no card
- `src/components/helpdesk/ChatInput.tsx` - disparar webhook ao enviar mensagem
- `src/pages/dashboard/HelpDesk.tsx` - incluir `webhook_outgoing_url` no select da inbox
- `src/components/helpdesk/ChatPanel.tsx` - passar prop adiante (se necessario)

