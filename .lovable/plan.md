

# Corrigir exibicao do nome do agente acima das mensagens

## Problema

O `agentNamesMap` e construido buscando apenas agentes da tabela `inbox_users` para a inbox atual. Porem, o usuario que enviou as mensagens (George Azevedo - `66de650f`) nao esta registrado em `inbox_users` para essa inbox (so existe `da5946b2`). Por isso, o lookup `agentNamesMap[message.sender_id]` retorna `undefined` e o nome nao aparece.

## Solucao

Alterar a funcao `fetchAgentNames` em `HelpDesk.tsx` para buscar nomes de TODOS os `sender_id` presentes nas mensagens, nao apenas os agentes cadastrados na inbox. Isso garante que qualquer agente que tenha enviado uma mensagem tera seu nome exibido.

## Alteracoes

### `src/pages/dashboard/HelpDesk.tsx`

Modificar `fetchAgentNames` para fazer duas buscas complementares:

1. Manter a busca atual de `inbox_users` (para o seletor de atribuicao)
2. Adicionar uma busca em `conversation_messages` para coletar todos os `sender_id` unicos, e entao buscar os nomes correspondentes em `user_profiles`
3. Mesclar os dois resultados no `agentNamesMap`

Logica atualizada:

```typescript
const fetchAgentNames = useCallback(async () => {
  if (!selectedInboxId) return;
  const map: Record<string, string> = {};

  // 1. Buscar agentes da inbox
  const { data: inboxData } = await supabase
    .from('inbox_users')
    .select('user_id, user_profiles(full_name)')
    .eq('inbox_id', selectedInboxId);
  if (inboxData) {
    inboxData.forEach((d: any) => {
      if (d.user_id && d.user_profiles?.full_name) {
        map[d.user_id] = d.user_profiles.full_name;
      }
    });
  }

  // 2. Buscar sender_ids das mensagens que ainda nao estao no mapa
  const { data: senderData } = await supabase
    .from('conversation_messages')
    .select('sender_id')
    .not('sender_id', 'is', null)
    .eq('conversation_id', selectedConversation?.id) // se houver conversa selecionada
    // Alternativa: buscar por todas as conversas da inbox
  
  // Coletar IDs unicos que nao estao no mapa
  const missingIds = [...new Set(
    (senderData || []).map(s => s.sender_id).filter(id => id && !map[id])
  )];

  if (missingIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', missingIds);
    profiles?.forEach(p => {
      if (p.full_name) map[p.id] = p.full_name;
    });
  }

  setAgentNamesMap(map);
}, [selectedInboxId]);
```

**Abordagem mais simples (alternativa preferida)**: Em vez de buscar por conversa, buscar TODOS os perfis de usuario que possuam `sender_id` nas mensagens da inbox. Porem, como isso pode ser custoso, a abordagem mais pratica e:

- Buscar os `sender_id` distintos das mensagens da conversa selecionada dentro do `ChatPanel` e complementar o mapa la
- OU alterar o `fetchAgentNames` para buscar todos os `user_profiles` existentes (tabela pequena) e usar como mapa global

### Abordagem final escolhida

Alterar `fetchAgentNames` para buscar TODOS os registros de `user_profiles` (que e uma tabela pequena de agentes/admins) e montar o mapa completo. Isso e simples e cobre todos os casos:

```typescript
const fetchAgentNames = useCallback(async () => {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, full_name');
  if (data) {
    const map: Record<string, string> = {};
    data.forEach(p => {
      if (p.full_name) map[p.id] = p.full_name;
    });
    setAgentNamesMap(map);
  }
}, []);
```

Isso remove a dependencia de `selectedInboxId` e garante que qualquer agente que tenha enviado mensagens tera seu nome resolvido corretamente.

### Arquivo afetado
- `src/pages/dashboard/HelpDesk.tsx` - apenas a funcao `fetchAgentNames` (~linhas 150-165)

Nenhuma migracao necessaria.
