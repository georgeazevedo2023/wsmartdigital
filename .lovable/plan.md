

# Diagnosticar e Corrigir Broadcast Realtime

## Diagnostico

O webhook envia o broadcast com status 202 (aceito pelo servidor), mas o frontend nao recebe. Ha dois problemas:

### 1. Canal duplicado e desconectado
- O `ChatPanel` cria o canal `helpdesk-realtime` e o `HelpDesk` cria `helpdesk-list` -- canais diferentes
- O webhook so envia para `helpdesk-realtime`, entao o `HelpDesk` nunca recebe
- Pior: ambos os componentes se inscrevem/desinscrevem independentemente, podendo causar desconexoes

### 2. Sem verificacao de conexao
- Nao ha nenhum log ou callback para confirmar se a subscription WebSocket esta realmente conectada
- O `subscribe()` e assincrono mas nao estamos verificando o status

## Solucao

### Arquivo: `src/components/helpdesk/ChatPanel.tsx`

Adicionar log de status na subscription e garantir que o canal conecte corretamente:

```typescript
const channel = supabase
  .channel('helpdesk-realtime')
  .on('broadcast', { event: 'new-message' }, (payload) => {
    console.log('[ChatPanel] broadcast received:', payload.payload?.conversation_id);
    if (payload.payload?.conversation_id === conversation.id) {
      fetchMessages();
    }
  })
  .subscribe((status) => {
    console.log('[ChatPanel] channel status:', status);
  });
```

### Arquivo: `src/pages/dashboard/HelpDesk.tsx`

Trocar o canal `helpdesk-list` para `helpdesk-conversations` (nome unico para nao conflitar) e TAMBEM ouvir no canal correto. Ou melhor: o webhook precisa enviar para ambos os topicos, ou ambos os componentes ouvem no mesmo canal.

**Melhor abordagem**: Usar um unico canal compartilhado. O HelpDesk e o componente pai, entao ele deve gerenciar o canal e passar os eventos para o ChatPanel. Porem, para manter simplicidade, vamos fazer o webhook enviar para DOIS topicos -- um para o chat e outro para a lista.

**Abordagem final escolhida**: O webhook envia broadcast para UM topico (`helpdesk-realtime`). Ambos os componentes se inscrevem nesse MESMO topico mas com nomes de canal DIFERENTES (o Supabase permite multiplos canais no mesmo topico usando o parametro `config`):

Na verdade, no Supabase, o nome do canal E o topico. Entao precisamos de uma das seguintes:
- Opcao A: Webhook envia para 2 topicos
- Opcao B: Ambos usam o mesmo nome de canal

**Opcao B** e mais simples mas causa conflito -- ao remover o canal em um componente, remove no outro.

**Opcao A** e mais segura:

### Webhook: enviar para 2 topicos

```typescript
const topics = ['helpdesk-realtime', 'helpdesk-conversations'];
const broadcastPromises = topics.map(topic =>
  fetch(`${Deno.env.get('SUPABASE_URL')}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')!}`,
    },
    body: JSON.stringify({
      messages: [{ topic, event: 'new-message', payload: { ... } }],
    }),
  })
);
await Promise.all(broadcastPromises);
```

### HelpDesk.tsx: trocar `helpdesk-list` por `helpdesk-conversations`

### ChatPanel.tsx: manter `helpdesk-realtime` + adicionar log

### Adicionar logs de debug em ambos os componentes

Para finalmente diagnosticar se o WebSocket conecta, adicionar `subscribe((status) => console.log(...))` em ambos.

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/whatsapp-webhook/index.ts` | Enviar broadcast para 2 topicos |
| `src/components/helpdesk/ChatPanel.tsx` | Adicionar log de status na subscription |
| `src/pages/dashboard/HelpDesk.tsx` | Trocar canal para `helpdesk-conversations` + log de status |

## Resultado Esperado

1. Logs no console mostrando se a conexao WebSocket esta ativa
2. Mensagens chegando em tempo real tanto no chat quanto na lista de conversas
3. Se ainda nao funcionar, os logs vao nos dizer exatamente onde o problema esta

