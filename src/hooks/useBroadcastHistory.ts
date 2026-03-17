import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// ─── Types ───────────────────────────────────────────────────────────
export interface BroadcastLog {
  id: string;
  instance_id: string;
  instance_name: string | null;
  message_type: string;
  content: string | null;
  media_url: string | null;
  groups_targeted: number;
  recipients_targeted: number;
  recipients_success: number;
  recipients_failed: number;
  exclude_admins: boolean;
  random_delay: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  group_names: string[] | null;
  carousel_data: Json | null;
}

export type StatusFilter = 'all' | 'completed' | 'cancelled' | 'error';
export type MessageTypeFilter = 'all' | 'text' | 'image' | 'video' | 'audio' | 'document' | 'carousel';
export type TargetFilter = 'all' | 'groups' | 'leads';

// ─── Helpers ─────────────────────────────────────────────────────────
export const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  return secs > 0 ? `${minutes}min ${secs}s` : `${minutes}min`;
};

export const getDeliveryRate = (success: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((success / total) * 100);
};

export const getMessageTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    image: 'Imagem', video: 'Vídeo', audio: 'Áudio', ptt: 'Áudio',
    document: 'Documento', carousel: 'Carrossel',
  };
  return map[type] || 'Texto';
};

// ─── Hook ────────────────────────────────────────────────────────────
export function useBroadcastHistory() {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<MessageTypeFilter>('all');
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all');
  const [instanceFilter, setInstanceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<BroadcastLog | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // ─ Query
  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['broadcast-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcast_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as BroadcastLog[];
    },
  });

  // ─ Mutations
  const deleteMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase.from('broadcast_logs').delete().eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-logs'] });
      toast.success('Registro excluído com sucesso');
      setDeleteDialogOpen(false);
      setLogToDelete(null);
    },
    onError: (error) => toast.error('Erro ao excluir registro: ' + (error as Error).message),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (logIds: string[]) => {
      const { error } = await supabase.from('broadcast_logs').delete().in('id', logIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-logs'] });
      toast.success(`${selectedIds.size} registros excluídos com sucesso`);
      setBatchDeleteDialogOpen(false);
      setSelectedIds(new Set());
    },
    onError: (error) => toast.error('Erro ao excluir registros: ' + (error as Error).message),
  });

  // ─ Unique instances
  const uniqueInstances = useMemo(() => {
    if (!logs) return [];
    const map = new Map<string, string>();
    logs.forEach(log => {
      if (log.instance_id && !map.has(log.instance_id))
        map.set(log.instance_id, log.instance_name || log.instance_id);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  // ─ Filtered logs
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (typeFilter !== 'all' && log.message_type !== typeFilter) return false;
      if (targetFilter !== 'all') {
        const isLead = log.groups_targeted === 0;
        if (targetFilter === 'leads' && !isLead) return false;
        if (targetFilter === 'groups' && isLead) return false;
      }
      if (instanceFilter !== 'all' && log.instance_id !== instanceFilter) return false;
      if (dateFrom) {
        if (isBefore(parseISO(log.created_at), startOfDay(parseISO(dateFrom)))) return false;
      }
      if (dateTo) {
        if (isAfter(parseISO(log.created_at), endOfDay(parseISO(dateTo)))) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = log.content?.toLowerCase().includes(q)
          || log.instance_name?.toLowerCase().includes(q)
          || log.group_names?.some(n => n.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [logs, statusFilter, typeFilter, targetFilter, instanceFilter, dateFrom, dateTo, searchQuery]);

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || targetFilter !== 'all' || instanceFilter !== 'all' || dateFrom || dateTo || searchQuery;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (targetFilter !== 'all') count++;
    if (instanceFilter !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (searchQuery) count++;
    return count;
  }, [statusFilter, typeFilter, targetFilter, instanceFilter, dateFrom, dateTo, searchQuery]);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setTargetFilter('all');
    setInstanceFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  }, []);

  // ─ Selection
  const toggleSelection = useCallback((logId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(logId) ? next.delete(logId) : next.add(logId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === filteredLogs.length ? new Set() : new Set(filteredLogs.map(l => l.id))
    );
  }, [filteredLogs]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ─ Delete handlers
  const handleDeleteClick = useCallback((log: BroadcastLog) => {
    setLogToDelete(log);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (logToDelete) deleteMutation.mutate(logToDelete.id);
  }, [logToDelete, deleteMutation]);

  const confirmBatchDelete = useCallback(() => {
    if (selectedIds.size > 0) batchDeleteMutation.mutate(Array.from(selectedIds));
  }, [selectedIds, batchDeleteMutation]);

  return {
    // Data
    logs, filteredLogs, isLoading, isRefetching, refetch, uniqueInstances,
    // Filters
    statusFilter, setStatusFilter, typeFilter, setTypeFilter,
    targetFilter, setTargetFilter, instanceFilter, setInstanceFilter,
    dateFrom, setDateFrom, dateTo, setDateTo, searchQuery, setSearchQuery,
    hasActiveFilters, activeFilterCount, clearFilters,
    filtersExpanded, setFiltersExpanded,
    // Expand
    expandedId, setExpandedId,
    // Selection
    selectedIds, toggleSelection, toggleSelectAll, clearSelection,
    // Delete
    deleteDialogOpen, setDeleteDialogOpen, logToDelete,
    batchDeleteDialogOpen, setBatchDeleteDialogOpen,
    handleDeleteClick, confirmDelete, confirmBatchDelete,
    deleteMutation, batchDeleteMutation,
  };
}
