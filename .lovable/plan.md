

# Adicionar Gráficos ao Dashboard

## Visao Geral

Adicionar visualizacoes graficas interativas para as metricas do Dashboard, usando o Recharts (ja instalado) e os componentes de Chart da UI do projeto.

---

## Graficos a Implementar

### 1. Grafico de Pizza - Distribuicao de Instancias

Visualizacao da distribuicao entre instancias online e offline.

```text
+------------------------+
|  Distribuicao Status   |
|     +----------+       |
|    /   Online  \       |
|   |   (verde)   |      |
|   |   Offline   |      |
|    \  (cinza)  /       |
|     +----------+       |
|  [legenda colorida]    |
+------------------------+
```

### 2. Grafico de Barras - Grupos por Instancia

Visualizacao comparativa do numero de grupos em cada instancia.

```text
+----------------------------------+
|     Grupos por Instancia         |
|                                  |
|  Inst A  ████████████  45        |
|  Inst B  ████████  32            |
|  Inst C  ██████  24              |
|  Inst D  ████  15                |
|                                  |
+----------------------------------+
```

### 3. Grafico de Barras Horizontal - Participantes por Instancia

Visualizacao dos participantes totais agrupados por instancia.

```text
+----------------------------------+
|   Participantes por Instancia    |
|                                  |
|  Inst A  ██████████████  2.450   |
|  Inst B  ████████████  1.890     |
|  Inst C  █████████  1.200        |
|  Inst D  ██████  850             |
|                                  |
+----------------------------------+
```

---

## Layout Proposto

Os graficos serao adicionados logo apos os KPIs principais e antes da secao "Grupos por Instancia":

```text
[Header - Ola, Usuario!]

[KPIs Grid: Instancias | Online | Grupos | Participantes]

[KPIs Secundarios: Offline | Usuarios]

[NOVA SECAO: Graficos]
+---------------------------------------+
|  [Pizza: Status]  |  [Barras: Grupos] |
+---------------------------------------+
|      [Barras Horizontais: Participantes]       |
+---------------------------------------+

[Grupos por Instancia - cards existentes]

[Instancias Recentes]
```

---

## Alteracoes Tecnicas

### Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/dashboard/DashboardHome.tsx` | Adicionar secao de graficos com 3 visualizacoes |

### Componentes Recharts a Usar

- `PieChart` + `Pie` + `Cell` para distribuicao de status
- `BarChart` + `Bar` para grupos por instancia
- `BarChart` (horizontal) + `Bar` para participantes
- `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` do projeto

### Configuracao de Cores

Usando as variaveis CSS do tema:
- **Primary (verde)**: `hsl(142 70% 45%)` - para online/grupos
- **Muted (cinza)**: `hsl(220 16% 14%)` - para offline
- **Cores de destaque**: Tons de verde/teal para diferentes instancias

---

## Comportamento

- Graficos usam os mesmos dados de `instanceStats` ja carregados
- Exibem skeleton durante carregamento (`loadingStats`)
- Respondem ao botao "Atualizar" existente
- Layout responsivo: 2 colunas em desktop, 1 em mobile

