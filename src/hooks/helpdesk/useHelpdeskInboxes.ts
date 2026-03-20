import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

interface Inbox {
  id: string;
  name: string;
  instance_id: string;
  webhook_outgoing_url?: string | null;
}

export function useHelpdeskInboxes(user: User | null, isSuperAdmin: boolean, inboxParam: string | null, isMobile: boolean) {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const fetchInboxes = async () => {
      if (!user) return;
      let inboxData: Inbox[] = [];

      if (isSuperAdmin) {
        const { data, error } = await supabase.from('inboxes').select('id, name, instance_id, webhook_outgoing_url').order('name');
        if (!error && data) inboxData = data;
      } else {
        const { data, error } = await supabase.from('inbox_users').select('inboxes(id, name, instance_id, webhook_outgoing_url)').eq('user_id', user.id);
        if (!error && data) {
          inboxData = data.map((d: any) => d.inboxes).filter(Boolean) as Inbox[];
        }
      }

      if (inboxData.length > 0) {
        setInboxes(inboxData);
        const targetInbox = inboxParam && inboxData.some(ib => ib.id === inboxParam) ? inboxParam : inboxData[0].id;
        setSelectedInboxId(targetInbox);
      }
    };
    fetchInboxes();
  }, [user, inboxParam, isSuperAdmin]);

  const handleSync = useCallback(async (onSynced: () => void) => {
    if (!selectedInboxId || syncing) return;
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ inbox_id: selectedInboxId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Sync failed');
      toast({ title: 'Sincronização concluída', description: `${result.synced} conversas sincronizadas${result.errors > 0 ? `, ${result.errors} erros` : ''}` });
      onSynced();
    } catch (err: any) {
      toast({ title: 'Erro na sincronização', description: err.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }, [selectedInboxId, syncing]);

  const handleInboxChange = useCallback((newInboxId: string, resetCallback: () => void) => {
    setSelectedInboxId(newInboxId);
    resetCallback();
  }, []);

  return { inboxes, selectedInboxId, setSelectedInboxId, syncing, handleSync, handleInboxChange };
}
