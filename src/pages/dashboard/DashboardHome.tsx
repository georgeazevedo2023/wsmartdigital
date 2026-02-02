import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import StatsCard from '@/components/dashboard/StatsCard';
import InstanceCard from '@/components/dashboard/InstanceCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Users, Wifi, WifiOff, MessageSquare, UsersRound, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Instance {
  id: string;
  name: string;
  status: string;
  owner_jid: string | null;
  profile_pic_url: string | null;
  user_id: string;
  token: string;
  user_profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface InstanceStats {
  instanceId: string;
  instanceName: string;
  groupsCount: number;
  participantsCount: number;
  status: string;
}

const DashboardHome = () => {
  const { profile, isSuperAdmin } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [instanceStats, setInstanceStats] = useState<InstanceStats[]>([]);

  useEffect(() => {
    fetchData();
  }, [isSuperAdmin]);

  const fetchData = async () => {
    try {
      // Fetch instances
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (instancesError) throw instancesError;

      // Fetch user profiles for each instance
      if (instancesData && instancesData.length > 0) {
        const userIds = [...new Set(instancesData.map((i) => i.user_id))];
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

        const instancesWithProfiles = instancesData.map((instance) => ({
          ...instance,
          user_profiles: profilesMap.get(instance.user_id),
        }));

        setInstances(instancesWithProfiles as Instance[]);
        
        // Fetch groups stats for each connected instance
        await fetchGroupsStats(instancesWithProfiles as Instance[]);
      } else {
        setInstances([]);
      }

      // Fetch total users count if super admin
      if (isSuperAdmin) {
        const { count } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });
        setTotalUsers(count || 0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupsStats = async (instancesList: Instance[]) => {
    setLoadingStats(true);
    const stats: InstanceStats[] = [];

    const connectedInstances = instancesList.filter(
      (i) => i.status === 'connected' || i.status === 'online'
    );

    await Promise.all(
      connectedInstances.map(async (instance) => {
        try {
          const { data, error } = await supabase.functions.invoke('uazapi-proxy', {
            body: {
              action: 'groups',
              token: instance.token,
            },
          });

          if (error) throw error;

          const groups = Array.isArray(data) ? data : [];
          let totalParticipants = 0;

          // Sum participants from each group
          // UAZAPI returns fields in PascalCase, check all possible formats
          groups.forEach((group: Record<string, unknown>) => {
            const participantCount = 
              (group.ParticipantCount as number) ||
              (group.Size as number) ||
              (group.size as number) ||
              (Array.isArray(group.Participants) ? group.Participants.length : 0) ||
              (Array.isArray(group.participants) ? group.participants.length : 0) ||
              0;
            totalParticipants += participantCount;
          });

          stats.push({
            instanceId: instance.id,
            instanceName: instance.name,
            groupsCount: groups.length,
            participantsCount: totalParticipants,
            status: instance.status,
          });
        } catch (error) {
          console.error(`Error fetching groups for ${instance.name}:`, error);
          stats.push({
            instanceId: instance.id,
            instanceName: instance.name,
            groupsCount: 0,
            participantsCount: 0,
            status: instance.status,
          });
        }
      })
    );

    // Add offline instances with 0 stats
    const offlineInstances = instancesList.filter(
      (i) => i.status !== 'connected' && i.status !== 'online'
    );
    offlineInstances.forEach((instance) => {
      stats.push({
        instanceId: instance.id,
        instanceName: instance.name,
        groupsCount: 0,
        participantsCount: 0,
        status: instance.status,
      });
    });

    setInstanceStats(stats);
    setLoadingStats(false);
  };

  const handleRefreshStats = async () => {
    if (instances.length === 0) return;
    toast.info('Atualizando estatísticas...');
    await fetchGroupsStats(instances);
    toast.success('Estatísticas atualizadas!');
  };

  const connectedInstances = instances.filter(
    (i) => i.status === 'connected' || i.status === 'online'
  );
  const disconnectedInstances = instances.filter(
    (i) => i.status !== 'connected' && i.status !== 'online'
  );

  const totalGroups = instanceStats.reduce((acc, s) => acc + s.groupsCount, 0);
  const totalParticipants = instanceStats.reduce((acc, s) => acc + s.participantsCount, 0);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-display font-bold">
          Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}! 👋
        </h1>
        <p className="text-muted-foreground">
          {isSuperAdmin
            ? 'Visão geral de todas as instâncias do sistema'
            : 'Gerencie suas instâncias do WhatsApp'}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <StatsCard
          title="Total de Instâncias"
          value={instances.length}
          icon={Server}
        />
        <StatsCard
          title="Instâncias Online"
          value={connectedInstances.length}
          icon={Wifi}
        />
        <StatsCard
          title="Total de Grupos"
          value={loadingStats ? '...' : totalGroups}
          icon={MessageSquare}
        />
        <StatsCard
          title="Total de Participantes"
          value={loadingStats ? '...' : totalParticipants.toLocaleString('pt-BR')}
          icon={UsersRound}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
        <StatsCard
          title="Instâncias Offline"
          value={disconnectedInstances.length}
          icon={WifiOff}
        />
        {isSuperAdmin && (
          <StatsCard
            title="Total de Usuários"
            value={totalUsers}
            icon={Users}
          />
        )}
      </div>

      {/* Instance Groups Breakdown */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Grupos por Instância</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshStats}
            disabled={loadingStats}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
        
        {loadingStats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : instanceStats.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Nenhuma estatística disponível</p>
              <p className="text-sm mt-1">Conecte uma instância para ver os dados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instanceStats.map((stat) => (
              <Card 
                key={stat.instanceId} 
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium truncate">
                      {stat.instanceName}
                    </CardTitle>
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

      {/* Recent Instances */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
        <h2 className="text-lg font-semibold">Instâncias Recentes</h2>
        {instances.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma instância encontrada</p>
            {isSuperAdmin && (
              <p className="text-sm mt-2">
                Acesse o menu "Instâncias" para criar uma nova
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instances.slice(0, 6).map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                showOwner={isSuperAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;
