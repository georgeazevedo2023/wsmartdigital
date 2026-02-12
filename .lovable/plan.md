
## Filtro por Instância no KPI de Leads do Helpdesk

### Objetivo
Adicionar um filtro de seleção de instância ao card KPI de "Leads Helpdesk Hoje" e ao gráfico de área, permitindo visualizar métricas segmentadas por cada inbox/instância.

### Análise Atual

**Estrutura de Dados:**
- A tabela `lead_databases` possui o campo `instance_id` que vincula a base de dados a uma instância específica
- A tabela `lead_database_entries` possui o campo `source = 'helpdesk'` para leads auto-capturados
- Leads do helpdesk são organizados em bases nomeadas como "Helpdesk - {instance_name}" (ex: "Helpdesk - motorac")
- Cada base está associada a um `instance_id`

**Fluxo Atual:**
1. `DashboardHome.tsx` chama `fetchHelpdeskLeadsStats()` que agrega dados **globais** de todos as instâncias
2. Os dados são passados para `DashboardCharts.tsx` como `helpdeskLeadsDailyData`
3. O card de KPI mostra "Leads Helpdesk Hoje" com total global e trend

### Solução Proposta

#### 1. **Estado do Filtro** (DashboardHome.tsx)
- Adicionar novo estado `selectedInstance: string | null` para rastrear qual instância está selecionada
- Inicialmente `null` = mostrar agregação global
- Renovar `helpdeskLeads` quando a seleção mudar

#### 2. **Dados Dinâmicos por Instância**
Modificar `fetchHelpdeskLeadsStats()` para aceitar um `instanceId` opcional:
```sql
-- Se instanceId fornecido:
SELECT DATE(created_at) as day, COUNT(*) as count
FROM lead_database_entries
WHERE source = 'helpdesk'
  AND database_id IN (
    SELECT id FROM lead_databases 
    WHERE instance_id = $1
  )
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day

-- Se instanceId é NULL (global):
SELECT DATE(created_at) as day, COUNT(*) as count
FROM lead_database_entries
WHERE source = 'helpdesk'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day
```

#### 3. **UI de Filtro** (DashboardHome.tsx)
- Adicionar um **Select ou Button Group** antes do card KPI de "Leads Helpdesk Hoje"
- Opções:
  - "Todas as Instâncias" (padrão, agregação global)
  - Para cada instância online: "{instance_name}" com status badge
- Quando o usuário seleciona uma instância:
  - Chamar `fetchHelpdeskLeadsStats(instanceId)`
  - Atualizar o card e o gráfico com dados filtrados

#### 4. **Componente de Seletor** (Novo: `InstanceFilterSelect.tsx`)
Criar um componente reutilizável que:
- Mostra um dropdown/button group com instâncias disponíveis
- Exibe badge de status (Online/Offline) para cada instância
- Aceita props: `instances`, `selectedId`, `onSelect`
- Estilo consistente com `InstanceSelector.tsx`

#### 5. **Impacto Visual**
- O card KPI mudará para mostrar:
  - "Leads Helpdesk Hoje — {instance_name}" quando filtrado
  - "Leads Helpdesk Hoje — Todas as Instâncias" quando global
- O gráfico de área abaixo será atualizado para refletir apenas os dados da instância selecionada
- Trend (% vs ontem) se recalculará automaticamente

### Fluxo de Dados Atualizado

```
[instances carregadas]
           ↓
[DashboardHome renderiza Select de instâncias]
           ↓
[usuário seleciona uma instância]
           ↓
[fetchHelpdeskLeadsStats(instanceId) chamado]
           ↓
[setHelpdeskLeads(novos dados filtrados)]
           ↓
[StatsCard + DashboardCharts recebem novos dados via props]
           ↓
[UI atualiza automaticamente]
```

### Seção Técnica

**Modificações Necessárias:**

1. **`src/pages/dashboard/DashboardHome.tsx`**:
   - Adicionar estado `selectedHelpdeskInstance: string | null`
   - Modificar `fetchHelpdeskLeadsStats()` para aceitar `instanceId?: string`
   - Adicionar lógica de JOIN com `lead_databases` para filtrar por instância
   - Renderizar novo Select/Button Group antes do card KPI
   - Passar `selectedHelpdeskInstance` como prop para que DashboardCharts saiba qual instância está filtrada

2. **`src/components/dashboard/DashboardCharts.tsx`**:
   - Receber novo prop `selectedInstanceId?: string`
   - Exibir nome da instância no título do gráfico quando filtrado
   - Adaptar lógica de cores/labels caso necessário

3. **`src/components/dashboard/InstanceFilterSelect.tsx` (NOVO)**:
   - Componente Select ou Button Group
   - Mostra todas as instâncias (online + offline)
   - Permite "Todas" e instância específica
   - Estilo consistente com design existente

### Casos de Uso

- **Super Admin querendo acompanhar uma instância específica**: Seleciona "motorac" → vê apenas leads do helpdesk daquela instância
- **Troubleshooting**: Filtra por instância para verificar se leads estão sendo capturados corretamente
- **Relatórios**: Comparação rápida entre instâncias no dashboard

### Nenhuma Mudança de Banco de Dados Necessária
Os dados já existem com as relações necessárias (`lead_databases.instance_id`). Apenas queries mais sofisticadas no frontend.

### Tempo Estimado
- Implementação: ~30 minutos
- Testes: ~15 minutos

