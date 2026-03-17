import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Conversation, AiSummary } from '@/pages/dashboard/HelpDesk';

export interface InboxAgent {
  user_id: string;
  full_name: string;
}

export interface PastConversation {
  id: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  ai_summary: AiSummary | null;
  last_message: string | null;
}

interface UseContactInfoProps {
  conversation: Conversation;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
}

export const useContactInfo = ({ conversation, onUpdateConversation }: UseContactInfoProps) => {
  const [agents, setAgents] = useState<InboxAgent[]>([]);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(conversation.ai_summary || null);
  const [summarizing, setSummarizing] = useState(false);
  const [pastConversations, setPastConversations] = useState<PastConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const [generatingSummaryFor, setGeneratingSummaryFor] = useState<string | null>(null);
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);

  // Sync aiSummary when conversation changes
  useEffect(() => {
    setAiSummary(conversation.ai_summary || null);
  }, [conversation.id, conversation.ai_summary]);

  // Fetch past conversations
  useEffect(() => {
    const fetchHistory = async () => {
      if (!conversation.contact_id) return;
      setHistoryLoading(true);
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('id, status, last_message_at, created_at, ai_summary, last_message')
          .eq('contact_id', conversation.contact_id)
          .neq('id', conversation.id)
          .order('last_message_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setPastConversations(
          (data || []).map((c: any) => ({
            ...c,
            ai_summary: c.ai_summary || null,
          }))
        );
      } catch (err) {
        console.error('[ContactInfoPanel] fetchHistory error:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [conversation.id, conversation.contact_id]);

  // Fetch inbox agents
  useEffect(() => {
    const fetchAgents = async () => {
      if (!conversation.inbox_id) return;
      const { data: members, error: membersError } = await supabase
        .from('inbox_users')
        .select('user_id')
        .eq('inbox_id', conversation.inbox_id);

      if (membersError) {
        console.error('[ContactInfoPanel] fetchAgents members error:', membersError);
        return;
      }

      const userIds = members?.map(m => m.user_id) ?? [];
      if (userIds.length === 0) { setAgents([]); return; }

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('[ContactInfoPanel] fetchAgents profiles error:', profilesError);
        return;
      }

      setAgents(
        (profiles ?? [])
          .map(p => ({ user_id: p.id, full_name: p.full_name || 'Sem nome' }))
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
      );
    };
    fetchAgents();
  }, [conversation.inbox_id]);

  const callSummarize = async (conversationId: string, forceRefresh: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Não autenticado');

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-conversation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ conversation_id: conversationId, force_refresh: forceRefresh }),
      }
    );

    const result = await res.json();
    if (!res.ok) {
      if (res.status === 429) throw new Error('Limite de IA atingido. Tente mais tarde.');
      if (res.status === 402) throw new Error('Créditos de IA insuficientes.');
      throw new Error(result.error || 'Erro ao gerar resumo');
    }
    return result.summary;
  };

  const handleSummarize = async (forceRefresh = false) => {
    setSummarizing(true);
    try {
      const summary = await callSummarize(conversation.id, forceRefresh);
      setAiSummary(summary);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar resumo');
    } finally {
      setSummarizing(false);
    }
  };

  const handleGenerateHistorySummary = async (convId: string) => {
    setGeneratingSummaryFor(convId);
    try {
      const summary = await callSummarize(convId, false);
      setPastConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, ai_summary: summary } : c)
      );
      toast.success('Resumo gerado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar resumo');
    } finally {
      setGeneratingSummaryFor(null);
    }
  };

  const handleRemoveLabel = async (labelId: string, onLabelsChanged?: () => void) => {
    try {
      await supabase
        .from('conversation_labels')
        .delete()
        .eq('conversation_id', conversation.id)
        .eq('label_id', labelId);
      onLabelsChanged?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover etiqueta');
    }
  };

  const handleAssignAgent = async (value: string) => {
    const agentId = value === '__none__' ? null : value;
    const agent = agentId ? agents.find(a => a.user_id === agentId) : null;

    const { error } = await supabase
      .from('conversations')
      .update({ assigned_to: agentId })
      .eq('id', conversation.id);

    if (error) { toast.error('Erro ao atribuir agente'); return; }

    await supabase.channel('helpdesk-conversations').send({
      type: 'broadcast',
      event: 'assigned-agent',
      payload: { conversation_id: conversation.id, assigned_to: agentId },
    });

    onUpdateConversation(conversation.id, { assigned_to: agentId } as any);
    toast.success(agentId ? `Atribuído a ${agent?.full_name}` : 'Agente removido');
  };

  const toggleSummaryExpanded = (convId: string) => {
    setExpandedSummaries(prev => {
      const next = new Set(prev);
      next.has(convId) ? next.delete(convId) : next.add(convId);
      return next;
    });
  };

  return {
    agents,
    aiSummary,
    summarizing,
    pastConversations,
    historyLoading,
    historyExpanded,
    setHistoryExpanded,
    expandedSummaries,
    generatingSummaryFor,
    manageLabelsOpen,
    setManageLabelsOpen,
    handleSummarize,
    handleGenerateHistorySummary,
    handleRemoveLabel,
    handleAssignAgent,
    toggleSummaryExpanded,
  };
};
