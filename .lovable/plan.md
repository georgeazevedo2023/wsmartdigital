
# Adicionar Casos de Uso com Carrossel na Landing Page

## Objetivo

Acrescentar exemplos de uso que mostram **mensagens com carrossel interativo** (cards com imagem, texto e botoes), complementando os mockups de mensagem simples ja existentes.

## Novos Casos de Uso (tipo carrossel)

Serao adicionados 2 cards com mockup de carrossel ao grid existente, totalizando 7 cards (mantendo os 5 atuais):

| Caso | Icone | Titulo | Cards do Carrossel |
|------|-------|--------|--------------------|
| Catalogo de Produtos | ShoppingBag | "Catalogo Interativo" | 3 mini-cards com nome do produto, preco e botao "Comprar" |
| Cardapio / Menu | UtensilsCrossed | "Cardapio Digital" | 3 mini-cards com prato, preco e botao "Pedir Agora" |

## Design Visual do Mockup de Carrossel

Dentro do container `bg-[#0B141A]`, em vez de um unico balao de texto, sera renderizado:
1. Um texto introdutorio em balao verde (ex: "Confira nossas opcoes!")
2. Uma linha horizontal com 2-3 mini-cards lado a lado simulando um carrossel do WhatsApp:
   - Cada card com uma area colorida simulando imagem (gradiente com icone)
   - Titulo do item em branco
   - Preco em destaque
   - Botao simulado na parte inferior

```text
+----------------------------------+
| Confira nossas opcoes! 🛍️        |
|                          09:32 ✓✓|
+----------------------------------+
| [Card 1]  [Card 2]  [Card 3]    |
| Produto A  Produto B  Produto C |
| R$ 99     R$ 149     R$ 199     |
| [Comprar] [Comprar]  [Comprar]  |
+----------------------------------+
```

## Alteracoes

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/landing/UseCasesSection.tsx` | Modificar | Adicionar 2 casos de carrossel com tipo condicional para renderizar mockup diferente |

## Detalhes Tecnicos

### Estrutura de dados

Adicionar campo `type` aos use cases:
- `type: 'message'` (padrao, os 5 existentes)
- `type: 'carousel'` (novos, com campo `cards` contendo array de mini-cards)

```typescript
{
  icon: ShoppingBag,
  title: 'Catálogo Interativo',
  description: 'Envie vitrines completas com carrossel',
  type: 'carousel' as const,
  introMessage: 'Confira nossas ofertas da semana! 🛍️',
  cards: [
    { title: 'Tênis Runner', price: 'R$ 199,90', color: 'from-blue-400 to-blue-600' },
    { title: 'Mochila Urban', price: 'R$ 149,90', color: 'from-purple-400 to-purple-600' },
    { title: 'Relógio Smart', price: 'R$ 299,90', color: 'from-emerald-400 to-emerald-600' },
  ],
  time: '11:20',
  color: 'from-indigo-500 to-violet-500',
}
```

### Renderizacao condicional

No JSX, verificar o `type` para renderizar o mockup adequado:
- `message`: mantém o balao verde atual
- `carousel`: renderiza intro + scroll horizontal com mini-cards

Os mini-cards do carrossel terao:
- `overflow-x-auto` com `flex gap-2` para scroll horizontal
- Cada card: `min-w-[120px]` com area de "imagem" (gradiente), titulo, preco e botao
- Botao simulado com `bg-[#00A884]` (verde WhatsApp) e texto "Ver mais"

### Grid

O grid passa de `lg:grid-cols-3` para acomodar 7 cards. Cards de carrossel poderao ocupar `md:col-span-2` para ter mais espaco horizontal, ou manter o tamanho padrao com scroll interno.
