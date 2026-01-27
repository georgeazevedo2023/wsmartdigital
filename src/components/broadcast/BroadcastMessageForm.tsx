import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Send, Users, MessageSquare, Image, Loader2, CheckCircle2, XCircle, Clock, Video, Mic, FileIcon, Upload, X, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleMessageDialog, ScheduleConfig } from '@/components/group/ScheduleMessageDialog';
import { TemplateSelector } from './TemplateSelector';
import type { MessageTemplate } from '@/hooks/useMessageTemplates';
import type { Instance } from './InstanceSelector';
import type { Group } from './GroupSelector';

interface BroadcastMessageFormProps {
  instance: Instance;
  selectedGroups: Group[];
  onComplete?: () => void;
}

interface SendProgress {
  currentGroup: number;
  totalGroups: number;
  currentMember: number;
  totalMembers: number;
  groupName: string;
  status: 'idle' | 'sending' | 'paused' | 'success' | 'error';
  results: { groupName: string; success: boolean; error?: string }[];
}

type MediaType = 'image' | 'video' | 'audio' | 'file';

const MAX_MESSAGE_LENGTH = 4096;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SEND_DELAY_MS = 350;
const GROUP_DELAY_MS = 500;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/mp3', 'audio/wav'];

const BroadcastMessageForm = ({ instance, selectedGroups, onComplete }: BroadcastMessageFormProps) => {
  const [activeTab, setActiveTab] = useState<'text' | 'media'>('text');
  const [message, setMessage] = useState('');
  const [excludeAdmins, setExcludeAdmins] = useState(false);
  const [randomDelay, setRandomDelay] = useState<'none' | '5-10' | '10-20'>('none');
  const [progress, setProgress] = useState<SendProgress>({
    currentGroup: 0,
    totalGroups: 0,
    currentMember: 0,
    totalMembers: 0,
    groupName: '',
    status: 'idle',
    results: [],
  });
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Pause control using ref to allow immediate effect in async loops
  const isPausedRef = useRef(false);

  // Media states
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isPtt, setIsPtt] = useState(false);
  const [filename, setFilename] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalMembers = selectedGroups.reduce((acc, g) => acc + g.size, 0);
  const totalRegularMembers = selectedGroups.reduce((acc, g) => {
    return acc + g.participants.filter(p => !p.isAdmin && !p.isSuperAdmin).length;
  }, 0);

  // Calculate unique regular members across all selected groups (for deduplication)
  const getUniqueRegularMembers = () => {
    const seenJids = new Set<string>();
    const uniqueMembers: { jid: string; groupName: string }[] = [];
    
    for (const group of selectedGroups) {
      const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin);
      for (const member of regularMembers) {
        if (!seenJids.has(member.jid)) {
          seenJids.add(member.jid);
          uniqueMembers.push({ jid: member.jid, groupName: group.name });
        }
      }
    }
    
    return uniqueMembers;
  };

  const uniqueRegularMembersCount = excludeAdmins 
    ? getUniqueRegularMembers().length 
    : totalRegularMembers;

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Wait while paused, checking every 100ms
  const waitWhilePaused = async (): Promise<void> => {
    while (isPausedRef.current) {
      await delay(100);
    }
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setProgress(p => ({ ...p, status: 'paused' }));
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setProgress(p => ({ ...p, status: 'sending' }));
  };

  // Função para calcular delay aleatório baseado na configuração
  const getRandomDelay = (): number => {
    if (randomDelay === 'none') {
      return SEND_DELAY_MS; // 350ms padrão
    }
    
    const [min, max] = randomDelay === '5-10' 
      ? [5000, 10000]   // 5 a 10 segundos
      : [10000, 20000]; // 10 a 20 segundos
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const getGroupDelay = (): number => {
    if (randomDelay === 'none') {
      return GROUP_DELAY_MS; // 500ms padrão
    }
    
    const [min, max] = randomDelay === '5-10' 
      ? [5000, 10000]   // 5 a 10 segundos
      : [10000, 20000]; // 10 a 20 segundos
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setFilename('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAcceptedTypes = () => {
    switch (mediaType) {
      case 'image':
        return ALLOWED_IMAGE_TYPES.join(',');
      case 'video':
        return ALLOWED_VIDEO_TYPES.join(',');
      case 'audio':
        return ALLOWED_AUDIO_TYPES.join(',');
      case 'file':
        return '*/*';
      default:
        return '*/*';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    // Validate file type for specific media types
    if (mediaType === 'video' && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Apenas vídeos MP4 são suportados');
      return;
    }

    if (mediaType === 'image' && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Formato de imagem não suportado');
      return;
    }

    if (mediaType === 'audio' && !ALLOWED_AUDIO_TYPES.includes(file.type)) {
      toast.error('Formato de áudio não suportado (use MP3 ou OGG)');
      return;
    }

    clearFile();
    setSelectedFile(file);
    setFilename(file.name);

    // Create preview for images and videos
    if (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const sendToNumber = async (number: string, text: string, accessToken: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'send-message',
          token: instance.token,
          groupjid: number,
          message: text,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erro ao enviar');
    }

    return response.json();
  };

  const sendMediaToNumber = async (
    number: string, 
    mediaData: string, 
    type: string, 
    captionText: string,
    docName: string,
    accessToken: string
  ) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'send-media',
          token: instance.token,
          groupjid: number,
          media: mediaData,
          type,
          text: captionText,
          docName,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erro ao enviar mídia');
    }

    return response.json();
  };

  const handleSend = async () => {
    if (activeTab === 'text') {
      await handleSendText();
    } else {
      await handleSendMedia();
    }
  };

  const handleSendText = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage) {
      toast.error('Digite uma mensagem');
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Mensagem muito longa (máximo ${MAX_MESSAGE_LENGTH} caracteres)`);
      return;
    }

    if (selectedGroups.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Sessão expirada');
        setProgress(p => ({ ...p, status: 'error' }));
        return;
      }

      const accessToken = session.data.session.access_token;
      const results: SendProgress['results'] = [];

      if (excludeAdmins) {
        // DEDUPLICATION: Get unique members across all groups
        const uniqueMembers = getUniqueRegularMembers();
        
        setProgress({
          currentGroup: 1,
          totalGroups: 1,
          currentMember: 0,
          totalMembers: uniqueMembers.length,
          groupName: `${selectedGroups.length} grupo(s) - Envio individual`,
          status: 'sending',
          results: [],
        });

        let successCount = 0;
        let failCount = 0;

        for (let j = 0; j < uniqueMembers.length; j++) {
          // Wait if paused
          await waitWhilePaused();
          
          try {
            await sendToNumber(uniqueMembers[j].jid, trimmedMessage, accessToken);
            successCount++;
          } catch (err) {
            console.error(`Erro ao enviar para ${uniqueMembers[j].jid}:`, err);
            failCount++;
          }
          
          setProgress(p => ({ ...p, currentMember: j + 1 }));
          
          if (j < uniqueMembers.length - 1) {
            await delay(getRandomDelay());
          }
        }

        results.push({ 
          groupName: `Envio individual (${uniqueMembers.length} contatos únicos)`, 
          success: failCount === 0 
        });

        setProgress(p => ({ ...p, status: 'success', results }));

        if (failCount > 0) {
          toast.warning(`Enviado para ${successCount} contato(s). ${failCount} falha(s).`);
        } else {
          toast.success(`Mensagem enviada para ${successCount} contato(s) únicos!`);
        }
      } else {
        // Normal group send (message goes to each group)
        setProgress({
          currentGroup: 0,
          totalGroups: selectedGroups.length,
          currentMember: 0,
          totalMembers: 0,
          groupName: '',
          status: 'sending',
          results: [],
        });

        for (let i = 0; i < selectedGroups.length; i++) {
          // Wait if paused
          await waitWhilePaused();
          
          const group = selectedGroups[i];
          
          try {
            setProgress(p => ({
              ...p,
              currentGroup: i + 1,
              groupName: group.name,
              currentMember: 0,
              totalMembers: 1,
            }));

            await sendToNumber(group.id, trimmedMessage, accessToken);
            setProgress(p => ({ ...p, currentMember: 1 }));

            results.push({ groupName: group.name, success: true });
          } catch (error) {
            console.error(`Erro ao enviar para grupo ${group.name}:`, error);
            results.push({ 
              groupName: group.name, 
              success: false, 
              error: error instanceof Error ? error.message : 'Erro desconhecido' 
            });
          }

          // Delay between groups
          if (i < selectedGroups.length - 1) {
            await delay(getGroupDelay());
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        setProgress(p => ({ ...p, status: 'success', results }));

        if (failCount > 0) {
          toast.warning(`Enviado para ${successCount} grupo(s). ${failCount} falha(s).`);
        } else {
          toast.success(`Mensagem enviada para ${successCount} grupo(s)!`);
        }
      }

      setMessage('');
      onComplete?.();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Erro ao enviar mensagens');
      setProgress(p => ({ ...p, status: 'error' }));
    }
  };

  const handleSendMedia = async () => {
    const finalMediaUrl = selectedFile ? await fileToBase64(selectedFile) : mediaUrl.trim();
    
    if (!finalMediaUrl) {
      toast.error('Selecione um arquivo ou informe uma URL');
      return;
    }

    if (selectedGroups.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    if (mediaType === 'file' && !filename.trim()) {
      toast.error('Informe o nome do arquivo');
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Sessão expirada');
        setProgress(p => ({ ...p, status: 'error' }));
        return;
      }

      const accessToken = session.data.session.access_token;
      const results: SendProgress['results'] = [];
      
      const sendType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType === 'file' ? 'document' : mediaType;
      const docName = mediaType === 'file' ? filename.trim() : '';

      if (excludeAdmins) {
        // DEDUPLICATION: Get unique members across all groups
        const uniqueMembers = getUniqueRegularMembers();
        
        setProgress({
          currentGroup: 1,
          totalGroups: 1,
          currentMember: 0,
          totalMembers: uniqueMembers.length,
          groupName: `${selectedGroups.length} grupo(s) - Envio individual`,
          status: 'sending',
          results: [],
        });

        let successCount = 0;
        let failCount = 0;

        for (let j = 0; j < uniqueMembers.length; j++) {
          // Wait if paused
          await waitWhilePaused();
          
          try {
            await sendMediaToNumber(uniqueMembers[j].jid, finalMediaUrl, sendType, caption.trim(), docName, accessToken);
            successCount++;
          } catch (err) {
            console.error(`Erro ao enviar mídia para ${uniqueMembers[j].jid}:`, err);
            failCount++;
          }
          
          setProgress(p => ({ ...p, currentMember: j + 1 }));
          
          if (j < uniqueMembers.length - 1) {
            await delay(getRandomDelay());
          }
        }

        results.push({ 
          groupName: `Envio individual (${uniqueMembers.length} contatos únicos)`, 
          success: failCount === 0 
        });

        setProgress(p => ({ ...p, status: 'success', results }));

        const mediaLabel = mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : mediaType === 'audio' ? 'Áudio' : 'Arquivo';
        if (failCount > 0) {
          toast.warning(`${mediaLabel} enviado para ${successCount} contato(s). ${failCount} falha(s).`);
        } else {
          toast.success(`${mediaLabel} enviado para ${successCount} contato(s) únicos!`);
        }
      } else {
        // Normal group send (message goes to each group)
        setProgress({
          currentGroup: 0,
          totalGroups: selectedGroups.length,
          currentMember: 0,
          totalMembers: 0,
          groupName: '',
          status: 'sending',
          results: [],
        });

        for (let i = 0; i < selectedGroups.length; i++) {
          // Wait if paused
          await waitWhilePaused();
          
          const group = selectedGroups[i];
          
          try {
            setProgress(p => ({
              ...p,
              currentGroup: i + 1,
              groupName: group.name,
              currentMember: 0,
              totalMembers: 1,
            }));

            await sendMediaToNumber(group.id, finalMediaUrl, sendType, caption.trim(), docName, accessToken);
            setProgress(p => ({ ...p, currentMember: 1 }));

            results.push({ groupName: group.name, success: true });
          } catch (error) {
            console.error(`Erro ao enviar mídia para grupo ${group.name}:`, error);
            results.push({ 
              groupName: group.name, 
              success: false, 
              error: error instanceof Error ? error.message : 'Erro desconhecido' 
            });
          }

          if (i < selectedGroups.length - 1) {
            await delay(getGroupDelay());
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        setProgress(p => ({ ...p, status: 'success', results }));

        if (failCount > 0) {
          toast.warning(`Enviado para ${successCount} grupo(s). ${failCount} falha(s).`);
        } else {
          const mediaLabel = mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : mediaType === 'audio' ? 'Áudio' : 'Arquivo';
          toast.success(`${mediaLabel} enviado para ${successCount} grupo(s)!`);
        }
      }

      clearFile();
      setMediaUrl('');
      setCaption('');
      onComplete?.();
    } catch (error) {
      console.error('Error sending media broadcast:', error);
      toast.error('Erro ao enviar mídia');
      setProgress(p => ({ ...p, status: 'error' }));
    }
  };

  const handleSchedule = async (config: ScheduleConfig) => {
    if (activeTab === 'text') {
      await handleScheduleText(config);
    } else {
      await handleScheduleMedia(config);
    }
  };

  const handleScheduleText = async (config: ScheduleConfig) => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage) {
      toast.error('Digite uma mensagem');
      return;
    }

    if (selectedGroups.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    setIsScheduling(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Sessão expirada');
        return;
      }

      // Criar um agendamento para cada grupo selecionado
      const insertPromises = selectedGroups.map(group => {
        const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin);
        const recipients = excludeAdmins && regularMembers.length > 0
          ? regularMembers.map(m => ({ jid: m.jid }))
          : null;

        return supabase.from('scheduled_messages').insert({
          user_id: session.data.session!.user.id,
          instance_id: instance.id,
          group_jid: group.id,
          group_name: group.name,
          exclude_admins: excludeAdmins,
          recipients,
          message_type: 'text',
          content: trimmedMessage,
          scheduled_at: config.scheduledAt.toISOString(),
          next_run_at: config.scheduledAt.toISOString(),
          is_recurring: config.isRecurring,
          recurrence_type: config.isRecurring ? config.recurrenceType : null,
          recurrence_interval: config.recurrenceInterval,
          recurrence_days: config.recurrenceDays.length > 0 ? config.recurrenceDays : null,
          recurrence_end_at: config.recurrenceEndAt?.toISOString() || null,
          recurrence_count: config.recurrenceCount || null,
          random_delay: config.randomDelay,
          status: 'pending',
        });
      });

      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Falha ao agendar ${errors.length} grupo(s)`);
      }

      toast.success(`${selectedGroups.length} agendamento(s) criado(s)!`);
      setMessage('');
      setShowScheduleDialog(false);
      onComplete?.();
    } catch (error) {
      console.error('Error scheduling broadcast:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao agendar');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleScheduleMedia = async (config: ScheduleConfig) => {
    const trimmedUrl = mediaUrl.trim();
    
    if (!trimmedUrl) {
      toast.error('Para agendar mídia, informe uma URL (não arquivo local)');
      return;
    }

    if (selectedGroups.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    if (mediaType === 'file' && !filename.trim()) {
      toast.error('Informe o nome do arquivo');
      return;
    }

    setIsScheduling(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Sessão expirada');
        return;
      }

      const sendType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType === 'file' ? 'document' : mediaType;

      const insertPromises = selectedGroups.map(group => {
        const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin);
        const recipients = excludeAdmins && regularMembers.length > 0
          ? regularMembers.map(m => ({ jid: m.jid }))
          : null;

        return supabase.from('scheduled_messages').insert({
          user_id: session.data.session!.user.id,
          instance_id: instance.id,
          group_jid: group.id,
          group_name: group.name,
          exclude_admins: excludeAdmins,
          recipients,
          message_type: sendType,
          content: caption.trim() || null,
          media_url: trimmedUrl,
          filename: mediaType === 'file' ? filename.trim() : null,
          scheduled_at: config.scheduledAt.toISOString(),
          next_run_at: config.scheduledAt.toISOString(),
          is_recurring: config.isRecurring,
          recurrence_type: config.isRecurring ? config.recurrenceType : null,
          recurrence_interval: config.recurrenceInterval,
          recurrence_days: config.recurrenceDays.length > 0 ? config.recurrenceDays : null,
          recurrence_end_at: config.recurrenceEndAt?.toISOString() || null,
          recurrence_count: config.recurrenceCount || null,
          random_delay: config.randomDelay,
          status: 'pending',
        });
      });

      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Falha ao agendar ${errors.length} grupo(s)`);
      }

      toast.success(`${selectedGroups.length} agendamento(s) de mídia criado(s)!`);
      setMediaUrl('');
      setCaption('');
      setFilename('');
      setShowScheduleDialog(false);
      onComplete?.();
    } catch (error) {
      console.error('Error scheduling media broadcast:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao agendar mídia');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCloseProgress = () => {
    setProgress(p => ({ ...p, status: 'idle', results: [] }));
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const isSending = progress.status === 'sending' || progress.status === 'paused';

  const targetCount = excludeAdmins ? uniqueRegularMembersCount : selectedGroups.length;

  // Calcular tempo estimado de envio
  const getEstimatedTime = (): { min: number; max: number } | null => {
    if (randomDelay === 'none' || targetCount <= 1) return null;
    
    const messagesCount = targetCount - 1; // Delays happen between messages, not after the last one
    
    if (randomDelay === '5-10') {
      return {
        min: messagesCount * 5,  // 5 seconds minimum
        max: messagesCount * 10, // 10 seconds maximum
      };
    } else {
      return {
        min: messagesCount * 10, // 10 seconds minimum
        max: messagesCount * 20, // 20 seconds maximum
      };
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      if (minutes === 0) {
        return `${hours}h`;
      }
      return `${hours}h${minutes}min`;
    }
    
    return `${minutes} min`;
  };

  const estimatedTime = getEstimatedTime();

  const isMediaValid = activeTab === 'media' && (selectedFile || mediaUrl.trim()) && (mediaType !== 'file' || filename.trim());
  const isTextValid = activeTab === 'text' && message.trim() && !isOverLimit;
  const canSend = (isTextValid || isMediaValid) && selectedGroups.length > 0 && !(excludeAdmins && uniqueRegularMembersCount === 0);
  const canSchedule = activeTab === 'text' 
    ? (message.trim() && !isOverLimit && selectedGroups.length > 0)
    : (mediaUrl.trim() && selectedGroups.length > 0 && (mediaType !== 'file' || filename.trim()));

  const handleSelectTemplate = (template: MessageTemplate) => {
    if (template.message_type === 'text') {
      setActiveTab('text');
      setMessage(template.content || '');
    } else {
      setActiveTab('media');
      // Map message types
      const typeMap: Record<string, MediaType> = {
        'image': 'image',
        'video': 'video',
        'audio': 'audio',
        'ptt': 'audio',
        'document': 'file',
      };
      const newMediaType = typeMap[template.message_type] || 'image';
      setMediaType(newMediaType);
      setIsPtt(template.message_type === 'ptt');
      setMediaUrl(template.media_url || '');
      setCaption(template.content || '');
      setFilename(template.filename || '');
      clearFile();
    }
    toast.success(`Template "${template.name}" aplicado`);
  };

  const handleSaveTemplate = () => {
    if (activeTab === 'text') {
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        toast.error('Digite uma mensagem para salvar');
        return null;
      }
      return {
        name: '',
        content: trimmedMessage,
        message_type: 'text',
      };
    } else {
      const trimmedUrl = mediaUrl.trim();
      if (!trimmedUrl && !selectedFile) {
        toast.error('Selecione uma mídia para salvar');
        return null;
      }
      // For templates, we only save URL (not uploaded files)
      if (!trimmedUrl) {
        toast.error('Para salvar template de mídia, use uma URL');
        return null;
      }
      const sendType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType === 'file' ? 'document' : mediaType;
      return {
        name: '',
        content: caption.trim() || undefined,
        message_type: sendType,
        media_url: trimmedUrl,
        filename: mediaType === 'file' ? filename.trim() : undefined,
      };
    }
  };

  return (
    <>
      {/* Progress Modal */}
      {progress.status !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                {progress.status === 'sending' && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {activeTab === 'media' ? 'Enviando mídia...' : 'Enviando mensagens...'}
                  </>
                )}
                {progress.status === 'paused' && (
                  <>
                    <Pause className="w-5 h-5 text-warning" />
                    Envio pausado
                  </>
                )}
                {progress.status === 'success' && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    Envio concluído
                  </>
                )}
                {progress.status === 'error' && (
                  <>
                    <XCircle className="w-5 h-5 text-destructive" />
                    Erro no envio
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(progress.status === 'sending' || progress.status === 'paused') && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Grupo {progress.currentGroup} de {progress.totalGroups}</span>
                      <span className="text-muted-foreground truncate ml-2">{progress.groupName}</span>
                    </div>
                    <Progress value={(progress.currentGroup / progress.totalGroups) * 100} />
                  </div>

                  {excludeAdmins && progress.totalMembers > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Membros</span>
                        <span>{progress.currentMember} / {progress.totalMembers}</span>
                      </div>
                      <Progress 
                        value={(progress.currentMember / progress.totalMembers) * 100} 
                        className="h-1"
                      />
                    </div>
                  )}

                  {/* Pause/Resume Buttons */}
                  <div className="flex gap-2 pt-2">
                    {progress.status === 'sending' ? (
                      <Button 
                        onClick={handlePause} 
                        variant="outline" 
                        className="flex-1"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pausar
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleResume} 
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Retomar
                      </Button>
                    )}
                  </div>
                </>
              )}

              {!['sending', 'paused'].includes(progress.status) && progress.results.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {progress.results.map((result, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="truncate">{result.groupName}</span>
                    </div>
                  ))}
                </div>
              )}

              {!['sending', 'paused'].includes(progress.status) && (
                <Button onClick={handleCloseProgress} className="w-full">
                  Fechar
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Compor Mensagem
            </CardTitle>
            <TemplateSelector
              onSelect={handleSelectTemplate}
              onSave={handleSaveTemplate}
              disabled={isSending}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'text' | 'media')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Texto
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Mídia
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSending}
                className="min-h-[120px] resize-none"
                maxLength={MAX_MESSAGE_LENGTH + 100}
              />
              
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {characterCount.toLocaleString()}/{MAX_MESSAGE_LENGTH.toLocaleString()} caracteres
                </span>
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              {/* Media Type Selector */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant={mediaType === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setMediaType('image'); clearFile(); }}
                  disabled={isSending}
                  className="flex flex-col items-center gap-1 h-auto py-2"
                >
                  <Image className="w-4 h-4" />
                  <span className="text-xs">Imagem</span>
                </Button>
                <Button
                  type="button"
                  variant={mediaType === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setMediaType('video'); clearFile(); }}
                  disabled={isSending}
                  className="flex flex-col items-center gap-1 h-auto py-2"
                >
                  <Video className="w-4 h-4" />
                  <span className="text-xs">Vídeo</span>
                </Button>
                <Button
                  type="button"
                  variant={mediaType === 'audio' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setMediaType('audio'); clearFile(); }}
                  disabled={isSending}
                  className="flex flex-col items-center gap-1 h-auto py-2"
                >
                  <Mic className="w-4 h-4" />
                  <span className="text-xs">Áudio</span>
                </Button>
                <Button
                  type="button"
                  variant={mediaType === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setMediaType('file'); clearFile(); }}
                  disabled={isSending}
                  className="flex flex-col items-center gap-1 h-auto py-2"
                >
                  <FileIcon className="w-4 h-4" />
                  <span className="text-xs">Arquivo</span>
                </Button>
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <Label>URL da mídia</Label>
                <Input
                  placeholder="https://exemplo.com/arquivo.jpg"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  disabled={isSending || !!selectedFile}
                />
              </div>

              {/* Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              {/* File Input */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptedTypes()}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isSending}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || !!mediaUrl.trim()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Escolher do dispositivo
                </Button>
              </div>

              {/* Preview */}
              {selectedFile && (
                <div className="relative border border-border rounded-lg p-3 bg-muted/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                    className="absolute top-1 right-1 h-6 w-6"
                    disabled={isSending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  
                  {mediaType === 'image' && previewUrl && (
                    <img src={previewUrl} alt="Preview" className="max-h-40 rounded mx-auto" />
                  )}
                  
                  {mediaType === 'video' && previewUrl && (
                    <video src={previewUrl} controls className="max-h-40 rounded mx-auto" />
                  )}
                  
                  {mediaType === 'audio' && previewUrl && (
                    <audio src={previewUrl} controls className="w-full" />
                  )}
                  
                  {mediaType === 'file' && (
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-8 h-8 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filename for documents */}
              {mediaType === 'file' && (
                <div className="space-y-2">
                  <Label>Nome do arquivo</Label>
                  <Input
                    placeholder="documento.pdf"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    disabled={isSending}
                  />
                </div>
              )}

              {/* PTT Toggle for audio */}
              {mediaType === 'audio' && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label htmlFor="ptt-toggle" className="text-sm font-medium cursor-pointer">
                        Enviar como mensagem de voz
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Aparecerá como áudio gravado no WhatsApp
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="ptt-toggle"
                    checked={isPtt}
                    onCheckedChange={setIsPtt}
                    disabled={isSending}
                  />
                </div>
              )}

              {/* Caption */}
              <div className="space-y-2">
                <Label>Legenda (opcional)</Label>
                <Textarea
                  placeholder="Adicione uma legenda..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={isSending}
                  className="min-h-[80px] resize-none"
                />
              </div>
            </TabsContent>

            {/* Common sections for both tabs */}
            <div className="space-y-4 mt-4">
              {/* Toggle para excluir admins */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label htmlFor="exclude-admins-broadcast" className="text-sm font-medium cursor-pointer">
                      Não enviar para Admins/Donos
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {excludeAdmins 
                        ? `Enviará para ${uniqueRegularMembersCount} contato${uniqueRegularMembersCount !== 1 ? 's' : ''} único${uniqueRegularMembersCount !== 1 ? 's' : ''} (sem duplicatas)`
                        : `Enviará para ${selectedGroups.length} grupo${selectedGroups.length !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  id="exclude-admins-broadcast"
                  checked={excludeAdmins}
                  onCheckedChange={setExcludeAdmins}
                  disabled={isSending}
                />
              </div>

              {/* Randomizador de delay anti-bloqueio */}
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50 space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Intervalo entre envios (anti-bloqueio)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Adiciona delay aleatório para evitar detecção de spam
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={randomDelay === 'none' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRandomDelay('none')}
                    disabled={isSending}
                  >
                    Desativado
                  </Button>
                  <Button
                    type="button"
                    variant={randomDelay === '5-10' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRandomDelay('5-10')}
                    disabled={isSending}
                  >
                    5-10 seg
                  </Button>
                  <Button
                    type="button"
                    variant={randomDelay === '10-20' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRandomDelay('10-20')}
                    disabled={isSending}
                  >
                    10-20 seg
                  </Button>
                </div>

                {/* Estimated time indicator */}
                {estimatedTime && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 rounded-md px-3 py-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Tempo estimado: <span className="font-medium text-foreground">{formatDuration(estimatedTime.min)} - {formatDuration(estimatedTime.max)}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Deduplication info when excludeAdmins is enabled */}
              {excludeAdmins && totalRegularMembers > uniqueRegularMembersCount && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Deduplicação ativa:</span> {totalRegularMembers - uniqueRegularMembersCount} contato(s) em múltiplos grupos receberão apenas 1 mensagem.
                </div>
              )}

              {/* Summary */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {selectedGroups.length} grupo{selectedGroups.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3 h-3" />
                  {excludeAdmins ? uniqueRegularMembersCount : totalMembers} destinatário{(excludeAdmins ? uniqueRegularMembersCount : totalMembers) !== 1 ? 's' : ''}
                </Badge>
                {activeTab === 'media' && (
                  <Badge variant="secondary" className="gap-1">
                    {mediaType === 'image' && <Image className="w-3 h-3" />}
                    {mediaType === 'video' && <Video className="w-3 h-3" />}
                    {mediaType === 'audio' && <Mic className="w-3 h-3" />}
                    {mediaType === 'file' && <FileIcon className="w-3 h-3" />}
                    {mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : mediaType === 'audio' ? (isPtt ? 'Voz' : 'Áudio') : 'Arquivo'}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleDialog(true)}
                  disabled={isSending || !canSchedule}
                  size="sm"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Agendar
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={isSending || !canSend}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar para {targetCount}
                </Button>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <ScheduleMessageDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onConfirm={handleSchedule}
        isLoading={isScheduling}
      />
    </>
  );
};

export default BroadcastMessageForm;
