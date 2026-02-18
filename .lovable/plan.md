
# Bug Fix: Limpar conversa ao trocar de caixa de entrada

## Diagnóstico

No `HelpDesk.tsx`, o seletor de caixa chama diretamente `setSelectedInboxId`:

```tsx
<Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
```

Quando o valor muda, `fetchConversations()` é chamado (via `useEffect` que depende de `selectedInboxId`), mas o `selectedConversation` **nunca é resetado para `null`**.

Resultado: o chat panel continua mostrando a conversa da caixa anterior, mesmo que ela não pertença à nova caixa selecionada.

## Solução

Criar um handler intermediário `handleInboxChange` que:
1. Limpa `selectedConversation` → `null`
2. Chama `setSelectedInboxId` com o novo valor
3. No mobile, volta para a view de lista (`setMobileView('list')`)
4. Limpa filtros secundários que são específicos da caixa (label filter)

## Arquivo a modificar

### `src/pages/dashboard/HelpDesk.tsx`

**1. Adicionar o handler `handleInboxChange` após o `handleAgentAssigned`:**

```tsx
const handleInboxChange = (newInboxId: string) => {
  setSelectedConversation(null);
  setLabelFilter(null);
  setSelectedInboxId(newInboxId);
  if (isMobile) setMobileView('list');
};
```

**2. Atualizar o `<Select>` do seletor de caixa para usar o novo handler:**

```tsx
<Select value={selectedInboxId} onValueChange={handleInboxChange}>
```

## Impacto

- Sem mudanças de banco de dados
- Sem mudanças de UI
- Correção cirúrgica: apenas 1 handler novo + 1 referência atualizada
- Resolve o bug no mobile e desktop
