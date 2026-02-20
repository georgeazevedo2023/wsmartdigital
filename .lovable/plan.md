
# Melhorias na Inteligencia de Negocios: Drill-down e Novos Periodos

## Resumo

Adicionar opcoes de periodo "Ultimas 24h" e "Ultimas 48h", e em cada card KPI (Principal Motivo, Produto Mais Citado, Principal Objecao, Sentimento Geral) adicionar um botao "Abrir" que mostra um dialog com a lista de conversas que contribuiram para aquele resultado --- incluindo WhatsApp do cliente, nome, data/hora e o que aconteceu.

---

## Mudancas Necessarias

### 1. Edge Function `analyze-summaries` --- retornar dados das conversas

Atualmente a funcao agrega os dados mas nao retorna quais conversas pertencem a cada categoria. Precisamos que a IA retorne, para cada item (reason, product, objection, sentiment), os indices das conversas que se encaixam. A edge function entao mapeia esses indices para os dados reais (nome, telefone, data, resumo).

**Alteracoes no prompt da IA:**
- Pedir que cada item em `top_reasons`, `top_products`, `top_objections` inclua um campo `conversation_indices` (array de numeros referentes a posicao na lista enviada)
- Pedir que `sentiment` inclua `positive_indices`, `neutral_indices`, `negative_indices`

**Alteracoes no codigo:**
- Apos receber a resposta da IA, enriquecer cada item com os dados reais das conversas (buscando nome e telefone da tabela `contacts`)
- Retornar um campo `conversations_detail` no response: array de objetos `{ id, contact_name, contact_phone, created_at, reason, summary }`
- Cada item em top_reasons/top_products/top_objections tera um campo `conversation_ids` com os IDs das conversas relacionadas

**Novo formato de resposta:**
```text
{
  total_analyzed: number,
  top_reasons: [{ reason, count, conversation_ids: [uuid] }],
  top_products: [{ product, count, conversation_ids: [uuid] }],
  top_objections: [{ objection, count, conversation_ids: [uuid] }],
  sentiment: { positive, neutral, negative, positive_ids: [uuid], neutral_ids: [uuid], negative_ids: [uuid] },
  key_insights: string,
  conversations_detail: [{ id, contact_name, contact_phone, created_at, reason, summary }]
}
```

### 2. Frontend `Intelligence.tsx` --- novos periodos + botao "Abrir" + dialog de detalhes

**Novos periodos:**
- Adicionar `{ value: "1", label: "Ultimas 24 horas" }` e `{ value: "2", label: "Ultimas 48 horas" }` ao array `PERIOD_OPTIONS`

**Botao "Abrir" nos KPI cards:**
- Cada card (Principal Motivo, Produto Mais Citado, Principal Objecao, Sentimento Geral) recebe um botao "Abrir" que so aparece quando ha ocorrencias
- Ao clicar, abre um Dialog/Sheet com a lista de conversas relacionadas

**Dialog de detalhes:**
- Componente `ConversationDetailDialog` que recebe titulo + lista de conversas
- Cada item mostra:
  - Icone WhatsApp + link `wa.me/{phone}` (botao "Abrir WhatsApp")
  - Nome do contato (ou pushname se disponivel)
  - Data e horario da conversa (formatado com `formatBR`)
  - O que aconteceu (campo `summary` do ai_summary)
- Layout em lista vertical com separadores

---

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/analyze-summaries/index.ts` | Alterar prompt para retornar indices de conversas por categoria; buscar dados de contato; retornar `conversations_detail` e `conversation_ids` |
| `src/pages/dashboard/Intelligence.tsx` | Adicionar periodos 24h/48h; botao "Abrir" nos 4 KPI cards; dialog de detalhes com dados das conversas |

---

## Detalhes Tecnicos

### Edge Function - Enriquecimento de dados

Apos receber os indices da IA, a funcao:
1. Coleta todos os `contact_id` unicos das conversas
2. Busca na tabela `contacts` (name, phone) em uma unica query
3. Monta o array `conversations_detail` com os dados combinados
4. Associa `conversation_ids` a cada item de top_reasons, top_products, top_objections e sentiment

### Frontend - Interface do Dialog

```text
+------------------------------------------+
| Principal Motivo: Duvidas sobre...   [X] |
+------------------------------------------+
| [WhatsApp]  Salomao Tavares              |
| 18/02/2026 14:07                         |
| Questionou sobre instalacao de insulfilm |
| em vidros blindados para privacidade.    |
|------------------------------------------|
| [WhatsApp]  Windson Carlos               |
| 18/02/2026 14:05                         |
| Solicitou atendimento para vendas em     |
| Recife, encaminhado para consultora.     |
+------------------------------------------+
```

### Sentimento Geral - Drill-down especifico

Para o card de sentimento, o botao "Abrir" mostrara as conversas que contribuiram para o sentimento dominante (ex: se 50% negativo, mostra as conversas com sentimento negativo), permitindo entender o que levou a esse resultado.
