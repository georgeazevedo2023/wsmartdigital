

# Corrigir botao voltar invisivel no mobile - Usar viewport dinamico (dvh)

## Problema real identificado

Em iOS Safari, `100vh` inclui a area atras da barra de endereco do navegador. Isso faz com que o container do Helpdesk seja maior que a area visivel, empurrando o header (com botao voltar) para tras da barra de endereco.

Na captura de tela, o header simplesmente nao aparece - esta escondido atras da barra de endereco do Safari.

## Causa raiz

A classe `h-[calc(100vh-3.5rem)]` usa `vh` que no iOS Safari representa o viewport TOTAL (incluindo area do browser chrome). O correto e usar `dvh` (dynamic viewport height) que representa apenas a area VISIVEL.

Alem disso, o `DashboardLayout` usa `h-screen` (que tambem e `100vh`) no container pai, criando o mesmo problema.

## Solucao

### 1. HelpDesk.tsx - Trocar `100vh` por `100dvh`

No container mobile (linha 431), alterar:
```
h-[calc(100vh-3.5rem)]  -->  h-[calc(100dvh-3.5rem)]
```

### 2. DashboardLayout.tsx - Trocar `h-screen` por altura dinamica

No container mobile (linha 18), alterar:
```
h-screen  -->  h-[100dvh]
```

Isso garante que TODA a hierarquia de layout respeite o viewport dinamico do iOS Safari, fazendo o header do chat ficar visivel abaixo da barra de endereco.

## Fallback

Navegadores que nao suportam `dvh` fazem fallback automatico para `vh`, entao nao ha risco de quebrar em navegadores antigos. Todos os navegadores modernos (Safari 15.4+, Chrome 108+) ja suportam `dvh`.

## Arquivos afetados

- `src/pages/dashboard/HelpDesk.tsx` - trocar `100vh` por `100dvh` no container mobile
- `src/components/dashboard/DashboardLayout.tsx` - trocar `h-screen` por `h-[100dvh]` no container mobile

