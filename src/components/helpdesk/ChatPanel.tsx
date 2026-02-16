import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, ArrowLeft, User, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose, UserCheck } from 'lucide-react';
import type { Conversation, Message } from '@/pages/dashboard/HelpDesk';
import type { Label } from './ConversationLabels';

interface ChatPanelProps {
  conversation: Conversation | null;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack?: () => void;
  onShowInfo?: () => void;
  onToggleInfo?: () => void;
  showingInfo?: boolean;
  onToggleList?: () => void;
  showingList?: boolean;
  inboxLabels?: Label[];
  assignedLabelIds?: string[];
  onLabelsChanged?: () => void;
}

export const ChatPanel = ({ conversation, onUpdateConversation, onBack, onShowInfo, onToggleInfo, showingInfo, onToggleList, showingList, inboxLabels, assignedLabelIds, onLabelsChanged }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [agentName, setAgentName] = useState<string | null>(null);

  // Fetch assigned agent name
  useEffect(() => {
    const fetchAgent = async () => {
      if (!conversation?.assigned_to) { setAgentName(null); return; }
      const { data } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', conversation.assigned_to)
        .maybeSingle();
      setAgentName(data?.full_name || null);
    };
    fetchAgent();
  }, [conversation?.assigned_to]);

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

  // Realtime via broadcast (bypasses RLS evaluation issues with postgres_changes)
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel('helpdesk-realtime')
      .on('broadcast', { event: 'new-message' }, (payload) => {
        console.log('[ChatPanel] broadcast received:', payload.payload?.conversation_id);
        if (payload.payload?.conversation_id === conversation.id) {
          fetchMessages();
        }
      })
      .on('broadcast', { event: 'transcription-updated' }, (payload) => {
        const { messageId, conversationId, transcription } = payload.payload || {};
        console.log('[ChatPanel] transcription-updated:', messageId, conversationId);
        if (conversationId === conversation.id && messageId && transcription) {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, transcription } : msg
          ));
        }
      })
      .subscribe((status) => {
        console.log('[ChatPanel] channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha uma conversa na lista para começar</p>
      </div>
    );
  }

  const contact = conversation.contact;

  return (
    <>
      {/* Header */}
      <div className="h-14 px-3 md:px-4 flex items-center gap-2 md:gap-3 border-b border-border/50 bg-card/50 shrink-0 z-10 relative overflow-hidden">
        {onBack && (
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        {onToggleList && (
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={onToggleList}>
            {showingList ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </Button>
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h3 className="font-semibold text-sm truncate">
            {contact?.name || contact?.phone || 'Desconhecido'}
          </h3>
          {contact?.phone && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {contact.phone}
            </span>
          )}
          <Select
            value={conversation.status}
            onValueChange={(status) => onUpdateConversation(conversation.id, { status })}
          >
            <SelectTrigger className="h-6 w-auto text-xs border-none bg-transparent shadow-none focus:ring-0 gap-1 px-1 [&>svg:last-child]:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="aberta">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Aberta</span>
              </SelectItem>
              <SelectItem value="pendente">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Pendente</span>
              </SelectItem>
              <SelectItem value="resolvida">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-muted-foreground/50" /> Resolvida</span>
              </SelectItem>
            </SelectContent>
          </Select>
          {agentName && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1 shrink-0 hidden sm:flex">
              <UserCheck className="w-3 h-3" />
              {agentName}
            </Badge>
          )}
        </div>
        {onShowInfo && (
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={onShowInfo}>
            <User className="w-5 h-5" />
          </Button>
        )}
        {onToggleInfo && (
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={onToggleInfo}>
            {showingInfo ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">
            Nenhuma mensagem ainda
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} instanceId={conversation.inbox?.instance_id} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput conversation={conversation} onMessageSent={fetchMessages} inboxLabels={inboxLabels} assignedLabelIds={assignedLabelIds} onLabelsChanged={onLabelsChanged} />
    </>
  );
};
