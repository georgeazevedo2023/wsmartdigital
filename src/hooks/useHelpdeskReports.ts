import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PeriodFilter = '7d' | '30d' | '90d';

interface ConversationByStatus {
  status: string;
  count: number;
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalConversations: number;
  resolvedConversations: number;
  avgResponseMinutes: number;
}

interface VolumeDataPoint {
  date: string;
  label: string;
  count: number;
}

interface ResponseTimePoint {
  inboxName: string;
  avgSeconds: number;
  msgCount: number;
}

export interface HelpdeskReportsData {
  conversationsByStatus: ConversationByStatus[];
  agentPerformance: AgentPerformance[];
  volumeByPeriod: VolumeDataPoint[];
  responseTime: ResponseTimePoint[];
  loading: boolean;
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  selectedInboxId: string;
  setSelectedInboxId: (id: string) => void;
  inboxes: { id: string; name: string }[];
}

const periodToDays: Record<PeriodFilter, number> = { '7d': 7, '30d': 30, '90d': 90 };

export function useHelpdeskReports(): HelpdeskReportsData {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [selectedInboxId, setSelectedInboxId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [inboxes, setInboxes] = useState<{ id: string; name: string }[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - periodToDays[period]);
    return d.toISOString();
  }, [period]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch inboxes
      const { data: inboxData } = await supabase.from('inboxes').select('id, name').order('name');
      setInboxes(inboxData || []);

      // Fetch conversations with messages
      let query = supabase
        .from('conversations')
        .select('id, status, inbox_id, assigned_to, created_at, inboxes(name), conversation_messages(created_at, direction)')
        .gte('created_at', since);

      if (selectedInboxId !== 'all') {
        query = query.eq('inbox_id', selectedInboxId);
      }

      const { data: convData } = await query;
      const convs = convData || [];
      setConversations(convs);

      // Fetch agent profiles
      const agentIds = [...new Set(convs.map((c: any) => c.assigned_to).filter(Boolean))];
      if (agentIds.length > 0) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', agentIds);
        setProfiles(new Map((profileData || []).map(p => [p.id, p.full_name || p.id])));
      } else {
        setProfiles(new Map());
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }, [since, selectedInboxId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Conversations by status
  const conversationsByStatus = useMemo(() => {
    const map = new Map<string, number>();
    conversations.forEach((c: any) => {
      const s = c.status || 'aberta';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
  }, [conversations]);

  // Agent performance
  const agentPerformance = useMemo(() => {
    const map = new Map<string, { total: number; resolved: number; responseMins: number[] }>();
    conversations.forEach((c: any) => {
      if (!c.assigned_to) return;
      const existing = map.get(c.assigned_to) || { total: 0, resolved: 0, responseMins: [] };
      existing.total++;
      if (c.status === 'resolvida') existing.resolved++;

      const msgs = c.conversation_messages || [];
      const incoming = msgs.filter((m: any) => m.direction === 'incoming').sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const outgoing = msgs.filter((m: any) => m.direction === 'outgoing').sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (incoming.length && outgoing.length) {
        const diff = (new Date(outgoing[0].created_at).getTime() - new Date(incoming[0].created_at).getTime()) / 60000;
        if (diff > 0 && diff < 1440) existing.responseMins.push(diff);
      }
      map.set(c.assigned_to, existing);
    });

    return Array.from(map.entries()).map(([agentId, data]) => ({
      agentId,
      agentName: profiles.get(agentId) || 'Desconhecido',
      totalConversations: data.total,
      resolvedConversations: data.resolved,
      avgResponseMinutes: data.responseMins.length
        ? Math.round((data.responseMins.reduce((a, b) => a + b, 0) / data.responseMins.length) * 10) / 10
        : 0,
    })).sort((a, b) => b.totalConversations - a.totalConversations);
  }, [conversations, profiles]);

  // Volume by day
  const volumeByPeriod = useMemo(() => {
    const map = new Map<string, number>();
    conversations.forEach((c: any) => {
      const date = c.created_at?.slice(0, 10);
      if (date) map.set(date, (map.get(date) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        label: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        count,
      }));
  }, [conversations]);

  // Response time per inbox
  const responseTime = useMemo(() => {
    const inboxMap = new Map<string, { name: string; secs: number[] }>();
    conversations.forEach((c: any) => {
      const msgs = c.conversation_messages || [];
      const sorted = [...msgs].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      sorted.forEach((msg: any, idx: number) => {
        if (msg.direction !== 'incoming') return;
        const nextOut = sorted.slice(idx + 1).find((m: any) => m.direction === 'outgoing');
        if (!nextOut) return;
        const diffSecs = (new Date(nextOut.created_at).getTime() - new Date(msg.created_at).getTime()) / 1000;
        if (diffSecs <= 0 || diffSecs >= 3600) return;
        const key = c.inbox_id;
        const existing = inboxMap.get(key) || { name: (c.inboxes as any)?.name || key, secs: [] };
        existing.secs.push(diffSecs);
        inboxMap.set(key, existing);
      });
    });
    return Array.from(inboxMap.entries()).map(([, val]) => ({
      inboxName: val.name,
      avgSeconds: Math.round((val.secs.reduce((a, b) => a + b, 0) / val.secs.length) * 10) / 10,
      msgCount: val.secs.length,
    })).sort((a, b) => a.avgSeconds - b.avgSeconds);
  }, [conversations]);

  return {
    conversationsByStatus, agentPerformance, volumeByPeriod, responseTime,
    loading, period, setPeriod, selectedInboxId, setSelectedInboxId, inboxes,
  };
}
