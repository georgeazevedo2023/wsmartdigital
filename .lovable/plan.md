
# Etapa 2 — Dashboard de Inteligência de Negócios

## Contexto e Dados Disponíveis

Atualmente existem 10 conversas com `ai_summary` no banco, cada uma com a estrutura:
- `reason`: motivo principal do contato (ex: "Solicitação de orçamento para retirada de blindagem")
- `summary`: resumo em 2-3 frases
- `resolution`: como foi resolvido
- `generated_at`, `message_count`

Esse JSON estruturado é a matéria-prima para toda a análise de inteligência.

## Estratégia de Implementação

Em vez de criar uma tabela `ai_analytics_snapshots` separada (que só faz sentido com centenas de resumos), vamos fazer análise **direta sobre as conversas** usando a Edge Function `analyze-summaries`. Ela busca os `ai_summary` existentes, envia para a IA agregar e retorna métricas prontas para o dashboard. O resultado é cacheado em sessionStorage por 30 minutos para economizar chamadas de IA.

## Arquitetura da Solução

```text
[Dashboard de Inteligência]
        │
        ▼
[Edge Function: analyze-summaries]
        │
        ├── busca conversas com ai_summary (filtro: período + inbox)
        │
        ├── agrupa os reason/summary/resolution em texto
        │
        └── Gemini Flash → JSON estruturado:
                {
                  top_reasons: [...],
                  top_products: [...],
                  top_objections: [...],
                  sentiment_distribution: {...},
                  key_insights: "..."
                }
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| `supabase/functions/analyze-summaries/index.ts` | Criar — Edge Function de análise agregada |
| `supabase/config.toml` | Editar — registrar nova função |
| `src/pages/dashboard/Intelligence.tsx` | Criar — nova página |
| `src/App.tsx` | Editar — nova rota `/dashboard/intelligence` |
| `src/components/dashboard/Sidebar.tsx` | Editar — novo item "Inteligência" (admin only) |

## Detalhes Técnicos

### Edge Function `analyze-summaries`

Recebe via POST:
```json
{
  "inbox_id": "uuid | null",
  "period_days": 7
}
```

Fluxo interno:
1. Busca todas as conversas com `ai_summary IS NOT NULL` do período (sem JWT — usa service_role)
2. Filtra por `inbox_id` se informado
3. Concatena todos os `reason`, `summary`, `resolution` em um único texto
4. Chama Gemini Flash com prompt especializado em análise de negócio
5. Retorna JSON com métricas e insights

Prompt para análise agregada:
```
Você é um analista de negócios especializado em atendimento ao cliente.
Analise estes N resumos de conversas de WhatsApp de uma empresa e retorne APENAS JSON válido com:
- "top_reasons": array de {reason, count} com os 5 motivos mais frequentes
- "top_products": array de {product, count} com produtos/serviços mais citados
- "top_objections": array de {objection, count} com principais objeções dos clientes
- "sentiment": {"positive": %, "neutral": %, "negative": %}
- "key_insights": texto de 2-3 frases com os insights mais importantes para o negócio
- "total_analyzed": número de conversas analisadas
```

### Página `Intelligence.tsx`

Layout com 3 seções:

**Seção 1 — Filtros e Ação**
- Select de período: Últimos 7 dias / 30 dias / 90 dias
- Select de caixa de entrada (todas ou específica)
- Botão "Analisar" que dispara a Edge Function

**Seção 2 — Cards de KPI**
- Card: Motivo #1 de contato (com contagem)
- Card: Produto mais procurado
- Card: Principal objeção
- Card: Sentimento médio (positivo/neutro/negativo)

**Seção 3 — Gráficos e Insights (Recharts)**
- Gráfico de barras horizontais: Top 5 motivos de contato
- Gráfico de barras: Top produtos/serviços
- Gráfico de pizza: Distribuição de sentimento
- Card de texto: "Insights Chave" gerados pela IA

**Estados da página:**
- Estado inicial: Ilustração + botão "Gerar análise de inteligência"
- Estado carregando: Skeleton + mensagem "Analisando N conversas..."
- Estado com dados: Todos os gráficos e cards visíveis
- Estado sem dados: "Nenhuma conversa com resumo no período selecionado"

### Item no Sidebar

Adicionado na seção Admin com ícone `BrainCircuit` (Lucide):
- Visível apenas para `isSuperAdmin`
- Rota: `/dashboard/intelligence`
- Label: "Inteligência"

### Rota no App.tsx

```tsx
const Intelligence = lazy(() => import("./pages/dashboard/Intelligence"));
// ...
<Route path="intelligence" element={<AdminRoute><Suspense fallback={<PageLoader />}><Intelligence /></Suspense></AdminRoute>} />
```

## Segurança

A Edge Function `analyze-summaries` usa `service_role` internamente — nenhum dado sensível é exposto. A autenticação é validada pelo JWT do usuário na request HTTP. Somente super admins podem acessar a rota pela configuração do `AdminRoute` no front-end.

## Limitação de Custo

- Cache de 30 minutos em `sessionStorage` com chave baseada nos filtros
- Alerta visual quando há menos de 5 resumos disponíveis ("Poucos dados para análise confiável")
- Limite máximo de 100 conversas por análise para controlar custos de IA
