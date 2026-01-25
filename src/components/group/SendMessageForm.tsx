import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';

interface SendMessageFormProps {
  instanceToken: string;
  groupJid: string;
  onMessageSent?: () => void;
}

const MAX_MESSAGE_LENGTH = 4096;

const SendMessageForm = ({ instanceToken, groupJid, onMessageSent }: SendMessageFormProps) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage) {
      toast.error('Digite uma mensagem');
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Mensagem muito longa (máximo ${MAX_MESSAGE_LENGTH} caracteres)`);
      return;
    }

    setIsSending(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            action: 'send-message',
            token: instanceToken,
            groupjid: groupJid,
            message: trimmedMessage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao enviar mensagem');
      }

      toast.success('Mensagem enviada com sucesso!');
      setMessage('');
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Digite sua mensagem..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSending}
        className="min-h-[100px] resize-none"
        maxLength={MAX_MESSAGE_LENGTH + 100} // Allow slight overtype for UX
      />
      
      <div className="flex items-center justify-between">
        <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
          {characterCount.toLocaleString()}/{MAX_MESSAGE_LENGTH.toLocaleString()} caracteres
        </span>
        
        <Button
          onClick={handleSend}
          disabled={isSending || !message.trim() || isOverLimit}
          size="sm"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar Mensagem
            </>
          )}
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Pressione Ctrl+Enter para enviar rapidamente
      </p>
    </div>
  );
};

export default SendMessageForm;
