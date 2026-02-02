import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import StatsCard from '@/components/dashboard/StatsCard';
import InstanceCard from '@/components/dashboard/InstanceCard';
import { Server, Users, Wifi, WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Instance {
  id: string;
  name: string;
  status: string;
  owner_jid: string | null;
  profile_pic_url: string | null;
  user_id: string;
  user_profiles?: {
    full_name: string | null;
    email: string;
  };
}

const DashboardHome = () => {
  const { profile, isSuperAdmin } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const connectedInstances = instances.filter(
    (i) => i.status === 'connected' || i.status === 'online'
  );
  const disconnectedInstances = instances.filter(
    (i) => i.status !== 'connected' && i.status !== 'online'
  );

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

      {/* Stats Grid */}
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

      {/* Recent Instances */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
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
