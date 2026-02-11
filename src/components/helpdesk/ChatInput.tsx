import { useState } from 'react';
import { Send, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Conversation } from '@/pages/dashboard/HelpDesk';

interface ChatInputProps {
  conversation: Conversation;
  onMessageSent: () => void;
}

export const ChatInput = ({ conversation, onMessageSent }: ChatInputProps) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isNote, setIsNote] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);

    try {
      if (isNote) {
        // Private note - just insert in DB
        const { error } = await supabase.from('conversation_messages').insert({
          conversation_id: conversation.id,
          direction: 'private_note',
          content: text.trim(),
          media_type: 'text',
          sender_id: user.id,
        });
        if (error) throw error;
      } else {
        // Send via UAZAPI first
        const { data: instanceData } = await supabase
          .from('instances')
          .select('token')
          .eq('id', conversation.inbox?.instance_id || '')
          .maybeSingle();

        if (!instanceData?.token) {
          toast.error('Instância não encontrada');
          return;
        }

        const contactJid = conversation.contact?.jid;
        if (!contactJid) {
          toast.error('Contato sem JID');
          return;
        }

        // Send via proxy
        const { data: session } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.session?.access_token}`,
            },
            body: JSON.stringify({
              action: 'send-chat',
              instanceToken: instanceData.token,
              jid: contactJid,
              message: text.trim(),
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Falha ao enviar mensagem');
        }

        // Insert in DB
        const { error } = await supabase.from('conversation_messages').insert({
          conversation_id: conversation.id,
          direction: 'outgoing',
          content: text.trim(),
          media_type: 'text',
          sender_id: user.id,
        });
        if (error) throw error;

        // Update last_message_at
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);
      }

      setText('');
      onMessageSent();
    } catch (err: any) {
      console.error('Send error:', err);
      toast.error(err.message || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-border/50 bg-card/50">
      {isNote && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md px-3 py-1 mb-2 text-xs text-yellow-400">
          📝 Escrevendo nota privada — o cliente não verá esta mensagem
        </div>
      )}
      <div className="flex items-end gap-2">
        <Button
          variant={isNote ? 'default' : 'ghost'}
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={() => setIsNote(!isNote)}
          title="Nota privada"
        >
          <StickyNote className="w-4 h-4" />
        </Button>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isNote ? 'Escrever nota privada...' : 'Escrever mensagem...'}
          className="min-h-[36px] max-h-32 resize-none text-sm"
          rows={1}
        />
        <Button
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={handleSend}
          disabled={!text.trim() || sending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
