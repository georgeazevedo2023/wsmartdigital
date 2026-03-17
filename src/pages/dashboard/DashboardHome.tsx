import EmptyState from '@/components/ui/empty-state';
import StatsCard from '@/components/dashboard/StatsCard';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Users, Wifi, WifiOff, MessageSquare, UsersRound, RefreshCw, UserPlus } from 'lucide-react';
import HelpdeskMetricsCharts from '@/components/dashboard/HelpdeskMetricsCharts';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Button } from '@/components/ui/button';
import InstanceFilterSelect from '@/components/dashboard/InstanceFilterSelect';
import InstanceCard from '@/components/dashboard/InstanceCard';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const DashboardHome = () => {
  const h = useDashboardStats();

  if (h.loading) {
    return (
      <PageSkeleton
        header={['w-48', 'w-64']}
        gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        cards={4}
        cardHeight="h-32"
      />
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-xl md:text-2xl font-display font-bold">
          Olá, {h.profile?.full_name?.split(' ')[0] || 'Usuário'}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {h.isSuperAdmin
            ? 'Visão geral de todas as instâncias do sistema'
            : 'Gerencie suas instâncias do WhatsApp'}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <StatsCard title="Total de Instâncias" value={h.instances.length} icon={Server} />
        <StatsCard title="Instâncias Online" value={h.connectedInstances.length} icon={Wifi} />
        <StatsCard title="Total de Grupos" value={h.loadingStats ? '...' : h.totalGroups} icon={MessageSquare} />
        <StatsCard title="Total de Participantes" value={h.loadingStats ? '...' : h.totalParticipants.toLocaleString('pt-BR')} icon={UsersRound} />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
        <StatsCard title="Instâncias Offline" value={h.disconnectedInstances.length} icon={WifiOff} />
        {h.isSuperAdmin && (
          <StatsCard title="Total de Usuários" value={h.totalUsers} icon={Users} />
        )}
        <div className="col-span-2 lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">Filtrar por instância</span>
            <InstanceFilterSelect
              instances={h.instances.map(i => ({ id: i.id, name: i.name, status: i.status }))}
              selectedId={h.selectedHelpdeskInstance}
              onSelect={h.setSelectedHelpdeskInstance}
            />
          </div>
          <StatsCard
            title={h.selectedHelpdeskInstance
              ? `Leads Helpdesk Hoje — ${h.instances.find(i => i.id === h.selectedHelpdeskInstance)?.name || ''}`
              : 'Leads Helpdesk Hoje'}
            value={h.helpdeskLeads.today}
            icon={UserPlus}
            description={`${h.helpdeskLeads.total} leads capturados no total`}
            trend={h.helpdeskLeads.yesterday > 0 ? {
              value: Math.round(((h.helpdeskLeads.today - h.helpdeskLeads.yesterday) / h.helpdeskLeads.yesterday) * 100),
              positive: h.helpdeskLeads.today >= h.helpdeskLeads.yesterday,
            } : undefined}
          />
        </div>
      </div>

      {/* Charts Section */}
      <DashboardCharts
        instanceStats={h.instanceStats}
        connectedCount={h.connectedInstances.length}
        disconnectedCount={h.disconnectedInstances.length}
        loading={h.loadingStats}
        helpdeskLeadsDailyData={h.helpdeskLeads.dailyData}
        helpdeskChartTitle={h.selectedHelpdeskInstance
          ? `Leads Helpdesk — ${h.instances.find(i => i.id === h.selectedHelpdeskInstance)?.name || ''} — 7 dias`
          : undefined
        }
      />

      {/* Instance Groups Breakdown */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Grupos por Instância</h2>
          <Button variant="ghost" size="sm" onClick={h.handleRefreshStats} disabled={h.loadingStats}>
            <RefreshCw className={`w-4 h-4 mr-2 ${h.loadingStats ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {h.loadingStats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : h.instanceStats.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Nenhuma estatística disponível</p>
              <p className="text-sm mt-1">Conecte uma instância para ver os dados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {h.instanceStats.map((stat) => (
              <Card key={stat.instanceId} className="glass-card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium truncate">{stat.instanceName}</CardTitle>
                    <Badge
                      variant={stat.status === 'connected' || stat.status === 'online' ? 'default' : 'secondary'}
                      className={
                        stat.status === 'connected' || stat.status === 'online'
                          ? 'bg-green-500/10 text-green-600 border-green-500/20'
                          : ''
                      }
                    >
                      {stat.status === 'connected' || stat.status === 'online' ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      <span>Grupos</span>
                    </div>
                    <span className="font-semibold">{stat.groupsCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UsersRound className="w-4 h-4" />
                      <span>Participantes</span>
                    </div>
                    <span className="font-semibold">{stat.participantsCount.toLocaleString('pt-BR')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Helpdesk Metrics Section */}
      <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
        <HelpdeskMetricsCharts />
      </div>

      {/* Recent Instances */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
        <h2 className="text-lg font-semibold">Instâncias Recentes</h2>
        {h.instances.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Nenhuma instância encontrada"
            description={h.isSuperAdmin ? 'Acesse o menu "Instâncias" para criar uma nova' : undefined}
          />
        ) : (
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {h.instances.slice(0, 6).map((instance) => (
              <InstanceCard key={instance.id} instance={instance} showOwner={h.isSuperAdmin} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;
