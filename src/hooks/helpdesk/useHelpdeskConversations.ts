import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

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
  ai_summary?: { reason: string; summary: string; resolution: string; generated_at: string; message_count: number } | null;
  contact?: { id: string; name: string | null; phone: string; jid: string; profile_pic_url: string | null };
  inbox?: { id: string; name: string; instance_id: string; webhook_outgoing_url?: string | null };
  last_message?: string;
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

interface UseHelpdeskConversationsParams {
  user: User | null;
  selectedInboxId: string;
  isMobile: boolean;
  setMobileView: (v: 'list' | 'chat' | 'info') => void;
  fetchConversationLabels: (ids: string[]) => Promise<void>;
  fetchConversationNotes: (ids: string[]) => Promise<void>;
  conversationLabelsMap: Record<string, string[]>;
}

export function useHelpdeskConversations({
  user, selectedInboxId, isMobile, setMobileView,
  fetchConversationLabels, fetchConversationNotes, conversationLabelsMap,
}: UseHelpdeskConversationsParams) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('aberta');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignmentFilter, setAssignmentFilter] = useState<'todas' | 'minhas' | 'nao-atribuidas'>('todas');
  const [priorityFilter, setPriorityFilter] = useState<'todas' | 'alta' | 'media' | 'baixa'>('todas');
  const [labelFilter, setLabelFilter] = useState<string | null>(null);

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

  const handleSelectConversation = useCallback(async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (isMobile) setMobileView('chat');
    if (!conversation.is_read) {
      await supabase.from('conversations').update({ is_read: true }).eq('id', conversation.id);
      setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, is_read: true } : c));
    }
  }, [isMobile, setMobileView]);

  const handleUpdateConversation = useCallback(async (id: string, updates: Partial<Omit<Conversation, 'ai_summary'>>) => {
    await supabase.from('conversations').update(updates).eq('id', id);
    fetchConversations();
    if (selectedConversation?.id === id) {
      setSelectedConversation(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [fetchConversations, selectedConversation?.id]);

  const handleAgentAssigned = useCallback((conversationId: string, agentId: string) => {
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, assigned_to: agentId } : c));
    setSelectedConversation(prev => prev?.id === conversationId ? { ...prev, assigned_to: agentId } : prev);
  }, []);

  const filteredConversations = useMemo(() => conversations.filter(c => {
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
  }), [conversations, searchQuery, labelFilter, conversationLabelsMap, assignmentFilter, user?.id, priorityFilter]);

  return {
    conversations, setConversations, selectedConversation, setSelectedConversation,
    statusFilter, setStatusFilter, searchQuery, setSearchQuery, loading,
    assignmentFilter, setAssignmentFilter, priorityFilter, setPriorityFilter,
    labelFilter, setLabelFilter, filteredConversations,
    fetchConversations, handleSelectConversation, handleUpdateConversation, handleAgentAssigned,
  };
}
