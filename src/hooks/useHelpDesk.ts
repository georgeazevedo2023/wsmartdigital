import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import type { Label } from '@/components/helpdesk/ConversationLabels';

export interface AiSummary {
  reason: string;
  summary: string;
  resolution: string;
  generated_at: string;
  message_count: number;
}

export interface Conversation {
  id: string;
  inbox_id: string;
  contact_id: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  is_read: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  ai_summary?: AiSummary | null;
  contact?: {
    id: string;
    name: string | null;
    phone: string;
    jid: string;
    profile_pic_url: string | null;
  };
  inbox?: {
    id: string;
    name: string;
    instance_id: string;
    webhook_outgoing_url?: string | null;
  };
  last_message?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: string;
  content: string | null;
  media_type: string;
  media_url: string | null;
  sender_id: string | null;
  external_id: string | null;
  created_at: string;
  transcription?: string | null;
}

interface Inbox {
  id: string;
  name: string;
  instance_id: string;
  webhook_outgoing_url?: string | null;
}

function mediaPreview(mediaType: string): string {
  switch (mediaType) {
    case 'image': return '📷 Foto';
    case 'video': return '🎥 Vídeo';
    case 'audio': return '🎵 Áudio';
    case 'document': return '📎 Documento';
    default: return '';
  }
}

export function useHelpDesk() {
  const { user, isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const inboxParam = searchParams.get('inbox');
  const isMobile = useIsMobile();

  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('aberta');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [syncedInboxes, setSyncedInboxes] = useState<Set<string>>(new Set());

  const [inboxLabels, setInboxLabels] = useState<Label[]>([]);
  const [conversationLabelsMap, setConversationLabelsMap] = useState<Record<string, string[]>>({});
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [agentNamesMap, setAgentNamesMap] = useState<Record<string, string>>({});
  const [conversationNotesSet, setConversationNotesSet] = useState<Set<string>>(new Set());

  const [assignmentFilter, setAssignmentFilter] = useState<'todas' | 'minhas' | 'nao-atribuidas'>('todas');
  const [priorityFilter, setPriorityFilter] = useState<'todas' | 'alta' | 'media' | 'baixa'>('todas');
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);

  // Fetch inboxes
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

  const fetchLabels = useCallback(async () => {
    if (!selectedInboxId) return;
    const { data } = await supabase.from('labels').select('*').eq('inbox_id', selectedInboxId).order('name');
    setInboxLabels((data as Label[]) || []);
  }, [selectedInboxId]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  const fetchAgentNames = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('id, full_name');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(p => { if (p.full_name) map[p.id] = p.full_name; });
      setAgentNamesMap(map);
    }
  }, []);

  useEffect(() => { fetchAgentNames(); }, [fetchAgentNames]);

  const fetchConversationLabels = useCallback(async (convIds: string[]) => {
    if (convIds.length === 0) { setConversationLabelsMap({}); return; }
    const { data } = await supabase.from('conversation_labels').select('conversation_id, label_id').in('conversation_id', convIds);
    const map: Record<string, string[]> = {};
    (data || []).forEach(cl => {
      if (!map[cl.conversation_id]) map[cl.conversation_id] = [];
      map[cl.conversation_id].push(cl.label_id);
    });
    setConversationLabelsMap(map);
  }, []);

  const fetchConversationNotes = useCallback(async (convIds: string[]) => {
    if (convIds.length === 0) { setConversationNotesSet(new Set()); return; }
    const { data } = await supabase.from('conversation_messages').select('conversation_id').in('conversation_id', convIds).eq('direction', 'private_note');
    setConversationNotesSet(new Set((data || []).map((m: any) => m.conversation_id)));
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user || !selectedInboxId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('conversations')
        .select('*, contacts(*), inboxes(id, name, instance_id, webhook_outgoing_url)')
        .eq('inbox_id', selectedInboxId)
        .order('last_message_at', { ascending: false });

      if (statusFilter !== 'todas') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;

      const convIds = (data || []).map((c: any) => c.id);
      await Promise.all([fetchConversationLabels(convIds), fetchConversationNotes(convIds)]);

      setConversations((data || []).map((c: any) => ({
        ...c, contact: c.contacts, inbox: c.inboxes,
        last_message: c.last_message || null, ai_summary: c.ai_summary || null,
      })));
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedInboxId, statusFilter, fetchConversationLabels, fetchConversationNotes]);

  useEffect(() => {
    setSelectedConversation(prev => prev && prev.inbox_id !== selectedInboxId ? null : prev);
  }, [selectedInboxId]);

  useEffect(() => { if (selectedInboxId) fetchConversations(); }, [fetchConversations]);

  // Realtime
  useEffect(() => {
    if (!selectedInboxId) return;
    const channel = supabase
      .channel('helpdesk-conversations')
      .on('broadcast', { event: 'new-message' }, (payload) => {
        const data = payload.payload;
        if (data?.inbox_id === selectedInboxId) {
          setConversations(prev => {
            const exists = prev.some(c => c.id === data.conversation_id);
            if (exists) {
              return prev.map(c =>
                c.id === data.conversation_id
                  ? { ...c, last_message: data.content || mediaPreview(data.media_type) || c.last_message, last_message_at: data.created_at, is_read: false }
                  : c
              ).sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
            }
            fetchConversations();
            return prev;
          });
        }
      })
      .on('broadcast', { event: 'assigned-agent' }, (payload) => {
        const { conversation_id, assigned_to } = payload.payload || {};
        if (!conversation_id) return;
        setConversations(prev => prev.map(c => c.id === conversation_id ? { ...c, assigned_to: assigned_to ?? null } : c));
        setSelectedConversation(prev => prev?.id === conversation_id ? { ...prev, assigned_to: assigned_to ?? null } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedInboxId, fetchConversations]);

  const handleSync = async () => {
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
      fetchConversations();
    } catch (err: any) {
      toast({ title: 'Erro na sincronização', description: err.message || 'Tente novamente', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (isMobile) setMobileView('chat');
    if (!conversation.is_read) {
      await supabase.from('conversations').update({ is_read: true }).eq('id', conversation.id);
      setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, is_read: true } : c));
    }
  };

  const handleUpdateConversation = async (id: string, updates: Partial<Omit<Conversation, 'ai_summary'>>) => {
    await supabase.from('conversations').update(updates).eq('id', id);
    fetchConversations();
    if (selectedConversation?.id === id) {
      setSelectedConversation(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleLabelsChanged = () => {
    fetchLabels();
    fetchConversationLabels(conversations.map(c => c.id));
  };

  const handleAgentAssigned = (conversationId: string, agentId: string) => {
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, assigned_to: agentId } : c));
    setSelectedConversation(prev => prev?.id === conversationId ? { ...prev, assigned_to: agentId } : prev);
  };

  const handleInboxChange = (newInboxId: string) => {
    setSelectedConversation(null);
    setLabelFilter(null);
    setSelectedInboxId(newInboxId);
    if (isMobile) setMobileView('list');
  };

  const filteredConversations = conversations.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.contact?.name?.toLowerCase().includes(q) && !c.contact?.phone?.includes(q)) return false;
    }
    if (labelFilter) {
      const convLabels = conversationLabelsMap[c.id] || [];
      if (!convLabels.includes(labelFilter)) return false;
    }
    if (assignmentFilter === 'minhas' && c.assigned_to !== user?.id) return false;
    if (assignmentFilter === 'nao-atribuidas' && c.assigned_to !== null) return false;
    if (priorityFilter !== 'todas' && c.priority !== priorityFilter) return false;
    return true;
  });

  return {
    user, isMobile, mobileView, setMobileView,
    showContactInfo, setShowContactInfo, showConversationList, setShowConversationList,
    selectedConversation, setSelectedConversation, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, loading, inboxes, selectedInboxId,
    syncing, inboxLabels, conversationLabelsMap, labelFilter, setLabelFilter,
    agentNamesMap, conversationNotesSet, assignmentFilter, setAssignmentFilter,
    priorityFilter, setPriorityFilter, manageLabelsOpen, setManageLabelsOpen,
    filteredConversations, handleSync, handleSelectConversation,
    handleUpdateConversation, handleLabelsChanged, handleAgentAssigned, handleInboxChange,
  };
}
