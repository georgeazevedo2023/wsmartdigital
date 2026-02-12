
# Corrigir Auto-Scroll para Ultima Mensagem no Chat

## Problema

O `bottomRef.current?.scrollIntoView()` nao funciona corretamente porque o `ScrollArea` do Radix cria um viewport interno. O `scrollIntoView` tenta rolar o documento principal, nao o container de scroll do Radix.

## Solucao

Substituir o `ScrollArea` por uma `div` com `overflow-y: auto` simples, onde o `scrollIntoView` funciona nativamente. Isso elimina o problema do viewport interno do Radix.

## Mudancas no arquivo `src/components/helpdesk/ChatPanel.tsx`

1. Remover o import do `ScrollArea`
2. Substituir `<ScrollArea className="flex-1 p-4">` por `<div className="flex-1 overflow-y-auto p-4">`
3. Adicionar um pequeno `setTimeout` no auto-scroll para garantir que o DOM esta atualizado apos carregar mensagens (especialmente imagens que alteram altura)

### Codigo do auto-scroll atualizado

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, 100);
  return () => clearTimeout(timer);
}, [messages]);
```

### Substituicao do ScrollArea

De:
```tsx
<ScrollArea className="flex-1 p-4">
  ...
</ScrollArea>
```

Para:
```tsx
<div className="flex-1 overflow-y-auto p-4">
  ...
</div>
```

## Resultado

- Scroll automatico para a ultima mensagem ao abrir conversa
- Scroll automatico ao receber nova mensagem via realtime
- Funciona em todas as telas (mobile e desktop)
