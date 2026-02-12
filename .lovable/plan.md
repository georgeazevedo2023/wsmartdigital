

# Layout do Helpdesk: Uma coluna visivel por vez (Mobile-First)

## Problema

No desktop, as 3 colunas (lista w-80 + chat flex-1 + info w-72) ficam todas abertas ao mesmo tempo, deixando o espaco apertado. O usuario quer que apenas uma coluna fique visivel, com as outras retraidas.

## Solucao

Aplicar o mesmo padrao de navegacao por views que ja existe no mobile para TODAS as telas. Remover a separacao `isMobile` e usar um unico sistema de views para desktop e mobile.

### Comportamento

- **View "list"** (padrao): Lista de conversas em tela cheia
- **View "chat"**: Painel de chat em tela cheia, com botao voltar para lista e botao info
- **View "info"**: Painel de info do contato em tela cheia, com botao voltar para chat

### Mudancas no arquivo `src/pages/dashboard/HelpDesk.tsx`

1. Remover a condicao `if (isMobile)` que separa os layouts
2. Usar um unico bloco de renderizacao com `mobileView` (renomear para `activeView`) para todas as telas
3. Manter o `inboxSelector` visivel apenas na view "list"
4. Ajustar larguras: na view "list" usar `max-w-2xl mx-auto` no desktop para centralizar, chat e info usam tela cheia

### Detalhes tecnicos

O layout desktop atual (linhas 329-368) sera substituido pelo mesmo padrao condicional que ja existe nas linhas 284-326, removendo a bifurcacao `isMobile`. O estado `mobileView` sera renomeado para `activeView` para refletir que nao e mais exclusivo do mobile.

```text
Estado activeView:
  'list'  --> ConversationList (tela cheia)
  'chat'  --> ChatPanel com onBack e onShowInfo
  'info'  --> ContactInfoPanel com onBack
```

A selecao de conversa sempre muda para `activeView = 'chat'`. Os botoes de voltar e info ja existem no ChatPanel e ContactInfoPanel (implementados anteriormente).

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/dashboard/HelpDesk.tsx` | Remover layout de 3 colunas desktop, usar view unica para todas as telas, renomear mobileView para activeView |

### Resultado

- Uma coluna visivel por vez em qualquer tamanho de tela
- Navegacao fluida: Lista -> Chat -> Info -> voltar
- Sem regressao de funcionalidades
- Layout mais limpo e focado

