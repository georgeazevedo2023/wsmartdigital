

# Corrigir lista de conversas: mensagem nova, horario e nome do contato

## Problemas identificados

### 1. Mensagem "teste4" nao aparece na lista
O broadcast realtime atualiza o `last_message` da conversa existente, mas a lista nao e reordenada. A conversa atualizada permanece na mesma posicao visual em vez de subir para o topo.

### 2. Horario nao aparece na lista
A funcao `smartDateBR` esta sendo chamada corretamente, mas `isToday` e `isYesterday` do date-fns comparam com a data local do navegador. O problema e que `toZonedTime` cria um Date "falso" representando o horario de Brasilia, mas `isToday()` compara com `startOfDay(new Date())` que usa o timezone local. Se houver discrepancia, a funcao pode falhar silenciosamente. Alem disso, se `last_message_at` for `null`, nada e exibido.

### 3. Nome mudou de "George" para "Wsmart"
No webhook, linha 316: `contactName = chat?.wa_contactName || chat?.name || message.senderName || contactPhone`. Para mensagens **outgoing** (fromMe=true), o campo `senderName` contem o pushname da propria instancia ("Wsmart"), nao o nome do contato. Quando o webhook processa uma mensagem enviada e o contato ainda nao existe, ele cria o contato com o nome errado (o pushname da instancia).

---

## Alteracoes

### 1. Reordenar lista apos broadcast (`src/pages/dashboard/HelpDesk.tsx`)

No handler de broadcast (linhas 262-274), apos atualizar a conversa com a nova mensagem, reordenar o array por `last_message_at` decrescente para que a conversa atualizada suba para o topo:

```typescript
setConversations(prev => {
  const updated = prev.map(c =>
    c.id === data.conversation_id
      ? { ...c, last_message: data.content || mediaPreview(data.media_type) || c.last_message, last_message_at: data.created_at, is_read: false }
      : c
  );
  // Reordenar: conversa mais recente no topo
  return updated.sort((a, b) =>
    new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
  );
});
```

### 2. Corrigir `smartDateBR` (`src/lib/dateUtils.ts`)

O problema e que `isToday(zoned)` compara com o "hoje" do navegador. Precisamos comparar ambos os lados no mesmo timezone. A correcao e usar `toZonedTime` tambem para o "agora":

```typescript
export function smartDateBR(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zoned = toZonedTime(d, BRAZIL_TZ);
  const nowZoned = toZonedTime(new Date(), BRAZIL_TZ);

  const startOfToday = new Date(nowZoned.getFullYear(), nowZoned.getMonth(), nowZoned.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  if (zoned >= startOfToday) return formatInTimeZone(d, BRAZIL_TZ, 'HH:mm', { locale: ptBR });
  if (zoned >= startOfYesterday) return 'Ontem';
  return formatInTimeZone(d, BRAZIL_TZ, 'dd/MM', { locale: ptBR });
}
```

### 3. Corrigir nome do contato em mensagens outgoing (`supabase/functions/whatsapp-webhook/index.ts`)

Na linha 316, para mensagens outgoing (`fromMe=true`), `message.senderName` e o pushname da instancia, nao do contato. A correcao e nao usar `senderName` quando `fromMe=true`:

```typescript
const contactName = fromMe
  ? (chat?.wa_contactName || chat?.name || contactPhone)
  : (chat?.wa_contactName || chat?.name || message.senderName || contactPhone);
```

Isso evita que o pushname da instancia seja usado como nome do contato.

### 4. Corrigir nome existente no banco (query manual)

O contato "Wsmart" que ja foi salvo incorretamente precisa ser corrigido manualmente. Sera necessario verificar na tabela `contacts` qual registro teve o nome alterado e atualizar de volta para o nome correto.

---

## Arquivos afetados

- `src/pages/dashboard/HelpDesk.tsx` - reordenar lista apos broadcast
- `src/lib/dateUtils.ts` - corrigir comparacao de datas no timezone correto
- `supabase/functions/whatsapp-webhook/index.ts` - nao usar senderName para mensagens outgoing

