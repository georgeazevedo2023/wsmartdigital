import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { nowBRISO } from '@/lib/dateUtils';
import type { Conversation } from '@/pages/dashboard/HelpDesk';

interface UseChatInputOptions {
  conversation: Conversation;
  onMessageSent: () => void;
  onAgentAssigned?: (conversationId: string, agentId: string) => void;
  onStatusChange?: (status: string) => void;
  onLabelsChanged?: () => void;
}

export function useChatInput({ conversation, onMessageSent, onAgentAssigned, onStatusChange, onLabelsChanged }: UseChatInputOptions) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isNote, setIsNote] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [togglingLabel, setTogglingLabel] = useState<string | null>(null);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File inputs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [sendingFile, setSendingFile] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ─── Helpers ───

  const getInstanceToken = async () => {
    const { data } = await supabase
      .from('instances').select('token')
      .eq('id', conversation.inbox?.instance_id || '').maybeSingle();
    if (!data?.token) { toast.error('Instância não encontrada'); return null; }
    return data.token;
  };

  const getContactJid = () => {
    const jid = conversation.contact?.jid;
    if (!jid) toast.error('Contato sem JID');
    return jid || null;
  };

  const getSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  };

  const autoAssignAgent = async () => {
    if (!user || conversation.assigned_to === user.id) return;
    try {
      await supabase.from('conversations').update({ assigned_to: user.id }).eq('id', conversation.id);
      onAgentAssigned?.(conversation.id, user.id);
      await supabase.channel('helpdesk-conversations').send({
        type: 'broadcast', event: 'assigned-agent',
        payload: { conversation_id: conversation.id, assigned_to: user.id },
      });
    } catch (err) { console.error('Auto-assign error:', err); }
  };

  const fireOutgoingWebhook = async (messageData: { message_type: string; content: string | null; media_url: string | null }) => {
    const inbox = conversation.inbox as any;
    const webhookUrl = inbox?.webhook_outgoing_url;
    if (!webhookUrl || !user) return;
    try {
      const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).single();
      const { data: instanceInfo } = await supabase.from('instances').select('name').eq('id', inbox?.instance_id || '').maybeSingle();
      await supabase.functions.invoke('fire-outgoing-webhook', {
        body: {
          webhook_url: webhookUrl,
          payload: {
            timestamp: nowBRISO(), instance_name: instanceInfo?.name || '', instance_id: inbox?.instance_id || '',
            inbox_name: inbox?.name || '', inbox_id: inbox?.id || conversation.inbox_id,
            contact_name: conversation.contact?.name || '', remotejid: conversation.contact?.jid,
            fromMe: true, agent_name: profile?.full_name || user.email, agent_id: user.id,
            pausar_agente: 'sim', status_ia: 'desligada',
            message_type: messageData.message_type, message: messageData.content, media_url: messageData.media_url,
          },
        },
      });
    } catch (err) { console.error('Outgoing webhook error:', err); }
  };

  const broadcastMessage = async (insertedMsg: any, mediaType: string, content: string | null, mediaUrl: string | null) => {
    await supabase.channel('helpdesk-realtime').send({
      type: 'broadcast', event: 'new-message',
      payload: {
        conversation_id: conversation.id, message_id: insertedMsg.id,
        direction: 'outgoing', media_type: mediaType, content, media_url: mediaUrl,
        created_at: insertedMsg.created_at, status_ia: 'desligada',
      },
    });
    await supabase.channel('helpdesk-conversations').send({
      type: 'broadcast', event: 'new-message',
      payload: { conversation_id: conversation.id, inbox_id: conversation.inbox_id, content, media_type: mediaType, created_at: insertedMsg.created_at },
    });
  };

  // ─── Recording ───

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      setIsRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) { console.error('Mic access error:', err); toast.error('Não foi possível acessar o microfone'); }
  };

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') { resolve(null); return; }
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
      recorder.stop();
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      setIsRecording(false);
    });
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    chunksRef.current = [];
    setIsRecording(false); setRecordingTime(0);
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleSendAudio = async () => {
    const blob = await stopRecording();
    if (!blob || !user) return;
    setSending(true);
    try {
      const token = await getInstanceToken();
      const contactJid = getContactJid();
      if (!token || !contactJid) return;

      const fileName = `${conversation.id}/${Date.now()}.ogg`;
      const { error: uploadError } = await supabase.storage.from('audio-messages').upload(fileName, blob, { contentType: blob.type });
      if (uploadError) throw uploadError;
      const audioPublicUrl = supabase.storage.from('audio-messages').getPublicUrl(fileName).data.publicUrl;

      const base64Audio = await blobToBase64(blob);
      await callUazapiProxy({ action: 'send-audio', instanceToken: token, jid: contactJid, audio: base64Audio });

      const { data: insertedMsg, error } = await supabase.from('conversation_messages').insert({
        conversation_id: conversation.id, direction: 'outgoing', content: null, media_type: 'audio', media_url: audioPublicUrl, sender_id: user.id,
      }).select().single();
      if (error) throw error;

      await supabase.from('conversations').update({ last_message_at: new Date().toISOString(), last_message: '🎵 Áudio', status_ia: 'desligada' } as any).eq('id', conversation.id);
      await broadcastMessage(insertedMsg, 'audio', null, audioPublicUrl);
      await autoAssignAgent();
      await fireOutgoingWebhook({ message_type: 'audio', content: null, media_url: audioPublicUrl });
      onMessageSent();
    } catch (err: any) { console.error('Send audio error:', err); toast.error(err.message || 'Erro ao enviar áudio'); }
    finally { setSending(false); setRecordingTime(0); }
  };

  // ─── File ───

  const handleSendFile = async (file: File) => {
    if (!user) return;
    setSendingFile(true);
    try {
      const token = await getInstanceToken();
      const contactJid = getContactJid();
      if (!token || !contactJid) return;

      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${conversation.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('helpdesk-media').upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const filePublicUrl = supabase.storage.from('helpdesk-media').getPublicUrl(fileName).data.publicUrl;

      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const dataUri = `data:${file.type};base64,${btoa(binary)}`;

      const isImage = file.type.startsWith('image/');
      const mediaType = isImage ? 'image' : 'document';

      await callUazapiProxy({ action: 'send-media', instanceToken: token, jid: contactJid, mediaUrl: dataUri, mediaType, filename: isImage ? undefined : file.name, caption: '' });

      const { data: insertedMsg, error } = await supabase.from('conversation_messages').insert({
        conversation_id: conversation.id, direction: 'outgoing', content: isImage ? null : file.name, media_type: mediaType, media_url: filePublicUrl, sender_id: user.id,
      }).select().single();
      if (error) throw error;

      await supabase.from('conversations').update({ last_message_at: new Date().toISOString(), last_message: mediaType === 'image' ? '📷 Foto' : '📎 Documento', status_ia: 'desligada' } as any).eq('id', conversation.id);
      await broadcastMessage(insertedMsg, mediaType, isImage ? null : file.name, filePublicUrl);
      await autoAssignAgent();
      await fireOutgoingWebhook({ message_type: mediaType, content: isImage ? null : file.name, media_url: filePublicUrl });
      onMessageSent();
      toast.success(isImage ? 'Imagem enviada!' : 'Documento enviado!');
    } catch (err: any) { console.error('Send file error:', err); toast.error(err.message || 'Erro ao enviar documento'); }
    finally {
      setSendingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // ─── Text / Note ───

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      if (isNote) {
        const { error } = await supabase.from('conversation_messages').insert({
          conversation_id: conversation.id, direction: 'private_note', content: text.trim(), media_type: 'text', sender_id: user.id,
        });
        if (error) throw error;
      } else {
        const token = await getInstanceToken();
        const contactJid = getContactJid();
        if (!token || !contactJid) return;

        const session = await getSession();
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: 'send-chat', instanceToken: token, jid: contactJid, message: text.trim() }),
        });
        if (!response.ok) throw new Error('Falha ao enviar mensagem');

        const { data: insertedMsg, error } = await supabase.from('conversation_messages').insert({
          conversation_id: conversation.id, direction: 'outgoing', content: text.trim(), media_type: 'text', sender_id: user.id,
        }).select().single();
        if (error) throw error;

        await supabase.from('conversations').update({ last_message_at: new Date().toISOString(), last_message: text.trim(), status_ia: 'desligada' } as any).eq('id', conversation.id);
        await broadcastMessage(insertedMsg, 'text', text.trim(), null);
      }
      if (!isNote) {
        await autoAssignAgent();
        await fireOutgoingWebhook({ message_type: 'text', content: text.trim(), media_url: null });
      }
      setText(''); onMessageSent();
    } catch (err: any) { console.error('Send error:', err); toast.error(err.message || 'Erro ao enviar'); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── Labels ───

  const handleToggleLabel = async (labelId: string, isAssigned: boolean) => {
    setTogglingLabel(labelId);
    try {
      if (isAssigned) {
        await supabase.from('conversation_labels').delete().eq('conversation_id', conversation.id).eq('label_id', labelId);
      } else {
        await supabase.from('conversation_labels').insert({ conversation_id: conversation.id, label_id: labelId });
      }
      onLabelsChanged?.();
    } catch (err: any) { toast.error(err.message || 'Erro'); }
    finally { setTogglingLabel(null); }
  };

  // ─── Status ───

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase.from('conversations').update({ status: newStatus }).eq('id', conversation.id);
    if (!error) { onStatusChange?.(newStatus); toast.success('Status atualizado'); setMenuOpen(false); setShowStatus(false); }
    else toast.error('Erro ao atualizar status');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return {
    text, setText, sending, isNote, setIsNote, menuOpen, setMenuOpen,
    showLabels, setShowLabels, showStatus, setShowStatus, togglingLabel,
    isRecording, recordingTime, sendingFile,
    fileInputRef, imageInputRef,
    startRecording, cancelRecording, handleSendAudio,
    handleSendFile, handleSend, handleKeyDown,
    handleToggleLabel, handleStatusChange, formatTime,
  };
}

export const STATUS_OPTIONS = [
  { value: 'aberta', label: 'Aberta', dotClass: 'bg-emerald-500' },
  { value: 'pendente', label: 'Pendente', dotClass: 'bg-yellow-500' },
  { value: 'resolvida', label: 'Resolvida', dotClass: 'bg-muted-foreground/50' },
];
