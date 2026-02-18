# Sistema de Inteligência de Conversas — Implementação por Etapas

## Visão Geral do Projeto

O objetivo é transformar os resumos de IA de uma funcionalidade manual (botão) em um sistema automático e inteligente que alimenta: o helpdesk com contexto ao vivo, o dashboard com métricas de negócio, e os gerentes com relatórios por turno via WhatsApp.

A implementação será dividida em 4 etapas independentes, podendo ser aprovadas e entregues uma a uma.

---

## Etapa 1 — Resumo Automático + Expiração em 60 dias

**O que muda:** O resumo passa a ser gerado automaticamente quando uma conversa é marcada como "resolvida" ou quando nao houver interação em 1h — sem o atendente precisar clicar em nada. Resumos com mais de 60 dias são apagados automaticamente para poupar armazenamento.

### Como funciona

O gatilho de geração automática será um webhook. Quando o atendente muda o status de uma conversa para `resolvida`, ou nao houver interacao em 1h o sistema dispara a função `summarize-conversation` em background via `pg_net` (chamada HTTP interna). Isso evita sobrecarregar a UI e garante que o resumo esteja pronto quando o próximo atendente abrir a conversa.

### Mudanças técnicas

**Banco de dados — nova migration:**

```sql
-- Adicionar campo de expiração do resumo
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_summary_expires_at timestamptz DEFAULT NULL;

-- Trigger: ao marcar como resolvida, agenda chamada à Edge Function
-- (via pg_cron que roda a cada hora para limpar resumos expirados)

-- Função de limpeza agendada (pg_cron a cada 24h)
-- DELETE FROM conversations SET ai_summary = NULL WHERE ai_summary_expires_at < now()
```

**Edge Function `summarize-conversation` — ajuste:**

- Ao salvar o resumo, também salva `ai_summary_expires_at = now() + interval '60 days'`
- Aceita ser chamada sem JWT (via `service_role`) para chamadas internas automáticas

**Novo mecanismo de disparo automático:**

- Criar função `auto-summarize-on-resolve` (pg_net + pg_trigger ou via webhook) que chama `summarize-conversation` em background sempre que `status` muda para `resolvida`

**Limpeza automática via pg_cron:**

```sql
-- Roda 1x por dia, apaga ai_summary de conversas com resumo expirado
SELECT cron.schedule('cleanup-expired-summaries', '0 3 * * *', $$
  UPDATE conversations 
  SET ai_summary = NULL, ai_summary_expires_at = NULL 
  WHERE ai_summary_expires_at < now() AND ai_summary IS NOT NULL;
$$);
```

**UI — `ContactInfoPanel.tsx`:**

- Remover o botão "✨ Resumir conversa" do estado inicial
- Exibir o card de resumo diretamente se existir, ou um estado neutro "Resumo será gerado ao resolver"
- Manter apenas o botão "🔄 Atualizar" para forçar regeneração

**Arquivos afetados:**

- `supabase/migrations/` — coluna `ai_summary_expires_at` + pg_cron de limpeza
- `supabase/functions/summarize-conversation/index.ts` — salvar expiração + aceitar chamadas sem JWT de usuário
- `supabase/functions/auto-summarize/index.ts` — nova função chamada pelo trigger
- `supabase/config.toml` — registrar `auto-summarize`
- `src/components/helpdesk/ContactInfoPanel.tsx` — remover botão manual

---

## Etapa 2 — Dashboard de Inteligência de Negócios

**O que muda:** Uma nova aba "Inteligência" no dashboard de super admin exibe métricas extraídas dos resumos de IA: principais motivos de contato, produtos/serviços mais citados, objeções frequentes, e atendentes mais solicitados.

### Como funciona

Os resumos já são armazenados em JSON estruturado no banco (`ai_summary`). Uma nova Edge Function `analyze-summaries` agrega esses dados periodicamente e os salva em uma tabela `ai_analytics_snapshots`. O dashboard consome essa tabela em vez de recalcular a cada requisição.

### Estrutura da tabela `ai_analytics_snapshots`

```json
{
  "period": "2026-02-18",
  "inbox_id": "uuid",
  "top_reasons": [
    { "reason": "Interesse em blindagem", "count": 12 },
    { "reason": "Dúvida sobre preços", "count": 8 }
  ],
  "top_products": [...],
  "top_objections": [...],
  "most_requested_agents": [...],
  "total_conversations": 45,
  "resolved_conversations": 31
}
```

**Prompt da IA para análise agregada** (diferente do resumo individual):

```
Analise estes N resumos de conversas e extraia em JSON:
- "top_reasons": os 5 motivos de contato mais frequentes com contagem
- "top_products": produtos/serviços mais mencionados
- "top_objections": principais objeções dos clientes
- "sentiment_distribution": % positivo/neutro/negativo
```

**Nova página:** `src/pages/dashboard/Analytics.tsx`

- Cards: Motivo #1, Produto mais procurado, Objeção principal
- Gráfico de barras: top motivos de contato (últimos 7/30 dias)
- Filtro por período e por caixa de entrada

**Arquivos afetados:**

- `supabase/migrations/` — tabela `ai_analytics_snapshots`
- `supabase/functions/analyze-summaries/index.ts` — nova função de agregação IA
- `src/pages/dashboard/Analytics.tsx` — nova página
- `src/App.tsx` — nova rota `/dashboard/analytics`
- `src/components/dashboard/Sidebar.tsx` — novo item "Inteligência" (admin only)

---

## Etapa 3 — Relatórios de Turno por WhatsApp

**O que muda:** Um novo módulo "Relatórios" permite configurar números de gerentes que receberão automaticamente um resumo de cada turno (Manhã 6h-12h, Tarde 12h-18h, Noite 18h-6h) via WhatsApp, gerado por IA com base nas conversas do período.

### Interface de configuração

Nova página `src/pages/dashboard/Reports.tsx`:

```text
┌──────────────────────────────────────┐
│  📊 Relatórios de Turno              │
│  ─────────────────────────────────── │
│  Caixa de entrada: [Neo Blindados ▼] │
│                                      │
│  Instância de envio: [Wsmart ▼]      │
│                                      │
│  Números dos gerentes:               │
│  +55 81 9xxxx-xxxx  [+ Adicionar]   │
│                                      │
│  Turnos ativos:                      │
│  ☑ Manhã (envio às 12h)             │
│  ☑ Tarde (envio às 18h)             │
│  ☑ Noite (envio às 6h do dia seg.) │
│                                      │
│  [Salvar configuração]               │
│  [Enviar teste agora]                │
└──────────────────────────────────────┘
```

### Tabela `report_configs`

```sql
CREATE TABLE report_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id uuid REFERENCES inboxes(id),
  instance_id text,
  manager_phones text[], -- números dos gerentes
  morning_enabled boolean DEFAULT true,
  afternoon_enabled boolean DEFAULT true,
  night_enabled boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
```

### Edge Function `generate-shift-report`

Chamada 3x por dia via pg_cron (12h, 18h, 6h):

1. Verifica quais inboxes têm `report_configs` configurado
2. Busca todos os `ai_summary` de conversas do turno correspondente
3. Envia para Gemini Flash: "Gere um relatório executivo em texto para WhatsApp do turno Manhã com estes N resumos..."
4. Envia via UAZAPI para cada número de gerente configurado

**Exemplo de mensagem enviada:**

```
📊 *Relatório de Atendimento*
Neo Blindados — 18/02 - Turno Manhã

📋 *Resumo do turno:*
Foram 12 atendimentos. Principal interesse: blindagem de veículos SUV. 

🎯 *Top motivos (manhã):*
• Interesse em orçamento (5x)
• Dúvida sobre prazo (3x)
• Indicação de conhecido (2x)

⚠️ *Principais objeções:*
• Preço acima do esperado (4x)
• Prazo de entrega longo (2x)

✅ *Resolvidos:* 9 | ⏳ *Pendentes:* 3

_Gerado automaticamente por WsmartQR_
```

**Arquivos afetados:**

- `supabase/migrations/` — tabela `report_configs`
- `supabase/functions/generate-shift-report/index.ts` — nova função
- `src/pages/dashboard/Reports.tsx` — nova página de configuração
- `src/App.tsx` — nova rota `/dashboard/reports`
- `src/components/dashboard/Sidebar.tsx` — novo item "Relatórios" (admin only)

---

## Etapa 4 — Linha do Tempo do Contato no Helpdesk

**O que muda:** No `ContactInfoPanel`, abaixo do resumo da conversa atual, aparece uma seção "Histórico deste contato" mostrando todas as conversas anteriores do mesmo número, com data, status e o resumo IA de cada uma — dando ao atendente contexto completo do cliente.

### Interface

```text
┌──────────────────────────────────────┐
│  🕐 Histórico do Contato             │
│  ─────────────────────────────────── │
│  📅 18/02/2026 — Resolvida           │
│  Interesse em blindagem SUV.         │
│  Contato de Milena enviado.          │
│  ────                                │
│  📅 10/02/2026 — Resolvida           │
│  Dúvida sobre garantia do serviço.   │
│  Respondido pelo bot.                │
│  ────                                │
│  📅 02/01/2026 — Resolvida           │
│  Pediu orçamento de blindagem.       │
│  Cliente já realizou serviço.        │
└──────────────────────────────────────┘
```

### Como funciona

Ao abrir um contato, o `ContactInfoPanel` faz uma query nas `conversations` filtrando pelo `contact_id`, retornando todas com `ai_summary IS NOT NULL`, ordenadas por `last_message_at DESC`.

**Arquivos afetados:**

- `src/components/helpdesk/ContactInfoPanel.tsx` — nova seção de histórico

---

## Ordem de execução recomendada

```text
Etapa 1 → Etapa 4 → Etapa 2 → Etapa 3
  (base)   (helpdesk)  (dados)  (relatório)
```

- Etapa 1 é pré-requisito para tudo (gera os resumos automaticamente)
- Etapa 4 agrega valor imediato ao atendente com dados da Etapa 1
- Etapa 2 acumula valor ao longo do tempo (precisa de volume de resumos)
- Etapa 3 fecha o ciclo de inteligência com relatórios gerenciais

**Cada etapa pode ser aprovada e implementada individualmente.**

Por qual etapa deseja começar?