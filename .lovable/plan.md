
# Corrigir Auto-Scroll ao Selecionar Conversa

## Problema

O auto-scroll depende de `[messages]` como dependencia do `useEffect`, mas quando o estado `loading` muda de `true` para `false`, o spinner e substituido pelas mensagens no DOM. O timeout de 100ms pode nao ser suficiente para o React renderizar todas as mensagens antes de executar o `scrollIntoView`. Alem disso, ao reselecionar a mesma conversa, a referencia de `messages` pode nao mudar.

## Solucao

Duas mudancas no `src/components/helpdesk/ChatPanel.tsx`:

1. Adicionar `loading` como dependencia do `useEffect` de auto-scroll, para que ele dispare quando o loading termina (loading muda de true para false)
2. Usar `behavior: 'instant'` em vez de `'smooth'` na primeira carga (quando vem do loading), para garantir que o usuario ja veja a ultima mensagem sem animacao que pode ser interrompida
3. Aumentar o timeout para 150ms para dar mais tempo ao DOM

### Mudanca no codigo

De:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, 100);
  return () => clearTimeout(timer);
}, [messages]);
```

Para:
```typescript
useEffect(() => {
  if (loading) return;
  const timer = setTimeout(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, 150);
  return () => clearTimeout(timer);
}, [messages, loading]);
```

Usar `'instant'` garante que ao abrir a conversa o scroll vai direto para o fim sem animacao (que pode ser cortada). Para novas mensagens via realtime, o scroll tambem sera instantaneo, o que e aceitavel.

## Resultado

- Ao clicar em qualquer conversa da lista, o chat sempre mostra a ultima mensagem
- Funciona mesmo com imagens e midia na conversa
