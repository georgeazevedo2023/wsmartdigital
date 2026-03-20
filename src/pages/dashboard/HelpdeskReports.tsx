import { useHelpdeskReports, type PeriodFilter } from '@/hooks/useHelpdeskReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, LineChart, Line, PieChart, Pie, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Users, MessageSquare, TrendingUp, BarChart3, PieChart as PieIcon } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  aberta: 'hsl(217 91% 60%)',
  pendente: 'hsl(38 92% 50%)',
  resolvida: 'hsl(142 70% 45%)',
  fechada: 'hsl(0 72% 51%)',
};

const COLORS = ['hsl(217 91% 60%)', 'hsl(142 70% 45%)', 'hsl(262 80% 55%)', 'hsl(38 92% 50%)', 'hsl(0 72% 51%)', 'hsl(186 64% 42%)'];

const formatSeconds = (secs: number) => {
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
};

const formatMinutes = (minutes: number) => {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = { aberta: 'Aberta', pendente: 'Pendente', resolvida: 'Resolvida', fechada: 'Fechada' };
  return map[s] || s;
};

const HelpdeskReports = () => {
  const {
    conversationsByStatus, agentPerformance, volumeByPeriod, responseTime,
    loading, period, setPeriod, selectedInboxId, setSelectedInboxId, inboxes,
  } = useHelpdeskReports();

  const totalConversations = conversationsByStatus.reduce((sum, c) => sum + c.count, 0);
  const totalResolved = conversationsByStatus.find(c => c.status === 'resolvida')?.count || 0;
  const resolutionRate = totalConversations > 0 ? Math.round((totalResolved / totalConversations) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios do Helpdesk</h1>
          <p className="text-sm text-muted-foreground">Métricas de atendimento e performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as caixas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as caixas</SelectItem>
              {inboxes.map(ib => (
                <SelectItem key={ib.id} value={ib.id}>{ib.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="glass-card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{totalConversations}</p>
                    <p className="text-xs text-muted-foreground">Conversas no período</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-5 h-5 text-success" /></div>
                  <div>
                    <p className="text-2xl font-bold">{resolutionRate}%</p>
                    <p className="text-xs text-muted-foreground">Taxa de resolução</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10"><Users className="w-5 h-5 text-accent-foreground" /></div>
                  <div>
                    <p className="text-2xl font-bold">{agentPerformance.length}</p>
                    <p className="text-xs text-muted-foreground">Agentes ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Volume by period */}
            <Card className="glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Volume de Conversas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {volumeByPeriod.length > 0 ? (
                  <ChartContainer config={{ count: { label: 'Conversas', color: 'hsl(var(--primary))' } }} className="h-[250px] w-full">
                    <LineChart data={volumeByPeriod} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={30} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
                )}
              </CardContent>
            </Card>

            {/* Conversations by status */}
            <Card className="glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-primary" />
                  Conversas por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {conversationsByStatus.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ChartContainer config={{}} className="h-[250px] w-1/2">
                      <PieChart>
                        <Pie
                          data={conversationsByStatus.map(c => ({ name: statusLabel(c.status), value: c.count }))}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80}
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {conversationsByStatus.map((c, i) => (
                            <Cell key={i} fill={STATUS_COLORS[c.status] || COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-2 w-1/2">
                      {conversationsByStatus.map((c, i) => (
                        <div key={c.status} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[c.status] || COLORS[i % COLORS.length] }} />
                          <span className="text-foreground">{statusLabel(c.status)}</span>
                          <span className="ml-auto font-medium">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Response time per inbox */}
            <Card className="glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Tempo Médio de Resposta por Caixa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {responseTime.length > 0 ? (
                  <ChartContainer config={{ avgSeconds: { label: 'Tempo (s)', color: 'hsl(262 80% 55%)' } }} className="h-[250px] w-full">
                    <BarChart data={responseTime.map(d => ({ name: d.inboxName.length > 18 ? d.inboxName.slice(0, 18) + '…' : d.inboxName, avgSeconds: d.avgSeconds, msgCount: d.msgCount }))} layout="vertical" margin={{ left: 10, right: 60 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => <span className="font-medium">{formatSeconds(Number(v))}</span>} />} />
                      <Bar dataKey="avgSeconds" radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: 'right', fontSize: 11, formatter: (v: number) => formatSeconds(v), fill: 'hsl(var(--muted-foreground))' }}>
                        {responseTime.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de tempo de resposta</div>
                )}
              </CardContent>
            </Card>

            {/* Agent performance table */}
            <Card className="glass-card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Performance por Agente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agentPerformance.length > 0 ? (
                  <div className="max-h-[250px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Agente</TableHead>
                          <TableHead className="text-xs text-right">Conversas</TableHead>
                          <TableHead className="text-xs text-right">Resolvidas</TableHead>
                          <TableHead className="text-xs text-right">Tempo Resp.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentPerformance.map((agent) => (
                          <TableRow key={agent.agentId}>
                            <TableCell className="text-sm font-medium truncate max-w-[120px]">{agent.agentName}</TableCell>
                            <TableCell className="text-sm text-right">{agent.totalConversations}</TableCell>
                            <TableCell className="text-sm text-right">{agent.resolvedConversations}</TableCell>
                            <TableCell className="text-sm text-right">{agent.avgResponseMinutes > 0 ? formatMinutes(agent.avgResponseMinutes) : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Nenhum agente com dados no período</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default HelpdeskReports;
