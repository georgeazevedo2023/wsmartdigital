

# Corrigir Usabilidade e Sobreposição no HelpDesk

## Problemas Identificados

Analisando os screenshots e o código:

1. **Texto vertical no chat**: As colunas laterais (`w-80` = 320px + `w-72` = 288px = 608px) com `shrink-0` não cedem espaço, esmagando a coluna central do chat a quase zero de largura. As letras ficam empilhadas verticalmente.
2. **Sobreposição no header**: O header do chat e o painel de contato se sobrepõem porque não há contenção de overflow adequada.
3. **Toggle direito não funciona**: O botão existe mas fica inacessível/invisível por estar espremido na coluna comprimida.

## Solução

### 1. `src/pages/dashboard/HelpDesk.tsx`

- Adicionar `overflow-hidden` na div da coluna central do chat para conter o conteúdo
- Trocar as larguras fixas das colunas laterais de `w-80`/`w-72` para larguras menores e responsivas: `w-72 lg:w-80` (lista) e `w-64 lg:w-72` (contato)
- Garantir que a coluna do chat tenha `min-w-0` E `overflow-hidden` para que o flex funcione corretamente

### 2. `src/components/helpdesk/ChatPanel.tsx`

- Garantir que o header tenha `overflow-hidden` para impedir que o conteúdo transborde
- Adicionar `z-10` no header para prevenir sobreposição visual
- Manter os botões de toggle acessíveis e com tamanho adequado

### 3. `src/components/helpdesk/ContactInfoPanel.tsx`

- Adicionar `overflow-y-auto` ao container para evitar que o conteúdo do painel transborde quando a tela é pequena

## Detalhes Técnicos

### HelpDesk.tsx - Layout corrigido

```typescript
// Coluna esquerda - largura responsiva
<div className="w-72 lg:w-80 border-r border-border/50 flex flex-col shrink-0 overflow-hidden">

// Coluna central - contenção de overflow
<div className="flex-1 flex flex-col min-w-0 overflow-hidden">

// Coluna direita - largura responsiva
<div className="w-64 lg:w-72 border-l border-border/50 flex flex-col shrink-0 overflow-hidden">
```

### ChatPanel.tsx - Header com z-index

```typescript
<div className="h-14 px-3 md:px-4 flex items-center gap-2 md:gap-3 border-b border-border/50 bg-card/50 shrink-0 z-10 relative">
```

### ContactInfoPanel.tsx - Scroll

```typescript
<div className="p-4 space-y-5 overflow-y-auto">
```

## Resultado Esperado

- Chat exibe texto normalmente sem empilhar letras verticalmente
- Botões de toggle funcionam e ficam acessíveis
- Painel de contato não sobrepõe o chat
- Layout se adapta melhor a diferentes tamanhos de tela

