import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowLeft, User } from 'lucide-react';
import type { Conversation, Message } from '@/pages/dashboard/HelpDesk';

interface ChatPanelProps {
  conversation: Conversation | null;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack?: () => void;
  onShowInfo?: () => void;
}

export const ChatPanel = ({ conversation, onUpdateConversation, onBack, onShowInfo }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      .subscribe((status) => {
        console.log('[ChatPanel] channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

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
      <div className="h-14 px-3 md:px-4 flex items-center gap-2 md:gap-3 border-b border-border/50 bg-card/50 shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {contact?.name || contact?.phone || 'Desconhecido'}
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{contact?.phone}</p>
            {contact?.jid && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                {contact.jid.split('@')[0]}
              </span>
            )}
          </div>
        </div>
        {onShowInfo && (
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={onShowInfo}>
            <User className="w-5 h-5" />
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
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput conversation={conversation} onMessageSent={fetchMessages} />
    </>
  );
};
