import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';
import SendStatusModal, { SendStatus } from './SendStatusModal';

interface SendMessageFormProps {
  instanceToken: string;
  groupJid: string;
  onMessageSent?: () => void;
}

const MAX_MESSAGE_LENGTH = 4096;

const SendMessageForm = ({ instanceToken, groupJid, onMessageSent }: SendMessageFormProps) => {
  const [message, setMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage) {
      setErrorMessage('Digite uma mensagem');
      setSendStatus('error');
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setErrorMessage(`Mensagem muito longa (máximo ${MAX_MESSAGE_LENGTH} caracteres)`);
      setSendStatus('error');
      return;
    }

    setSendStatus('sending');
    setErrorMessage('');

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        setErrorMessage('Sessão expirada');
        setSendStatus('error');
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
        const errorMsg = errorData.error || errorData.message || 'Erro ao enviar mensagem';
        throw new Error(errorMsg);
      }

      setSendStatus('success');
      setMessage('');
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
      setSendStatus('error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCloseModal = () => {
    setSendStatus('idle');
    setErrorMessage('');
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const isSending = sendStatus === 'sending';

  return (
    <>
      <SendStatusModal
        status={sendStatus}
        message={errorMessage}
        onClose={handleCloseModal}
      />

      <div className="space-y-3">
        <Textarea
          placeholder="Digite sua mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          className="min-h-[100px] resize-none"
          maxLength={MAX_MESSAGE_LENGTH + 100}
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
            <Send className="w-4 h-4 mr-2" />
            Enviar Mensagem
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Pressione Ctrl+Enter para enviar rapidamente
        </p>
      </div>
    </>
  );
};

export default SendMessageForm;
