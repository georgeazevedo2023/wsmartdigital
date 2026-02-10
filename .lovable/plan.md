

# Adicionar Secao de Casos de Uso Ilustrados na Landing Page

## Objetivo

Criar uma nova secao visual na landing page mostrando exemplos concretos de uso do disparador, como ofertas, follow-up, lembretes, etc. Cada caso de uso tera um mockup ilustrado simulando uma conversa/mensagem no WhatsApp.

## Posicionamento

A secao ficara entre **FeaturesSection** e **HowItWorksSection**, pois complementa as funcionalidades com exemplos praticos antes de mostrar como comecar.

```text
FeaturesSection
    |
UseCasesSection  <-- NOVA SECAO
    |
HowItWorksSection
```

## Casos de Uso (5 cards)

| Caso | Icone | Titulo | Descricao curta | Conteudo do mockup (balao de mensagem) |
|------|-------|--------|-----------------|---------------------------------------|
| Ofertas e Promocoes | Tag | "Ofertas Relampago" | Dispare promos segmentadas para sua base | Mockup com mensagem de desconto + emoji + botao "Comprar Agora" |
| Follow-up de Vendas | MessageSquareReply | "Follow-up Automatico" | Reengaje leads que nao responderam | Mockup com mensagem de acompanhamento pos-contato |
| Lembretes | Bell | "Lembretes Inteligentes" | Reduza faltas e atrasos com alertas | Mockup com lembrete de agendamento/consulta |
| Lancamentos | Rocket | "Lancamentos e Novidades" | Gere expectativa e urgencia | Mockup com anuncio de produto novo + carrossel |
| Cobranca e Avisos | CreditCard | "Cobranca e Avisos" | Recupere pagamentos de forma nao invasiva | Mockup com lembrete amigavel de boleto/pix |

## Design Visual

Cada card tera:
1. Um **icone** no topo com fundo colorido
2. Um **titulo** e **descricao curta**
3. Um **mockup de mensagem WhatsApp** estilizado com:
   - Fundo verde escuro simulando um balao de chat
   - Texto de exemplo da mensagem
   - Horario ficticio (ex: 09:32)
   - Badge de "Entregue" (dois checks)

O layout sera um grid responsivo: 1 coluna no mobile, 2 no tablet, 3 no desktop. As animacoes usarao o hook `useInView` existente com delays escalonados.

## Arquivos

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/landing/UseCasesSection.tsx` | Criar | Nova secao com os 5 cards ilustrados |
| `src/pages/Index.tsx` | Modificar | Importar e posicionar a secao entre Features e HowItWorks |

## Detalhes Tecnicos

### Estrutura do componente `UseCasesSection.tsx`

- Importar icones do `lucide-react` (Tag, MessageSquareReply, Bell, Rocket, CreditCard, Check)
- Usar `useInView` para animacoes de entrada
- Usar classes existentes: `glass-card-hover`, `text-gradient`, `animate-fade-in`
- Mockup do balao de mensagem criado com Tailwind (sem imagens externas):
  - Container com `bg-[#005C4B]` (verde WhatsApp) e `rounded-xl`
  - Texto da mensagem em branco
  - Rodape com horario + checks em cinza claro
- Grid com `grid md:grid-cols-2 lg:grid-cols-3 gap-6`

### Exemplo de mockup (estrutura JSX)

```tsx
<div className="mt-4 bg-[#005C4B] rounded-xl p-3 text-white text-sm">
  <p>Ola! Temos uma oferta exclusiva para voce: 30% OFF em todos os produtos ate sexta!</p>
  <div className="flex items-center justify-end gap-1 mt-1 text-white/60 text-xs">
    <span>09:32</span>
    <Check className="w-3 h-3" />
    <Check className="w-3 h-3 -ml-1.5" />
  </div>
</div>
```

### Atualizacao em `Index.tsx`

Adicionar import e posicionar entre `<FeaturesSection />` e `<HowItWorksSection />`:

```tsx
import UseCasesSection from '@/components/landing/UseCasesSection';
// ...
<FeaturesSection />
<UseCasesSection />
<HowItWorksSection />
```
