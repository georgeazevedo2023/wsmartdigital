import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfDay, subDays } from 'date-fns';
import { formatBR } from '@/lib/dateUtils';

export interface DashboardInstance {
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

export interface InstanceStats {
  instanceId: string;
  instanceName: string;
  groupsCount: number;
  participantsCount: number;
  status: string;
}

export interface HelpdeskLeadsStats {
  today: number;
  yesterday: number;
  total: number;
  dailyData: { day: string; label: string; leads: number }[];
}

export function useDashboardStats() {
  const { profile, isSuperAdmin } = useAuth();
  const [instances, setInstances] = useState<DashboardInstance[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [instanceStats, setInstanceStats] = useState<InstanceStats[]>([]);
  const [helpdeskLeads, setHelpdeskLeads] = useState<HelpdeskLeadsStats>({ today: 0, yesterday: 0, total: 0, dailyData: [] });
  const [selectedHelpdeskInstance, setSelectedHelpdeskInstance] = useState<string | null>(null);

  const fetchHelpdeskLeadsStats = useCallback(async (instanceId?: string) => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
      const sevenDaysAgo = startOfDay(subDays(now, 6)).toISOString();

      let databaseIds: string[] | null = null;
      if (instanceId) {
        const { data: dbs } = await supabase
          .from('lead_databases')
          .select('id')
          .eq('instance_id', instanceId);
        databaseIds = dbs?.map(d => d.id) || [];
        if (databaseIds.length === 0) {
          setHelpdeskLeads({ today: 0, yesterday: 0, total: 0, dailyData: [] });
          return;
        }
      }

      const buildQuery = (baseQuery: ReturnType<typeof supabase.from>) => {
        let q = baseQuery;
        if (databaseIds) {
          q = q.in('database_id', databaseIds);
        }
        return q;
      };

      const [todayRes, yesterdayRes, totalRes, weekRes] = await Promise.all([
        buildQuery(
          supabase.from('lead_database_entries').select('id', { count: 'exact', head: true }).eq('source', 'helpdesk').gte('created_at', todayStart)
        ),
        buildQuery(
          supabase.from('lead_database_entries').select('id', { count: 'exact', head: true }).eq('source', 'helpdesk').gte('created_at', yesterdayStart).lt('created_at', todayStart)
        ),
        buildQuery(
          supabase.from('lead_database_entries').select('id', { count: 'exact', head: true }).eq('source', 'helpdesk')
        ),
        buildQuery(
          supabase.from('lead_database_entries').select('created_at').eq('source', 'helpdesk').gte('created_at', sevenDaysAgo).order('created_at', { ascending: true })
        ),
      ]);

      const todayCount = todayRes.count || 0;
      const yesterdayCount = yesterdayRes.count || 0;
      const totalCount = totalRes.count || 0;

      const dayMap = new Map<string, number>();
      const now2 = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = subDays(now2, i);
        dayMap.set(formatBR(d, 'yyyy-MM-dd'), 0);
      }
      weekRes.data?.forEach((entry) => {
        const dayKey = formatBR(entry.created_at!, 'yyyy-MM-dd');
        dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
      });

      const dailyData = Array.from(dayMap.entries()).map(([day, count]) => ({
        day,
        label: formatBR(day, 'EEE'),
        leads: count,
      }));

      setHelpdeskLeads({ today: todayCount, yesterday: yesterdayCount, total: totalCount, dailyData });
    } catch (error) {
      console.error('Error fetching helpdesk leads stats:', error);
    }
  }, []);

  const fetchGroupsStats = useCallback(async (instancesList: DashboardInstance[]) => {
    setLoadingStats(true);
    const stats: InstanceStats[] = [];

    const connectedList = instancesList.filter(i => i.status === 'connected' || i.status === 'online');

    await Promise.all(
      connectedList.map(async (instance) => {
        try {
          const { data, error } = await supabase.functions.invoke('uazapi-proxy', {
            body: { action: 'groups', token: instance.token },
          });
          if (error) throw error;

          const groups = Array.isArray(data) ? data : [];
          let totalParticipants = 0;
          groups.forEach((group: Record<string, unknown>) => {
            const count =
              (group.ParticipantCount as number) ||
              (group.Size as number) ||
              (group.size as number) ||
              (Array.isArray(group.Participants) ? group.Participants.length : 0) ||
              (Array.isArray(group.participants) ? group.participants.length : 0) ||
              0;
            totalParticipants += count;
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

    const offlineInstances = instancesList.filter(i => i.status !== 'connected' && i.status !== 'online');
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
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (instancesError) throw instancesError;

      if (instancesData && instancesData.length > 0) {
        const userIds = [...new Set(instancesData.map(i => i.user_id))];
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        const instancesWithProfiles = instancesData.map(instance => ({
          ...instance,
          user_profiles: profilesMap.get(instance.user_id),
        }));

        setInstances(instancesWithProfiles as DashboardInstance[]);
        await fetchGroupsStats(instancesWithProfiles as DashboardInstance[]);
      } else {
        setInstances([]);
      }

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
  }, [isSuperAdmin, fetchGroupsStats]);

  useEffect(() => {
    fetchData();
    fetchHelpdeskLeadsStats();
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchHelpdeskLeadsStats(selectedHelpdeskInstance ?? undefined);
  }, [selectedHelpdeskInstance]);

  useEffect(() => {
    const channel = supabase
      .channel('helpdesk-leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_database_entries', filter: 'source=eq.helpdesk' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchHelpdeskLeadsStats(selectedHelpdeskInstance ?? undefined);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedHelpdeskInstance, fetchHelpdeskLeadsStats]);

  const handleRefreshStats = useCallback(async () => {
    if (instances.length === 0) return;
    toast.info('Atualizando estatísticas...');
    await fetchGroupsStats(instances);
    toast.success('Estatísticas atualizadas!');
  }, [instances, fetchGroupsStats]);

  const connectedInstances = useMemo(() =>
    instances.filter(i => i.status === 'connected' || i.status === 'online'),
    [instances]
  );

  const disconnectedInstances = useMemo(() =>
    instances.filter(i => i.status !== 'connected' && i.status !== 'online'),
    [instances]
  );

  const totalGroups = useMemo(() => instanceStats.reduce((acc, s) => acc + s.groupsCount, 0), [instanceStats]);
  const totalParticipants = useMemo(() => instanceStats.reduce((acc, s) => acc + s.participantsCount, 0), [instanceStats]);

  return {
    profile,
    isSuperAdmin,
    instances,
    totalUsers,
    loading,
    loadingStats,
    instanceStats,
    helpdeskLeads,
    selectedHelpdeskInstance,
    setSelectedHelpdeskInstance,
    connectedInstances,
    disconnectedInstances,
    totalGroups,
    totalParticipants,
    handleRefreshStats,
  };
}
