

# Corrigir botão voltar invisível no mobile - Causa raiz real

## Problema identificado

O `DashboardLayout` envolve TODAS as páginas com `<div className="min-h-full p-4">`, adicionando 1rem de padding em todos os lados. Para o Helpdesk, isso empurra o header do chat para baixo e causa overflow, escondendo o botão voltar e as opções do topo.

Além disso, o cálculo de altura usa `100vh - 4rem`, mas o MobileHeader tem `h-14` (3.5rem), criando uma incompatibilidade.

## Solução

### 1. Eliminar o padding do DashboardLayout no Helpdesk (`HelpDesk.tsx`)

Aplicar margens negativas `-m-4` no container mobile do HelpDesk para anular o `p-4` do layout pai, e corrigir a altura para `h-[calc(100vh-3.5rem)]` (3.5rem = altura exata do MobileHeader `h-14`).

### 2. Garantir que o viewport suporte safe-area (`index.html`)

Adicionar `viewport-fit=cover` na meta tag viewport para que `env(safe-area-inset-top)` funcione em iPhones com notch.

## Alterações técnicas

### `src/pages/dashboard/HelpDesk.tsx`
- Container mobile: trocar de `h-[calc(100vh-4rem)]` para `h-[calc(100vh-3.5rem)] -m-4` para ocupar toda a área disponível sem o padding extra do layout pai

### `index.html`
- Alterar a meta viewport para: `width=device-width, initial-scale=1.0, viewport-fit=cover`

## Arquivos afetados

- `src/pages/dashboard/HelpDesk.tsx` - margem negativa e altura corrigida
- `index.html` - viewport-fit=cover para safe areas

