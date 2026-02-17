

# Garantir compatibilidade entre payload enviado e recebido no fluxo de IA

## Problema

O payload enviado pelo botao "Ativar IA" usa os campos `instance_name` e `instance_id` (com underscore), mas o webhook handler procura por `instanceName` ou `instance` (sem underscore). Quando o sistema externo devolve o payload com `status_ia: "ligada"`, o webhook nao consegue encontrar a instancia.

## Alteracoes

### 1. `supabase/functions/whatsapp-webhook/index.ts` - ampliar busca de instancia (linha 115)

Incluir os campos `instance_name` e `instance_id` na logica de busca da instancia no bloco de `status_ia`:

```
const iaInstanceName = payload.instanceName || payload.instance || payload.instance_name ||
  unwrapped?.instanceName || unwrapped?.instance || unwrapped?.instance_name || ''
const iaInstanceId = payload.instance_id || unwrapped?.instance_id || ''
```

E usar `iaInstanceId` como primeiro criterio de busca (match direto pelo ID), caindo para busca por nome apenas se nao houver ID.

### 2. `src/components/helpdesk/ChatPanel.tsx` - adicionar `instanceName` ao payload (linha 185-201)

Adicionar o campo `instanceName` (sem underscore) ao payload de saida, para manter compatibilidade direta com o webhook handler caso o sistema externo devolva os campos como recebeu:

```
instanceName: instanceData?.name || '',
```

## Resultado

O sistema externo pode devolver qualquer combinacao dos campos (`instanceName`, `instance_name`, `instance_id`, `remotejid`, `chatid`, `sender`) e o webhook vai conseguir localizar a instancia, inbox, contato e conversa para atualizar o `status_ia` e exibir o badge "IA Ativada".

## Arquivos afetados

- `supabase/functions/whatsapp-webhook/index.ts` - ampliar campos aceitos na busca de instancia
- `src/components/helpdesk/ChatPanel.tsx` - adicionar `instanceName` ao payload

