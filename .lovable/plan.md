

# Adicionar Campo de Webhook URL na Caixa de Entrada

## Contexto

Sim, o sistema precisa de um webhook do n8n (ou direto da UAZAPI) para receber mensagens no HelpDesk. Atualmente, o webhook endpoint e a edge function `whatsapp-webhook`, que recebe os eventos, identifica a instancia pelo `instanceName` no payload e roteia para a inbox correta.

O campo de webhook URL na inbox serve para o admin registrar/visualizar a URL do n8n que deve ser configurada na UAZAPI para aquela instancia, facilitando o gerenciamento.

## Alteracoes

### 1. Migracacao do Banco de Dados

Adicionar coluna `webhook_url` (texto, nullable) na tabela `inboxes`:

```text
ALTER TABLE public.inboxes ADD COLUMN webhook_url text;
```

### 2. Formulario de Criacao (`InboxManagement.tsx`)

Adicionar campo "Webhook URL (n8n)" no dialog de criacao, abaixo do seletor de instancia:

- Label: "Webhook URL (n8n)"
- Placeholder: "https://seu-n8n.com/webhook/..."
- Campo opcional
- Incluir texto de ajuda explicando que esta URL deve ser configurada no n8n para receber mensagens desta instancia

### 3. Card da Inbox

Exibir a webhook URL configurada no card da inbox (truncada), com botao de copiar para facilitar o uso.

## Secao Tecnica

### Estado adicional no componente

```text
const [webhookUrl, setWebhookUrl] = useState('');
```

### Campo no formulario (apos o Select de instancia)

```text
<div className="space-y-2">
  <Label>Webhook URL (n8n)</Label>
  <Input
    placeholder="https://seu-n8n.com/webhook/..."
    value={webhookUrl}
    onChange={(e) => setWebhookUrl(e.target.value)}
  />
  <p className="text-xs text-muted-foreground">
    URL do webhook do n8n que encaminha mensagens da UAZAPI para o HelpDesk
  </p>
</div>
```

### Insert atualizado

```text
await supabase.from('inboxes').insert({
  name: newName.trim(),
  instance_id: selectedInstanceId,
  created_by: user!.id,
  webhook_url: webhookUrl.trim() || null,
});
```

### Exibicao no card

Adicionar linha com icone `Link` mostrando a URL truncada e botao de copiar ao lado, visivel apenas quando `webhook_url` estiver preenchido.

### Arquivos modificados:
- **Migracao SQL**: Adicionar coluna `webhook_url` na tabela `inboxes`
- **`src/pages/dashboard/InboxManagement.tsx`**: Campo no dialog de criacao + exibicao no card

