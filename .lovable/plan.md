
# Modernizar o cabecalho do chat no Helpdesk

## Problema atual

O cabecalho do chat exibe o numero de telefone duas vezes:
- Uma vez como texto simples (`contact.phone`)
- Outra vez dentro de um badge verde (`contact.jid.split('@')[0]`)

Alem disso, o layout esta desorganizado: nome, telefone, badge e seletor de status ficam empilhados de forma confusa.

## Solucao

Redesenhar o bloco central do cabecalho (linhas 119-155 de `ChatPanel.tsx`) com um layout mais limpo e moderno:

1. **Primeira linha**: Nome do contato (fonte maior, semibold) + numero de telefone formatado (apenas uma vez, sem badge verde duplicado)
2. **Segunda linha**: Seletor de status com indicador colorido

O badge verde com o JID sera removido, pois e redundante (o numero ja aparece no texto).

## Detalhes tecnicos

**Arquivo**: `src/components/helpdesk/ChatPanel.tsx`

Alteracoes no bloco de linhas 119-155:

- Remover o badge verde que exibe `contact.jid.split('@')[0]` (linhas 125-129)
- Manter apenas `contact.phone` como informacao secundaria ao lado do nome
- Reorganizar o layout para que nome e telefone fiquem na mesma linha (ou nome em cima, telefone + status embaixo)
- Manter o seletor de status com os indicadores coloridos

Nenhuma alteracao de backend, banco de dados ou outros componentes necessaria.
