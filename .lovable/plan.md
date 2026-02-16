
# Redesign do Card de Contato no Helpdesk (estilo WhatsApp)

## O que muda

O card de contato atual exibe os dados em formato de lista (telefone, email, etc). O novo layout vai seguir o visual do WhatsApp:

1. **Cabecalho**: Avatar circular com icone + Nome do contato em destaque + seta para a direita
2. **Divisor**: Linha separadora
3. **Botoes de acao**: Dois botoes lado a lado -- "Conversar" (abre chat no WhatsApp Web) e "Adicionar contato" (ainda sem acao real, apenas visual)
4. **Sem bubble padrao**: O card tera fundo proprio (sem a bolha verde/cinza envolvendo), similar ao sticker

As cores seguem o tema dark do projeto (bordas `border`, fundo `muted/card`, texto `foreground`, destaque `primary`).

---

## Detalhes tecnicos

**Arquivo**: `src/components/helpdesk/MessageBubble.tsx`

- Alterar o bloco de renderizacao do `contact` (linhas 255-292) para o novo layout:
  - Remover os campos de email, org, url e telefone em lista
  - Adicionar cabecalho com avatar + nome + icone ChevronRight
  - Adicionar divisor horizontal
  - Adicionar dois botoes: "Conversar" (link `https://wa.me/{phone}`) e "Adicionar contato" (visual only)
- Tratar o card como "sem bolha padrao" (similar ao sticker): o container externo nao aplica bg de bolha quando `media_type === 'contact'`
- O horario continua aparecendo abaixo do card

Nenhuma alteracao de backend ou banco de dados necessaria.
