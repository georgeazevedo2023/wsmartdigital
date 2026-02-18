
# Bug Persistente: Conversa não limpa ao trocar de caixa

## Diagnóstico completo

O `handleInboxChange` foi implementado e está chamando `setSelectedConversation(null)` corretamente (linha 380). Porém, o bug persiste. A causa real foi identificada:

**O problema está no `useEffect` do `fetchConversations` (linha 244):**

```tsx
useEffect(() => {
  if (selectedInboxId) {
    fetchConversations();
  }
}, [user, statusFilter, selectedInboxId]);
```

O React agrupa (batches) os `setState` dentro de event handlers — mas `setSelectedConversation(null)` e `setSelectedInboxId(newInboxId)` são executados em sequência. O problema está em **quando** o `fetchConversations` resolve: ele é assíncrono e, após retornar, o `setConversations(mapped)` sobrescreve o estado — mas o `selectedConversation` já foi setado para `null`.

**A causa real identificada**: Olhando as screenshots, o Salomão Tavares aparece **na lista da nova caixa (Neo Blindados)** também — ou seja, o mesmo contato existe nas duas caixas. O `selectedConversation` fica `null` momentaneamente, mas há uma **race condition com o canal de realtime** (linha 250-296): quando `selectedInboxId` muda, o canal antigo ainda está ativo por um instante e pode disparar `setConversations` ou `setSelectedConversation` com dados da caixa anterior antes de ser removido.

**Segundo problema confirmado**: A função `fetchConversations` na linha 204 **não é `useCallback`** — ela é recriada a cada render. O `useEffect` do broadcast (linha 272) chama `fetchConversations()` dentro do handler, capturando a closure com o `selectedInboxId` antigo, o que pode causar busca na caixa errada momentaneamente.

## Solução — 3 correções cirúrgicas

### Correção 1: Adicionar `useEffect` de guarda (defensive reset)

Adicionar um `useEffect` que monitora `selectedInboxId` e força a limpeza da `selectedConversation` se ela não pertence à caixa atual:

```tsx
useEffect(() => {
  setSelectedConversation(prev => {
    if (prev && prev.inbox_id !== selectedInboxId) return null;
    return prev;
  });
}, [selectedInboxId]);
```

Isso garante que mesmo se houver race condition, a conversa errada seja descartada.

### Correção 2: Converter `fetchConversations` em `useCallback`

A função precisa de `useCallback` para que o `useEffect` do realtime sempre capture a versão correta com o `selectedInboxId` atual:

```tsx
const fetchConversations = useCallback(async () => {
  if (!user || !selectedInboxId) return;
  // ... resto do código
}, [user, selectedInboxId, statusFilter, fetchConversationLabels, fetchConversationNotes]);
```

E atualizar o `useEffect` que a chama:
```tsx
useEffect(() => {
  if (selectedInboxId) fetchConversations();
}, [fetchConversations]);
```

### Correção 3: Atualizar o `useEffect` do realtime para usar a versão correta

```tsx
useEffect(() => {
  // ... channel setup
  .on('broadcast', { event: 'new-message' }, (payload) => {
    // ...
    if (data?.inbox_id === selectedInboxId) {
      // ...
      fetchConversations(); // agora usa a closure correta via useCallback
    }
  })
}, [selectedInboxId, fetchConversations]);
```

## Arquivo a modificar

### `src/pages/dashboard/HelpDesk.tsx`

**Mudanças:**
1. Converter `fetchConversations` de função regular → `useCallback` com dependências corretas
2. Atualizar `useEffect` de carregamento para depender de `fetchConversations`
3. Adicionar `useEffect` de guarda que limpa `selectedConversation` ao trocar de caixa
4. Atualizar `useEffect` do realtime para incluir `fetchConversations` nas dependências

## Impacto

- Sem mudanças de banco de dados
- Sem mudanças de UI visível
- Elimina a race condition completamente
- Garante que a conversa sempre seja da caixa selecionada, mesmo em cenários de timing adverso
