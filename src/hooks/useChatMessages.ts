import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { nowBRISO } from '@/lib/dateUtils';
import { toast } from 'sonner';
import type { Conversation, Message } from '@/pages/dashboard/HelpDesk';

export const useChatMessages = (conversation: Conversation | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [iaAtivada, setIaAtivada] = useState(false);
  const [ativandoIa, setAtivandoIa] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const notes = messages.filter(m => m.direction === 'private_note');
  const chatMessages = messages.filter(m => m.direction !== 'private_note');

  // Load IA state from database when conversation changes
  useEffect(() => {
    setAtivandoIa(false);
    if (!conversation?.id) {
      setIaAtivada(false);
      return;
    }
    const loadStatusIa = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('status_ia')
        .eq('id', conversation.id)
        .maybeSingle();
      setIaAtivada((data as any)?.status_ia === 'ligada');
    };
    loadStatusIa();
  }, [conversation?.id]);

  const fetchMessages = async () => {
    if (!conversation) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversation?.id]);

  // Realtime via broadcast
  useEffect(() => {
    if (!conversation) return;
    const channel = supabase
      .channel('helpdesk-realtime')
      .on('broadcast', { event: 'new-message' }, (payload) => {
        if (payload.payload?.conversation_id === conversation.id) {
          fetchMessages();
          if (payload.payload?.status_ia === 'ligada') {
            setIaAtivada(true);
            supabase.from('conversations').update({ status_ia: 'ligada' } as any).eq('id', conversation.id).then();
          } else if (payload.payload?.status_ia === 'desligada') {
            setIaAtivada(false);
            supabase.from('conversations').update({ status_ia: 'desligada' } as any).eq('id', conversation.id).then();
          }
        }
      })
      .on('broadcast', { event: 'transcription-updated' }, (payload) => {
        const { messageId, conversationId, transcription } = payload.payload || {};
        if (conversationId === conversation.id && messageId && transcription) {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, transcription } : msg
          ));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id]);

  // Auto-scroll
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  const handleActivateIA = async () => {
    if (!conversation || ativandoIa) return;
    setAtivandoIa(true);
    try {
      const contact = conversation.contact;
      const inboxId = conversation.inbox_id;
      const instanceId = conversation.inbox?.instance_id || '';

      const { data: inboxData } = await supabase
        .from('inboxes')
        .select('webhook_outgoing_url, name')
        .eq('id', inboxId)
        .maybeSingle();

      const webhookUrl = inboxData?.webhook_outgoing_url;
      if (!webhookUrl) {
        toast.error('Nenhum webhook de saída configurado para esta caixa');
        return;
      }

      const { data: instanceData } = await supabase
        .from('instances')
        .select('name')
        .eq('id', instanceId)
        .maybeSingle();

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const userId = sessionData?.session?.user?.id;

      let currentAgentName = 'Agente';
      if (userId) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle();
        currentAgentName = profileData?.full_name || 'Agente';
      }

      const payload = {
        timestamp: nowBRISO(),
        instance_name: instanceData?.name || '',
        instanceName: instanceData?.name || '',
        instance_id: instanceId,
        inbox_name: inboxData?.name || '',
        inbox_id: inboxId,
        contact_name: contact?.name || contact?.phone || '',
        remotejid: contact?.jid || '',
        fromMe: true,
        agent_name: currentAgentName,
        agent_id: userId || '',
        pausar_agente: 'nao',
        status_ia: 'ligar',
        message_type: 'text',
        message: null,
        media_url: null,
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fire-outgoing-webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ webhook_url: webhookUrl, payload }),
        }
      );

      if (!response.ok) throw new Error('Falha ao ativar IA');
      toast.success('Solicitação de ativação da IA enviada');
    } catch (err) {
      console.error('Error activating IA:', err);
      toast.error('Erro ao ativar IA');
    } finally {
      setAtivandoIa(false);
    }
  };

  return {
    messages, setMessages,
    chatMessages, notes,
    loading, bottomRef,
    iaAtivada, setIaAtivada,
    ativandoIa, handleActivateIA,
    fetchMessages,
  };
};
