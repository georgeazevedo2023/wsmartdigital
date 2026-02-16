

# Corrigir hora cortada na lista de conversas

## Problema

O componente `ScrollArea` do Radix reserva `w-2.5` (10px) para a barra de rolagem vertical, que se sobrepoe ao conteudo. Combinado com o `overflow-hidden` no container raiz, o timestamp no lado direito de cada conversa fica cortado. Aumentar apenas o padding do item nao resolve porque o proprio container esta limitando a area visivel.

## Solucao

Duas alteracoes complementares:

### 1. `src/components/helpdesk/ConversationList.tsx`
Adicionar `pr-2.5` ao `ScrollArea` para compensar o espaco da barra de rolagem:

```
<ScrollArea className="flex-1 pr-2.5">
```

### 2. `src/components/helpdesk/ConversationItem.tsx`
Manter o padding assimetrico atual (`pl-4 pr-5`) que ja esta aplicado. Se necessario apos o teste, pode ser ajustado.

## Arquivos afetados

- `src/components/helpdesk/ConversationList.tsx` - adicionar padding direito ao ScrollArea

