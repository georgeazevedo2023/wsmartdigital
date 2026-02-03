
# Adicionar Envios de Leads ao Histórico

## Problema Atual
Os envios feitos pelo **Disparador de Leads** não estão sendo salvos na tabela `broadcast_logs`, por isso não aparecem na página de Histórico de Envios. Apenas os envios para grupos (via `BroadcastMessageForm`) são registrados.

---

## Solução

### 1. Adicionar função de log no LeadMessageForm

**Arquivo:** `src/components/broadcast/LeadMessageForm.tsx`

Adicionar uma função `saveBroadcastLog` similar à do `BroadcastMessageForm`, adaptada para o contexto de leads:

```typescript
const saveBroadcastLog = async (params: {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  recipientsTargeted: number;
  recipientsSuccess: number;
  recipientsFailed: number;
  status: 'completed' | 'cancelled' | 'error';
  startedAt: number;
  errorMessage?: string;
  leadNames: string[];
}) => {
  try {
    const session = await supabase.auth.getSession();
    if (!session.data.session) return;

    const completedAt = Date.now();
    const durationSeconds = Math.round((completedAt - params.startedAt) / 1000);

    await supabase.from('broadcast_logs').insert({
      user_id: session.data.session.user.id,
      instance_id: instance.id,
      instance_name: instance.name,
      message_type: params.messageType,
      content: params.content,
      media_url: params.mediaUrl,
      groups_targeted: 0, // 0 indica envio para leads, não grupos
      recipients_targeted: params.recipientsTargeted,
      recipients_success: params.recipientsSuccess,
      recipients_failed: params.recipientsFailed,
      exclude_admins: false,
      random_delay: randomDelay,
      status: params.status,
      started_at: new Date(params.startedAt).toISOString(),
      completed_at: new Date(completedAt).toISOString(),
      duration_seconds: durationSeconds,
      error_message: params.errorMessage || null,
      group_names: params.leadNames, // Nomes dos leads para referência
    });
  } catch (err) {
    console.error('Error saving broadcast log:', err);
  }
};
```

### 2. Chamar a função após os envios

Modificar `handleSendText` e `handleSendMedia` para salvar o log ao final:

```typescript
// Ao final de handleSendText (após o loop de envio):
const leadNames = selectedLeads.slice(0, 10).map(l => l.name || l.phone);
await saveBroadcastLog({
  messageType: 'text',
  content: message.trim(),
  mediaUrl: null,
  recipientsTargeted: selectedLeads.length,
  recipientsSuccess: successCount,
  recipientsFailed: failCount,
  status: isCancelledRef.current ? 'cancelled' : (failCount > 0 ? 'error' : 'completed'),
  startedAt,
  leadNames,
});
```

```typescript
// Ao final de handleSendMedia:
const actualMediaType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType;
const leadNames = selectedLeads.slice(0, 10).map(l => l.name || l.phone);
await saveBroadcastLog({
  messageType: actualMediaType,
  content: caption || null,
  mediaUrl: mediaUrl || null, // Não salvar base64, apenas URL se houver
  recipientsTargeted: selectedLeads.length,
  recipientsSuccess: successCount,
  recipientsFailed: failCount,
  status: isCancelledRef.current ? 'cancelled' : (failCount > 0 ? 'error' : 'completed'),
  startedAt,
  leadNames,
});
```

### 3. Atualizar exibição no histórico para distinguir envios

**Arquivo:** `src/components/broadcast/BroadcastHistory.tsx`

Adicionar indicador visual para diferenciar envios de grupos vs leads:

```typescript
// Na renderização de cada log, verificar se groups_targeted === 0
{log.groups_targeted === 0 ? (
  <Badge variant="outline" className="text-xs">
    <User className="w-3 h-3 mr-1" />
    Leads
  </Badge>
) : (
  <Badge variant="outline" className="text-xs">
    <Users className="w-3 h-3 mr-1" />
    {log.groups_targeted} grupo{log.groups_targeted !== 1 ? 's' : ''}
  </Badge>
)}
```

Também atualizar o label onde mostra "Grupos" para ser dinâmico:

- Se `groups_targeted > 0`: mostrar "X grupo(s)"
- Se `groups_targeted === 0`: mostrar "Leads" e usar `group_names` como lista de contatos

### 4. Adicionar filtro por tipo de envio (opcional)

Adicionar um novo filtro no histórico para filtrar por tipo:

```typescript
type TargetFilter = 'all' | 'groups' | 'leads';

// No dropdown de filtros:
<Select value={targetFilter} onValueChange={(v) => setTargetFilter(v as TargetFilter)}>
  <SelectTrigger className="w-[140px] h-8 text-sm">
    <SelectValue placeholder="Destino" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos</SelectItem>
    <SelectItem value="groups">Grupos</SelectItem>
    <SelectItem value="leads">Leads</SelectItem>
  </SelectContent>
</Select>
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/broadcast/LeadMessageForm.tsx` | Adicionar `saveBroadcastLog` e chamar após envios |
| `src/components/broadcast/BroadcastHistory.tsx` | Adicionar badge e filtro para distinguir leads vs grupos |

---

## Resultado Esperado

Após a implementação:
1. Envios para leads aparecerão no Histórico de Envios
2. Será possível identificar visualmente se o envio foi para grupos ou leads
3. O botão "Reenviar" funcionará normalmente para envios de leads
4. Filtro opcional permitirá ver apenas envios de grupos ou leads
