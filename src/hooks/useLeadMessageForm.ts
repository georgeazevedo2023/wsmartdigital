import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadCarouselImage, base64ToFile } from '@/lib/uploadCarouselImage';
import { saveToHelpdesk } from '@/lib/saveToHelpdesk';
import { CarouselData, createEmptyCard } from '@/components/broadcast/CarouselEditor';
import type { MessageTemplate } from '@/hooks/useMessageTemplates';
import type { Instance } from '@/components/broadcast/InstanceSelector';
import type { Lead } from '@/hooks/useLeadsBroadcaster';
import type { MediaType, ActiveTab, InitialData } from '@/hooks/useBroadcastForm';
import { MAX_MESSAGE_LENGTH, MAX_FILE_SIZE } from '@/hooks/useBroadcastForm';

// ─── Types ───────────────────────────────────────────────────────────
export type RandomDelay = 'none' | '5-10' | '10-20' | '30-40' | '40-60' | '120-180';

export interface LeadSendProgress {
  current: number;
  total: number;
  currentName: string;
  status: 'idle' | 'sending' | 'paused' | 'success' | 'error' | 'cancelled';
  results: { name: string; success: boolean; error?: string }[];
  startedAt: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────
const SEND_DELAY_MS = 350;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/mp3', 'audio/wav'];

const DELAY_RANGES: Record<string, [number, number]> = {
  '5-10': [5000, 10000],
  '10-20': [10000, 20000],
  '30-40': [30000, 40000],
  '40-60': [40000, 60000],
  '120-180': [120000, 180000],
};

const ESTIMATE_RANGES: Record<string, [number, number]> = {
  '5-10': [5, 10],
  '10-20': [10, 20],
  '30-40': [30, 40],
  '40-60': [40, 60],
  '120-180': [120, 180],
};

interface UseLeadMessageFormProps {
  instance: Instance;
  selectedLeads: Lead[];
  onComplete?: () => void;
  initialData?: InitialData;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

export const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}min${secs > 0 ? ` ${secs}s` : ''}`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h${remainingMins > 0 ? ` ${remainingMins}min` : ''}`;
};

// ─── Hook ────────────────────────────────────────────────────────────
export function useLeadMessageForm({ instance, selectedLeads, onComplete, initialData }: UseLeadMessageFormProps) {
  // ─ Tab & Message State
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (initialData?.messageType === 'carousel') return 'carousel';
    if (initialData?.messageType && initialData.messageType !== 'text') return 'media';
    return 'text';
  });
  const [message, setMessage] = useState(initialData?.content || '');

  // ─ Carousel State
  const [carouselData, setCarouselData] = useState<CarouselData>(() => {
    if (initialData?.carouselData?.cards) {
      return {
        message: initialData.carouselData.message || '',
        cards: initialData.carouselData.cards.map((card) => ({
          id: card.id || crypto.randomUUID(),
          text: card.text || '',
          image: card.image || '',
          buttons: card.buttons?.map((btn) => ({
            id: btn.id || crypto.randomUUID(),
            type: btn.type,
            label: btn.label,
            url: btn.type === 'URL' ? (btn.value || '') : '',
            phone: btn.type === 'CALL' ? (btn.value || '') : '',
          })) || [],
        })),
      };
    }
    return { message: '', cards: [createEmptyCard(), createEmptyCard()] };
  });

  // ─ Media State
  const getInitialMediaType = (): MediaType => {
    if (!initialData?.messageType) return 'image';
    const map: Record<string, MediaType> = { image: 'image', video: 'video', audio: 'audio', ptt: 'audio', document: 'file', file: 'file' };
    return map[initialData.messageType] || 'image';
  };

  const [mediaType, setMediaType] = useState<MediaType>(getInitialMediaType());
  const [mediaUrl, setMediaUrl] = useState(initialData?.mediaUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.mediaUrl || null);
  const [caption, setCaption] = useState(initialData?.messageType !== 'text' ? (initialData?.content || '') : '');
  const [isPtt, setIsPtt] = useState(initialData?.messageType === 'ptt');
  const [filename, setFilename] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─ Delay & Progress
  const [randomDelay, setRandomDelay] = useState<RandomDelay>('none');
  const [progress, setProgress] = useState<LeadSendProgress>({
    current: 0, total: 0, currentName: '', status: 'idle', results: [], startedAt: null,
  });
  const [elapsedTime, setElapsedTime] = useState(0);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // ─ Timer
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if ((progress.status === 'sending' || progress.status === 'paused') && progress.startedAt) {
      intervalId = setInterval(() => {
        if (progress.status === 'sending') {
          setElapsedTime(Math.floor((Date.now() - progress.startedAt!) / 1000));
        }
      }, 1000);
    } else if (progress.status === 'idle') {
      setElapsedTime(0);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [progress.status, progress.startedAt]);

  // ─ Cleanup preview URL
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // ─ Pause / Resume / Cancel
  const handlePause = useCallback(() => {
    isPausedRef.current = true;
    setProgress(p => ({ ...p, status: 'paused' }));
  }, []);

  const handleResume = useCallback(() => {
    isPausedRef.current = false;
    setProgress(p => ({ ...p, status: 'sending' }));
  }, []);

  const handleCancel = useCallback(() => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
  }, []);

  const waitWhilePaused = async () => {
    while (isPausedRef.current) await delay(100);
  };

  const getRandomDelay = (): number => {
    if (randomDelay === 'none') return SEND_DELAY_MS;
    const [min, max] = DELAY_RANGES[randomDelay] || [5000, 10000];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const calculateEstimatedTime = (): string => {
    if (randomDelay === 'none') return '';
    const count = selectedLeads.length;
    const [minSec, maxSec] = ESTIMATE_RANGES[randomDelay] || [5, 10];
    const minTotal = Math.ceil((count * minSec) / 60);
    const maxTotal = Math.ceil((count * maxSec) / 60);
    if (maxTotal < 60) return `${minTotal}-${maxTotal} min`;
    const format = (t: number) => {
      const h = Math.floor(t / 60);
      const m = t % 60;
      return `${h}h${m > 0 ? m + 'min' : ''}`;
    };
    return `${format(minTotal)} - ${format(maxTotal)}`;
  };

  // ─ File handling
  const clearFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFilename('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl]);

  const getAcceptedTypes = useCallback(() => {
    switch (mediaType) {
      case 'image': return ALLOWED_IMAGE_TYPES.join(',');
      case 'video': return ALLOWED_VIDEO_TYPES.join(',');
      case 'audio': return ALLOWED_AUDIO_TYPES.join(',');
      case 'file': return '*/*';
      default: return '*/*';
    }
  }, [mediaType]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { toast.error('Arquivo muito grande. Máximo: 10MB'); return; }
    if (mediaType === 'video' && !ALLOWED_VIDEO_TYPES.includes(file.type)) { toast.error('Apenas vídeos MP4 são suportados'); return; }
    if (mediaType === 'image' && !ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error('Formato de imagem não suportado'); return; }
    if (mediaType === 'audio' && !ALLOWED_AUDIO_TYPES.includes(file.type)) { toast.error('Formato de áudio não suportado (use MP3 ou OGG)'); return; }
    clearFile();
    setSelectedFile(file);
    setFilename(file.name);
    if (['image', 'video', 'audio'].includes(mediaType)) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }, [mediaType, clearFile]);

  // ─ Template handlers
  const handleSelectTemplate = useCallback((template: MessageTemplate) => {
    if (template.message_type === 'carousel' && template.carousel_data) {
      setActiveTab('carousel');
      const data = template.carousel_data as any;
      setCarouselData({
        message: data.message || '',
        cards: data.cards?.map((card: any) => ({
          id: card.id || crypto.randomUUID(),
          text: card.text || '',
          image: card.image || '',
          buttons: card.buttons?.map((btn: any) => ({
            id: btn.id || crypto.randomUUID(),
            type: btn.type,
            label: btn.label,
            url: btn.type === 'URL' ? (btn.value || '') : '',
            phone: btn.type === 'CALL' ? (btn.value || '') : '',
          })) || [],
        })) || [createEmptyCard(), createEmptyCard()],
      });
    } else if (template.message_type === 'text') {
      setActiveTab('text');
      setMessage(template.content || '');
    } else {
      setActiveTab('media');
      const typeMap: Record<string, MediaType> = { image: 'image', video: 'video', audio: 'audio', ptt: 'audio', document: 'file' };
      setMediaType(typeMap[template.message_type] || 'image');
      setIsPtt(template.message_type === 'ptt');
      setMediaUrl(template.media_url || '');
      setCaption(template.content || '');
      setFilename(template.filename || '');
      clearFile();
    }
    toast.success(`Template "${template.name}" aplicado`);
  }, [clearFile]);

  const handleSaveTemplate = useCallback(async () => {
    if (activeTab === 'carousel') {
      if (carouselData.cards.length < 2) { toast.error('O carrossel precisa ter pelo menos 2 cards'); return null; }
      try {
        const uploadedCards = await Promise.all(
          carouselData.cards.map(async (card) => {
            if (card.imageFile) {
              const url = await uploadCarouselImage(card.imageFile);
              return { ...card, image: url, imageFile: undefined };
            }
            return { ...card, imageFile: undefined };
          })
        );
        return { name: '', content: carouselData.message || undefined, message_type: 'carousel', carousel_data: { message: carouselData.message, cards: uploadedCards } };
      } catch { toast.error('Erro ao enviar imagens. Tente novamente.'); return null; }
    } else if (activeTab === 'text') {
      const trimmed = message.trim();
      if (!trimmed) { toast.error('Digite uma mensagem para salvar'); return null; }
      return { name: '', content: trimmed, message_type: 'text' };
    } else {
      const trimmedUrl = mediaUrl.trim();
      if (!trimmedUrl && !selectedFile) { toast.error('Selecione uma mídia para salvar'); return null; }
      if (!trimmedUrl) { toast.error('Para salvar template de mídia, use uma URL'); return null; }
      const sendType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType === 'file' ? 'document' : mediaType;
      return { name: '', content: caption.trim() || undefined, message_type: sendType, media_url: trimmedUrl, filename: mediaType === 'file' ? filename.trim() : undefined };
    }
  }, [activeTab, carouselData, message, mediaUrl, selectedFile, mediaType, isPtt, caption, filename]);

  // ─ API calls
  const sendToNumber = async (jid: string, text: string, accessToken: string) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ action: 'send-message', token: instance.token, groupjid: jid, message: text }),
    });
    if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || err.message || 'Erro ao enviar'); }
    return response.json();
  };

  const sendMediaToNumber = async (jid: string, mediaData: string, type: string, captionText: string, docName: string, accessToken: string) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ action: 'send-media', token: instance.token, groupjid: jid, mediaUrl: mediaData, mediaType: type, caption: captionText, filename: docName }),
    });
    if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || err.message || 'Erro ao enviar mídia'); }
    return response.json();
  };

  const sendCarouselToNumber = async (jid: string, carousel: CarouselData, accessToken: string) => {
    const processedCards = await Promise.all(
      carousel.cards.map(async (card) => {
        let imageUrl = card.image;
        if (card.imageFile) {
          imageUrl = await fileToBase64(card.imageFile);
        }
        return { text: card.text, image: imageUrl, buttons: card.buttons };
      })
    );
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ action: 'send-carousel', token: instance.token, groupjid: jid, message: carousel.message, carousel: processedCards }),
    });
    if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || err.message || 'Erro ao enviar carrossel'); }
    return response.json();
  };

  // ─ Save broadcast log
  const saveBroadcastLog = async (params: {
    messageType: string; content: string | null; mediaUrl: string | null;
    recipientsTargeted: number; recipientsSuccess: number; recipientsFailed: number;
    status: 'completed' | 'cancelled' | 'error'; startedAt: number;
    errorMessage?: string; leadNames: string[]; carouselData?: CarouselData;
  }) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;
      const completedAt = Date.now();
      const durationSeconds = Math.round((completedAt - params.startedAt) / 1000);

      let storedCarouselData = null;
      if (params.carouselData) {
        const processedCards = await Promise.all(
          params.carouselData.cards.map(async (card, idx) => {
            let imageForStorage = card.image || '';
            try {
              if (card.imageFile) { imageForStorage = await uploadCarouselImage(card.imageFile); }
              else if (card.image?.startsWith('data:')) { imageForStorage = await uploadCarouselImage(await base64ToFile(card.image, `card-${idx}.jpg`)); }
            } catch { /* fallback to original */ }
            return { id: card.id, text: card.text, image: imageForStorage, buttons: card.buttons.map(b => ({ id: b.id, type: b.type, label: b.label, value: b.url || b.phone || '' })) };
          })
        );
        storedCarouselData = { message: params.carouselData.message, cards: processedCards };
      }

      await supabase.from('broadcast_logs').insert({
        user_id: session.data.session.user.id,
        instance_id: instance.id, instance_name: instance.name,
        message_type: params.messageType, content: params.content, media_url: params.mediaUrl,
        groups_targeted: 0, recipients_targeted: params.recipientsTargeted,
        recipients_success: params.recipientsSuccess, recipients_failed: params.recipientsFailed,
        exclude_admins: false, random_delay: randomDelay, status: params.status,
        started_at: new Date(params.startedAt).toISOString(),
        completed_at: new Date(completedAt).toISOString(),
        duration_seconds: durationSeconds, error_message: params.errorMessage || null,
        group_names: params.leadNames, carousel_data: storedCarouselData,
      });
    } catch (err) { console.error('Error saving broadcast log:', err); }
  };

  // ─ Generic send loop
  const runSendLoop = async (
    sendFn: (lead: Lead, accessToken: string) => Promise<void>,
    helpdeskFn: (lead: Lead) => void,
  ) => {
    const session = await supabase.auth.getSession();
    if (!session.data.session) { toast.error('Sessão expirada'); return null; }
    const accessToken = session.data.session.access_token;
    const startedAt = Date.now();

    isPausedRef.current = false;
    isCancelledRef.current = false;

    setProgress({ current: 0, total: selectedLeads.length, currentName: '', status: 'sending', results: [], startedAt });

    const results: LeadSendProgress['results'] = [];

    for (let i = 0; i < selectedLeads.length; i++) {
      if (isCancelledRef.current) {
        setProgress(p => ({ ...p, status: 'cancelled' }));
        toast.warning('Envio cancelado');
        break;
      }
      await waitWhilePaused();

      const lead = selectedLeads[i];
      const displayName = lead.name || lead.phone;
      setProgress(p => ({ ...p, current: i + 1, currentName: displayName }));

      try {
        await sendFn(lead, accessToken);
        results.push({ name: displayName, success: true });
        try { helpdeskFn(lead); } catch {}
      } catch (error: any) {
        results.push({ name: displayName, success: false, error: error.message });
      }

      setProgress(p => ({ ...p, results: [...results] }));
      if (i < selectedLeads.length - 1 && !isCancelledRef.current) await delay(getRandomDelay());
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (!isCancelledRef.current) {
      setProgress(p => ({ ...p, status: failCount > 0 ? 'error' : 'success' }));
      const label = failCount === 0
        ? `Enviado para ${successCount} contato${successCount !== 1 ? 's' : ''}`
        : `${successCount} enviados, ${failCount} falharam`;
      failCount === 0 ? toast.success(label) : toast.warning(label);
    }

    return { successCount, failCount, startedAt };
  };

  // ─ Send handlers
  const handleSendText = async () => {
    if (!message.trim()) { toast.error('Digite uma mensagem'); return; }
    const result = await runSendLoop(
      (lead, token) => sendToNumber(lead.jid, message.trim(), token),
      (lead) => saveToHelpdesk(instance.id, lead.jid, lead.phone, lead.name || null, { content: message.trim(), media_type: 'text' }),
    );
    if (!result) return;
    const leadNames = selectedLeads.slice(0, 50).map(l => l.name || l.phone);
    await saveBroadcastLog({ messageType: 'text', content: message.trim(), mediaUrl: null, recipientsTargeted: selectedLeads.length, recipientsSuccess: result.successCount, recipientsFailed: result.failCount, status: isCancelledRef.current ? 'cancelled' : (result.failCount > 0 ? 'error' : 'completed'), startedAt: result.startedAt, leadNames });
  };

  const handleSendMedia = async () => {
    if (!selectedFile && !mediaUrl.trim()) { toast.error('Selecione um arquivo ou informe uma URL'); return; }
    let mediaData = mediaUrl;
    if (selectedFile) mediaData = await fileToBase64(selectedFile);
    const actualMediaType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType;

    const result = await runSendLoop(
      (lead, token) => sendMediaToNumber(lead.jid, mediaData, actualMediaType, caption, filename || selectedFile?.name || 'file', token),
      (lead) => saveToHelpdesk(instance.id, lead.jid, lead.phone, lead.name || null, { content: caption || null, media_type: actualMediaType === 'ptt' ? 'audio' : mediaType === 'file' ? 'document' : actualMediaType, media_url: mediaUrl || null }),
    );
    if (!result) return;
    const leadNames = selectedLeads.slice(0, 50).map(l => l.name || l.phone);
    await saveBroadcastLog({ messageType: actualMediaType, content: caption || null, mediaUrl: mediaUrl || null, recipientsTargeted: selectedLeads.length, recipientsSuccess: result.successCount, recipientsFailed: result.failCount, status: isCancelledRef.current ? 'cancelled' : (result.failCount > 0 ? 'error' : 'completed'), startedAt: result.startedAt, leadNames });
  };

  const handleSendCarousel = async () => {
    const hasValidCard = carouselData.cards.some(c => (c.image || c.imageFile) && c.text.trim());
    if (!hasValidCard) { toast.error('Preencha pelo menos um card com imagem e texto'); return; }

    const result = await runSendLoop(
      (lead, token) => sendCarouselToNumber(lead.jid, carouselData, token),
      (lead) => {
        (async () => {
          try {
            const helpdeskCards = await Promise.all(
              carouselData.cards.map(async (c) => {
                let imageUrl = c.image || '';
                if (c.imageFile) imageUrl = await uploadCarouselImage(c.imageFile);
                else if (c.image?.startsWith('data:')) imageUrl = await uploadCarouselImage(await base64ToFile(c.image, `card-${c.id}.jpg`));
                return { id: c.id, text: c.text, image: imageUrl, buttons: c.buttons.map(b => ({ id: b.id, type: b.type, label: b.label, value: b.url || b.phone || '' })) };
              })
            );
            saveToHelpdesk(instance.id, lead.jid, lead.phone, lead.name || null, {
              content: carouselData.message || '📋 Carrossel enviado',
              media_type: 'carousel',
              media_url: JSON.stringify({ message: carouselData.message, cards: helpdeskCards }),
            });
          } catch {}
        })();
      },
    );
    if (!result) return;
    const leadNames = selectedLeads.slice(0, 50).map(l => l.name || l.phone);
    await saveBroadcastLog({ messageType: 'carousel', content: carouselData.message || null, mediaUrl: null, recipientsTargeted: selectedLeads.length, recipientsSuccess: result.successCount, recipientsFailed: result.failCount, status: isCancelledRef.current ? 'cancelled' : (result.failCount > 0 ? 'error' : 'completed'), startedAt: result.startedAt, leadNames, carouselData });
  };

  const handleSend = useCallback(async () => {
    if (activeTab === 'text') await handleSendText();
    else if (activeTab === 'carousel') await handleSendCarousel();
    else await handleSendMedia();
  }, [activeTab, message, carouselData, selectedFile, mediaUrl, mediaType, isPtt, caption, filename, selectedLeads, randomDelay]);

  const handleReset = useCallback(() => {
    setProgress({ current: 0, total: 0, currentName: '', status: 'idle', results: [], startedAt: null });
    setElapsedTime(0);
    isPausedRef.current = false;
    isCancelledRef.current = false;
  }, []);

  // ─ Derived
  const canSend = activeTab === 'text'
    ? message.trim().length > 0
    : activeTab === 'carousel'
      ? carouselData.cards.some(c => (c.image || c.imageFile) && c.text.trim())
      : !!(selectedFile || mediaUrl.trim());

  const isSending = progress.status === 'sending' || progress.status === 'paused';
  const isComplete = progress.status === 'success' || progress.status === 'error' || progress.status === 'cancelled';

  return {
    // Tab
    activeTab, setActiveTab,
    // Text
    message, setMessage,
    // Carousel
    carouselData, setCarouselData,
    // Media
    mediaType, setMediaType: (t: MediaType) => { setMediaType(t); clearFile(); },
    mediaUrl, setMediaUrl, selectedFile, previewUrl, caption, setCaption,
    isPtt, setIsPtt, filename, setFilename, fileInputRef,
    handleFileSelect, clearFile, getAcceptedTypes,
    // Delay
    randomDelay, setRandomDelay,
    estimatedTime: calculateEstimatedTime(),
    // Progress
    progress, elapsedTime, isSending, isComplete, canSend,
    successCount: progress.results.filter(r => r.success).length,
    failCount: progress.results.filter(r => !r.success).length,
    // Actions
    handleSend, handlePause, handleResume, handleCancel, handleReset,
    // Templates
    handleSelectTemplate, handleSaveTemplate,
    // Misc
    onComplete, selectedLeads,
  };
}
