
# Reorganizar o cabecalho do chat

## Problema

Os elementos do cabecalho (nome, telefone, seletor de status, badge IA, botoes) estao todos em uma unica linha sem separacao visual clara, ficando apertados e desorganizados, especialmente no mobile.

## Solucao

Reorganizar o layout do cabecalho para separar os elementos em grupos logicos com melhor espacamento e hierarquia visual:

- **Esquerda**: botoes de navegacao (voltar, toggle lista) + nome do contato + telefone
- **Centro/Direita**: seletor de status + badge/botao IA + botoes de info

## Alteracoes em `src/components/helpdesk/ChatPanel.tsx`

### Estrutura do header (linhas 194-264)

1. Mover o telefone para baixo do nome (empilhado vertical) em vez de ao lado, economizando espaco horizontal
2. Separar visualmente o grupo de informacoes do contato (nome + telefone) do grupo de acoes (status + IA + botoes)
3. Adicionar um separador sutil entre os grupos
4. Ajustar o seletor de status para ficar mais compacto e alinhado com o badge IA
5. Agrupar status + IA Ativada/Ativar IA juntos com gap menor

### Layout proposto

```text
[<] [||]  Nome do contato     [Status v] [IA Ativada] [i] [>>]
           11 9999-9999
```

- Nome e telefone empilhados verticalmente no bloco da esquerda (flex-col)
- Acoes agrupadas a direita com `gap-1.5`
- Status selector e badge IA ficam lado a lado de forma compacta
- Remover `overflow-hidden` do header que pode cortar elementos

### Arquivo afetado

- `src/components/helpdesk/ChatPanel.tsx` - apenas reestruturar o JSX do header (linhas 194-264)
