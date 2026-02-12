
# KPI de Leads do Helpdesk no Dashboard

## Objetivo
Adicionar um card de KPI e um grafico de linha no dashboard mostrando metricas diarias de leads capturados automaticamente pelo Helpdesk.

## Fonte de Dados
A tabela `lead_database_entries` ja possui o campo `source` (com valor `'helpdesk'` para leads auto-capturados) e `created_at` com timestamp. Nao e necessario criar tabelas novas.

## Implementacao

### 1. DashboardHome.tsx - Novo KPI Card
- Adicionar um novo `StatsCard` com icone `UserPlus` mostrando:
  - **Leads Helpdesk Hoje**: contagem de entries com `source = 'helpdesk'` e `created_at` de hoje
  - **Trend**: comparacao percentual com ontem (ex: +25% vs ontem)
- Adicionar na grid de stats secundarios

### 2. DashboardCharts.tsx - Grafico de Leads Diarios
- Adicionar um novo grafico de barras/area mostrando leads do helpdesk nos ultimos 7 dias
- Eixo X: dias da semana (seg, ter, qua...)
- Eixo Y: quantidade de leads capturados
- Usar a mesma paleta de cores existente

### 3. Query de Dados (no DashboardHome.tsx)
- Nova funcao `fetchHelpdeskLeadsStats()` que:
  - Busca contagem de hoje: `SELECT COUNT(*) FROM lead_database_entries WHERE source = 'helpdesk' AND created_at >= hoje`
  - Busca contagem de ontem para calcular trend
  - Busca ultimos 7 dias agrupados por dia para o grafico
  - Busca total geral de leads helpdesk

### Secao Tecnica

**Query principal:**
```sql
SELECT DATE(created_at) as day, COUNT(*) as count
FROM lead_database_entries
WHERE source = 'helpdesk'
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day
```

**Arquivos modificados:**
- `src/pages/dashboard/DashboardHome.tsx` - adicionar fetch de dados e StatsCard
- `src/components/dashboard/DashboardCharts.tsx` - adicionar grafico de leads diarios (recebe dados via props)

**Nenhuma migracao necessaria** - os dados ja existem na estrutura atual.
