import { useState, useRef, useEffect } from 'react';
import { Send, StickyNote, Mic, X, Square, Paperclip, Loader2 } from 'lucide-react';
import { EmojiPicker } from '@/components/ui/emoji-picker';
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

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sendingFile, setSendingFile] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Priorizar OGG Opus (mais compatível com WhatsApp)
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic access error:', err);
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        resolve(blob);
      };
      recorder.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
    });
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Manter data URI prefix para o proxy poder detectar e limpar
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSendAudio = async () => {
    const blob = await stopRecording();
    if (!blob || !user) return;

    setSending(true);
    try {
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

      // Upload audio to storage
      const fileName = `${conversation.id}/${Date.now()}.ogg`;
      const { error: uploadError } = await supabase.storage
        .from('audio-messages')
        .upload(fileName, blob, { contentType: blob.type });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('audio-messages')
        .getPublicUrl(fileName);
      const audioPublicUrl = publicUrlData.publicUrl;

      const base64Audio = await blobToBase64(blob);

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
            action: 'send-audio',
            instanceToken: instanceData.token,
            jid: contactJid,
            audio: base64Audio,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao enviar áudio');
      }

      // Save to DB with media_url
      const { data: insertedMsg, error } = await supabase.from('conversation_messages').insert({
        conversation_id: conversation.id,
        direction: 'outgoing',
        content: null,
        media_type: 'audio',
        media_url: audioPublicUrl,
        sender_id: user.id,
      }).select().single();
      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);

      // Broadcast manual para atualizar o ChatPanel em tempo real
      await supabase.channel('helpdesk-realtime').send({
        type: 'broadcast',
        event: 'new-message',
        payload: {
          conversation_id: conversation.id,
          message_id: insertedMsg.id,
          direction: 'outgoing',
          media_type: 'audio',
          content: null,
          media_url: audioPublicUrl,
          created_at: insertedMsg.created_at,
        },
      });

      onMessageSent();
    } catch (err: any) {
      console.error('Send audio error:', err);
      toast.error(err.message || 'Erro ao enviar áudio');
    } finally {
      setSending(false);
      setRecordingTime(0);
    }
  };

  const handleSendFile = async (file: File) => {
    if (!user) return;
    setSendingFile(true);
    try {
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

      // Upload file to storage
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${conversation.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('helpdesk-media')
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('helpdesk-media')
        .getPublicUrl(fileName);
      const filePublicUrl = publicUrlData.publicUrl;

      // Convert to base64 for UAZAPI
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);
      const dataUri = `data:${file.type};base64,${base64}`;

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
            action: 'send-media',
            instanceToken: instanceData.token,
            jid: contactJid,
            mediaUrl: dataUri,
            mediaType: 'document',
            filename: file.name,
            caption: '',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao enviar documento');
      }

      // Save to DB
      const { data: insertedMsg, error } = await supabase.from('conversation_messages').insert({
        conversation_id: conversation.id,
        direction: 'outgoing',
        content: file.name,
        media_type: 'document',
        media_url: filePublicUrl,
        sender_id: user.id,
      }).select().single();
      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);

      // Broadcast for realtime
      await supabase.channel('helpdesk-realtime').send({
        type: 'broadcast',
        event: 'new-message',
        payload: {
          conversation_id: conversation.id,
          message_id: insertedMsg.id,
          direction: 'outgoing',
          media_type: 'document',
          content: file.name,
          media_url: filePublicUrl,
          created_at: insertedMsg.created_at,
        },
      });

      onMessageSent();
      toast.success('Documento enviado!');
    } catch (err: any) {
      console.error('Send file error:', err);
      toast.error(err.message || 'Erro ao enviar documento');
    } finally {
      setSendingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);

    try {
      if (isNote) {
        const { error } = await supabase.from('conversation_messages').insert({
          conversation_id: conversation.id,
          direction: 'private_note',
          content: text.trim(),
          media_type: 'text',
          sender_id: user.id,
        });
        if (error) throw error;
      } else {
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

        const { data: insertedMsg, error } = await supabase.from('conversation_messages').insert({
          conversation_id: conversation.id,
          direction: 'outgoing',
          content: text.trim(),
          media_type: 'text',
          sender_id: user.id,
        }).select().single();
        if (error) throw error;

        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);

        // Broadcast manual para atualizar o ChatPanel em tempo real
        await supabase.channel('helpdesk-realtime').send({
          type: 'broadcast',
          event: 'new-message',
          payload: {
            conversation_id: conversation.id,
            message_id: insertedMsg.id,
            direction: 'outgoing',
            media_type: 'text',
            content: text.trim(),
            media_url: null,
            created_at: insertedMsg.created_at,
          },
        });
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="p-3 border-t border-border/50 bg-card/50">
      {isNote && !isRecording && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md px-3 py-1 mb-2 text-xs text-yellow-400">
          📝 Escrevendo nota privada — o cliente não verá esta mensagem
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9 text-destructive"
            onClick={cancelRecording}
            title="Cancelar gravação"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 flex-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
            </span>
            <span className="text-sm font-mono text-destructive">
              {formatTime(recordingTime)}
            </span>
            <span className="text-xs text-muted-foreground">Gravando...</span>
          </div>

          <Button
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={handleSendAudio}
            disabled={sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 20 * 1024 * 1024) {
                  toast.error('Arquivo deve ter no máximo 20MB');
                  return;
                }
                handleSendFile(file);
              }
            }}
          />
          <Button
            variant={isNote ? 'default' : 'ghost'}
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={() => setIsNote(!isNote)}
            title="Nota privada"
          >
            <StickyNote className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={isNote || sendingFile}
            title="Enviar documento"
          >
            {sendingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </Button>
          <EmojiPicker onEmojiSelect={(emoji) => setText(prev => prev + emoji)} disabled={sending} />
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isNote ? 'Escrever nota privada...' : 'Escrever mensagem...'}
            className="min-h-[40px] max-h-32 resize-none text-sm md:text-sm text-base"
            rows={1}
          />
          {text.trim() ? (
            <Button
              size="icon"
              className="shrink-0 h-9 w-9"
              onClick={handleSend}
              disabled={sending}
            >
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9"
              onClick={startRecording}
              disabled={isNote}
              title="Gravar áudio"
            >
              <Mic className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
