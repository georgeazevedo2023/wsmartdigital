

# Corrigir hora cortada na lista de conversas mobile

## Problema

O texto da hora (ex: "08:56", "13/02") no lado direito de cada conversa esta sendo cortado pela borda da tela. O componente ScrollArea reserva espaco para a barra de rolagem, reduzindo a area util e cortando o conteudo no limite direito.

## Solucao

Aumentar o padding direito do `ConversationItem` para compensar o espaco ocupado pelo ScrollArea, garantindo que a hora fique completamente visivel.

## Alteracao tecnica

### `src/components/helpdesk/ConversationItem.tsx`

Alterar o padding do botao principal de `px-4` para `pl-4 pr-5`, adicionando um pouco mais de espaco a direita para acomodar o texto da hora sem corte:

```
// De:
'w-full text-left px-4 py-3.5 ...'

// Para:
'w-full text-left pl-4 pr-5 py-3.5 ...'
```

## Arquivos afetados

- `src/components/helpdesk/ConversationItem.tsx` - ajustar padding direito

