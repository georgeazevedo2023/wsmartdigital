
## Objetivo
Fazer com que os tooltips do sidebar (quando colapsado) apareçam sempre na frente dos demais elementos da UI, evitando que fiquem “por trás” de cards, popovers, dialogs, etc.

## Diagnóstico (por que está acontecendo)
Hoje o componente `TooltipContent` (`src/components/ui/tooltip.tsx`) renderiza o conteúdo diretamente no DOM onde o item do sidebar está. Isso pode falhar em duas situações comuns:

1. **Stacking context (contexto de empilhamento)**: algum elemento “por cima” (ex.: popover/dialog) cria um novo contexto (via `transform`, `filter`, `opacity`, `position + z-index`, etc.), e o tooltip fica preso “atrás” mesmo com `z-index` alto.
2. **Overflows/containers**: o tooltip pode ser “limitado” pelo container (mesmo sem parecer), e acaba visualmente atrás/recortado.

A solução padrão do Radix/shadcn para isso é renderizar o tooltip em **Portal** (no `body`), e então controlar o `z-index` com segurança.

## Mudanças propostas (sem alterar lógica do app, apenas UI/stacking)
### 1) Renderizar o TooltipContent dentro de um Portal
- Ajustar `src/components/ui/tooltip.tsx` para envolver o `<TooltipPrimitive.Content />` com:
  - `<TooltipPrimitive.Portal> ... </TooltipPrimitive.Portal>`

Isso garante que o tooltip saia da árvore do sidebar e não “dispute” stacking context com elementos locais.

### 2) Aumentar o z-index do tooltip para um valor bem alto
- Trocar de `z-[100]` para algo como `z-[9999]` (ou equivalente consistente com o projeto).
- Motivo: mesmo com Portal, ainda pode existir overlay/popup com z-index alto. Usar `z-[9999]` torna o tooltip dominante.

### 3) Verificação de regressões visuais
Checar tooltips em outros pontos do app (ex.: `MessagePreview`) para garantir que:
- continuam posicionando corretamente,
- não ficam atrás de sheets/modals,
- não sofrem clipping.

## Arquivos envolvidos
- `src/components/ui/tooltip.tsx`
  - Adicionar `TooltipPrimitive.Portal`
  - Ajustar classe de `z-index` para bem alto

## Testes manuais (checklist)
1. Ir para `/dashboard/broadcast`.
2. Colapsar o sidebar.
3. Passar o mouse em cada ícone e confirmar:
   - tooltip aparece na frente do painel “Selecionar Instância” (e outros popovers),
   - tooltip não fica recortado,
   - tooltip não “pisca” ou desloca de forma estranha.
4. Abrir algum modal/popup (se existir no fluxo) e repetir o hover nos ícones do sidebar.

## Observações técnicas
- Usar Portal é a correção mais confiável para problemas de tooltip atrás de elementos, porque remove a dependência de stacking contexts locais.
- Manteremos a API do componente igual (`Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`) para não quebrar imports existentes.
