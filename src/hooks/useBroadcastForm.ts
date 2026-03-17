import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadCarouselImage, base64ToFile } from '@/lib/uploadCarouselImage';
import { saveToHelpdesk } from '@/lib/saveToHelpdesk';
import { CarouselData, createEmptyCard } from '../broadcast/CarouselEditor';
import type { MessageTemplate } from '@/hooks/useMessageTemplates';
import type { Instance } from '../broadcast/InstanceSelector';
import type { Group } from '../broadcast/GroupSelector';
import type { ScheduleConfig } from '@/components/group/ScheduleMessageDialog';

// ─── Types ───────────────────────────────────────────────────────────
export interface InitialData {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  carouselData?: {
    message?: string;
    cards?: Array<{
      id?: string;
      text?: string;
      image?: string;
      buttons?: Array<{
        id?: string;
        type: 'URL' | 'REPLY' | 'CALL';
        label: string;
        value?: string;
      }>;
    }>;
  };
}

export interface SendProgress {
  currentGroup: number;
  totalGroups: number;
  currentMember: number;
  totalMembers: number;
  groupName: string;
  status: 'idle' | 'sending' | 'paused' | 'success' | 'error' | 'cancelled';
  results: { groupName: string; success: boolean; error?: string }[];
  startedAt: number | null;
}

export type MediaType = 'image' | 'video' | 'audio' | 'file';
export type ActiveTab = 'text' | 'media' | 'carousel';

// ─── Constants ───────────────────────────────────────────────────────
export const MAX_MESSAGE_LENGTH = 4096;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SEND_DELAY_MS = 350;
const GROUP_DELAY_MS = 500;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/mp3', 'audio/wav'];

export type RandomDelay = 'none' | '5-10' | '10-20' | '30-40' | '40-60' | '120-180';

const DELAY_RANGES: Record<string, [number, number]> = {
  '5-10': [5000, 10000],
  '10-20': [10000, 20000],
  '30-40': [30000, 40000],
  '40-60': [40000, 60000],
  '120-180': [120000, 180000],
};

const DELAY_RANGES_SECONDS: Record<string, [number, number]> = {
  '5-10': [5, 10],
  '10-20': [10, 20],
  '30-40': [30, 40],
  '40-60': [40, 60],
  '120-180': [120, 180],
};

// ─── Utilities ───────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return minutes === 0 ? `${hours}h` : `${hours}h${minutes}min`;
  return `${minutes} min`;
};

// ─── Hook ────────────────────────────────────────────────────────────
interface UseBroadcastFormArgs {
  instance: Instance;
  selectedGroups: Group[];
  onComplete?: () => void;
  initialData?: InitialData;
}

export function useBroadcastForm({ instance, selectedGroups, onComplete, initialData }: UseBroadcastFormArgs) {
  // ─── Tab & Text State ───
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (initialData?.messageType === 'carousel') return 'carousel';
    if (initialData && initialData.messageType !== 'text') return 'media';
    return 'text';
  });
  const [message, setMessage] = useState(() => initialData?.content || '');

  // ─── Options ───
  const [excludeAdmins, setExcludeAdmins] = useState(false);
  const [randomDelay, setRandomDelay] = useState<RandomDelay>('none');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());

  // ─── Progress ───
  const [progress, setProgress] = useState<SendProgress>({
    currentGroup: 0, totalGroups: 0, currentMember: 0, totalMembers: 0,
    groupName: '', status: 'idle', results: [], startedAt: null,
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // ─── Pause/Cancel Refs ───
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // ─── Media State ───
  const [mediaType, setMediaType] = useState<MediaType>(() => {
    if (initialData) {
      if (initialData.messageType === 'image') return 'image';
      if (initialData.messageType === 'video') return 'video';
      if (initialData.messageType === 'audio' || initialData.messageType === 'ptt') return 'audio';
      if (initialData.messageType === 'document' || initialData.messageType === 'file') return 'file';
    }
    return 'image';
  });
  const [mediaUrl, setMediaUrl] = useState(() => initialData?.mediaUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState(() => {
    if (initialData && initialData.messageType !== 'text') return initialData.content || '';
    return '';
  });
  const [isPtt, setIsPtt] = useState(() => initialData?.messageType === 'ptt');
  const [filename, setFilename] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Carousel State ───
  const [carouselData, setCarouselData] = useState<CarouselData>(() => {
    if (initialData?.carouselData && initialData.carouselData.cards) {
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

  // ─── Computed Values ───
  const totalMembers = selectedGroups.reduce((acc, g) => acc + g.size, 0);
  const totalRegularMembers = selectedGroups.reduce(
    (acc, g) => acc + g.participants.filter(p => !p.isAdmin && !p.isSuperAdmin).length, 0
  );

  const uniqueRegularMembers = useMemo(() => {
    const seenJids = new Set<string>();
    const members: { jid: string; groupName: string }[] = [];
    for (const group of selectedGroups) {
      for (const m of group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin)) {
        if (!seenJids.has(m.jid)) { seenJids.add(m.jid); members.push({ jid: m.jid, groupName: group.name }); }
      }
    }
    return members;
  }, [selectedGroups]);

  const uniqueRegularMembersCount = uniqueRegularMembers.length;
  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const isSending = progress.status === 'sending' || progress.status === 'paused';
  const targetCount = excludeAdmins ? selectedParticipants.size : selectedGroups.length;

  // ─── Effects ───
  useEffect(() => {
    if (excludeAdmins) {
      setSelectedParticipants(new Set(uniqueRegularMembers.map(m => m.jid)));
    } else {
      setSelectedParticipants(new Set());
    }
  }, [excludeAdmins, uniqueRegularMembers]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  useEffect(() => {
    let id: NodeJS.Timeout | null = null;
    if ((progress.status === 'sending' || progress.status === 'paused') && progress.startedAt) {
      id = setInterval(() => {
        if (progress.status === 'sending') setElapsedTime(Math.floor((Date.now() - progress.startedAt!) / 1000));
      }, 1000);
    } else if (progress.status === 'idle') {
      setElapsedTime(0);
    }
    return () => { if (id) clearInterval(id); };
  }, [progress.status, progress.startedAt]);

  // ─── Delay Helpers ───
  const getRandomDelayMs = (): number => {
    if (randomDelay === 'none') return SEND_DELAY_MS;
    const [min, max] = DELAY_RANGES[randomDelay] || [5000, 10000];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const getGroupDelayMs = (): number => {
    if (randomDelay === 'none') return GROUP_DELAY_MS;
    const [min, max] = DELAY_RANGES[randomDelay] || [5000, 10000];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const waitWhilePaused = async () => { while (isPausedRef.current) await delay(100); };

  // ─── Pause/Resume/Cancel ───
  const handlePause = () => { isPausedRef.current = true; setProgress(p => ({ ...p, status: 'paused' })); };
  const handleResume = () => { isPausedRef.current = false; setProgress(p => ({ ...p, status: 'sending' })); };
  const handleCancel = () => { isCancelledRef.current = true; isPausedRef.current = false; };
  const handleCloseProgress = () => { setProgress(p => ({ ...p, status: 'idle', results: [], startedAt: null })); setElapsedTime(0); };

  // ─── File Handling ───
  const clearFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null); setPreviewUrl(null); setFilename('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl]);

  const getAcceptedTypes = () => {
    const map: Record<string, string> = {
      image: ALLOWED_IMAGE_TYPES.join(','), video: ALLOWED_VIDEO_TYPES.join(','),
      audio: ALLOWED_AUDIO_TYPES.join(','), file: '*/*',
    };
    return map[mediaType] || '*/*';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { toast.error('Arquivo muito grande. Máximo: 10MB'); return; }
    if (mediaType === 'video' && !ALLOWED_VIDEO_TYPES.includes(file.type)) { toast.error('Apenas vídeos MP4 são suportados'); return; }
    if (mediaType === 'image' && !ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error('Formato de imagem não suportado'); return; }
    if (mediaType === 'audio' && !ALLOWED_AUDIO_TYPES.includes(file.type)) { toast.error('Formato de áudio não suportado (use MP3 ou OGG)'); return; }
    clearFile();
    setSelectedFile(file); setFilename(file.name);
    if (['image', 'video', 'audio'].includes(mediaType)) setPreviewUrl(URL.createObjectURL(file));
  };

  const handleParticipantSelectionChange = useCallback((s: Set<string>) => setSelectedParticipants(s), []);

  // ─── API Calls ───
  const getAccessToken = async () => {
    const session = await supabase.auth.getSession();
    if (!session.data.session) { toast.error('Sessão expirada'); return null; }
    return session.data.session.access_token;
  };

  const proxyCall = async (body: Record<string, unknown>, accessToken: string) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ...body, token: instance.token }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Erro ao enviar');
    }
    return response.json();
  };

  const sendToNumber = (jid: string, text: string, at: string) =>
    proxyCall({ action: 'send-message', groupjid: jid, message: text }, at);

  const sendMediaToNumber = (jid: string, media: string, type: string, cap: string, doc: string, at: string) =>
    proxyCall({ action: 'send-media', groupjid: jid, mediaUrl: media, mediaType: type, caption: cap, filename: doc }, at);

  const sendCarouselToNumber = async (jid: string, carousel: CarouselData, at: string) => {
    const processedCards = await Promise.all(carousel.cards.map(async (card) => {
      let imageUrl = card.image;
      if (card.imageFile) {
        imageUrl = await fileToBase64(card.imageFile);
        imageUrl = imageUrl.split(',')[1] || imageUrl;
      }
      return { text: card.text, image: imageUrl, buttons: card.buttons };
    }));
    return proxyCall({ action: 'send-carousel', groupjid: jid, message: carousel.message, carousel: processedCards }, at);
  };

  // ─── Save Broadcast Log ───
  const saveBroadcastLog = async (params: {
    messageType: string; content: string | null; mediaUrl: string | null;
    groupsTargeted: number; recipientsTargeted: number; recipientsSuccess: number;
    recipientsFailed: number; status: 'completed' | 'cancelled' | 'error';
    startedAt: number; errorMessage?: string; groupNames?: string[];
    carouselData?: CarouselData | null;
  }) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;
      const completedAt = Date.now();
      let storedCarouselData = null;
      if (params.carouselData) {
        const processedCards = await Promise.all(params.carouselData.cards.map(async (card, idx) => {
          let img = card.image || '';
          try {
            if (card.imageFile) img = await uploadCarouselImage(card.imageFile);
            else if (card.image?.startsWith('data:')) img = await uploadCarouselImage(await base64ToFile(card.image, `card-${idx}.jpg`));
          } catch { /* keep original */ }
          return { id: card.id, text: card.text, image: img, buttons: card.buttons.map(b => ({ id: b.id, type: b.type, label: b.label, value: b.url || b.phone || '' })) };
        }));
        storedCarouselData = { message: params.carouselData.message, cards: processedCards };
      }
      await supabase.from('broadcast_logs').insert({
        user_id: session.data.session.user.id, instance_id: instance.id, instance_name: instance.name,
        message_type: params.messageType, content: params.content, media_url: params.mediaUrl,
        groups_targeted: params.groupsTargeted, recipients_targeted: params.recipientsTargeted,
        recipients_success: params.recipientsSuccess, recipients_failed: params.recipientsFailed,
        exclude_admins: excludeAdmins, random_delay: randomDelay, status: params.status,
        started_at: new Date(params.startedAt).toISOString(),
        completed_at: new Date(completedAt).toISOString(),
        duration_seconds: Math.floor((completedAt - params.startedAt) / 1000),
        error_message: params.errorMessage || null,
        group_names: params.groupNames || selectedGroups.map(g => g.name),
        carousel_data: storedCarouselData,
      });
    } catch (err) { console.error('Error saving broadcast log:', err); }
  };

  // ─── Generic Send Loop ───
  const runSendLoop = async <T,>(
    items: T[],
    sendFn: (item: T, accessToken: string) => Promise<void>,
    opts: { messageType: string; content: string | null; mediaUrl: string | null; carouselData?: CarouselData | null; isGroupMode: boolean; label: string; }
  ) => {
    const accessToken = await getAccessToken();
    if (!accessToken) { setProgress(p => ({ ...p, status: 'error' })); return; }

    const results: SendProgress['results'] = [];
    isCancelledRef.current = false;
    const startedAt = Date.now();

    setProgress({
      currentGroup: opts.isGroupMode ? 0 : 1, totalGroups: opts.isGroupMode ? items.length : 1,
      currentMember: 0, totalMembers: opts.isGroupMode ? 0 : items.length,
      groupName: opts.isGroupMode ? '' : `${selectedGroups.length} grupo(s) - Envio individual`,
      status: 'sending', results: [], startedAt,
    });

    let successCount = 0;
    let failCount = 0;

    const checkCancelled = async (): Promise<boolean> => {
      if (!isCancelledRef.current) return false;
      results.push({ groupName: `Cancelado após ${successCount} envio(s)`, success: true });
      setProgress(p => ({ ...p, status: 'cancelled', results }));
      toast.info(`Envio cancelado. ${successCount} ${opts.label}(s) enviado(s).`);
      await saveBroadcastLog({ messageType: opts.messageType, content: opts.content, mediaUrl: opts.mediaUrl, groupsTargeted: selectedGroups.length, recipientsTargeted: items.length, recipientsSuccess: successCount, recipientsFailed: failCount, status: 'cancelled', startedAt, carouselData: opts.carouselData });
      return true;
    };

    for (let i = 0; i < items.length; i++) {
      if (await checkCancelled()) return;
      await waitWhilePaused();
      if (await checkCancelled()) return;

      if (opts.isGroupMode) {
        setProgress(p => ({ ...p, currentGroup: i + 1, groupName: (items[i] as any).name || '', currentMember: 0, totalMembers: 1 }));
      } else {
        setProgress(p => ({ ...p, currentMember: i + 1, groupName: `Enviando para ${i + 1} de ${items.length}` }));
      }

      try {
        await sendFn(items[i], accessToken);
        successCount++;
        if (opts.isGroupMode) setProgress(p => ({ ...p, currentMember: 1 }));
      } catch (err) {
        console.error('Send error:', err);
        failCount++;
        if (opts.isGroupMode) {
          results.push({ groupName: (items[i] as any).name || '', success: false, error: err instanceof Error ? err.message : 'Erro' });
        }
      }

      if (i < items.length - 1) await delay(opts.isGroupMode ? getGroupDelayMs() : getRandomDelayMs());
    }

    if (opts.isGroupMode) {
      // Finalize group mode results (already pushed on error)
      const groupItems = items as any[];
      groupItems.forEach((item, idx) => {
        if (!results.find(r => r.groupName === item.name)) {
          results.push({ groupName: item.name, success: true });
        }
      });
    } else {
      results.push({ groupName: `Envio individual (${items.length} contatos únicos)`, success: failCount === 0 });
    }

    setProgress(p => ({ ...p, status: 'success', results }));
    await saveBroadcastLog({ messageType: opts.messageType, content: opts.content, mediaUrl: opts.mediaUrl, groupsTargeted: selectedGroups.length, recipientsTargeted: items.length, recipientsSuccess: successCount, recipientsFailed: failCount, status: 'completed', startedAt, carouselData: opts.carouselData });

    if (failCount > 0) toast.warning(`Enviado para ${successCount} ${opts.label}(s). ${failCount} falha(s).`);
    else toast.success(`${opts.label.charAt(0).toUpperCase() + opts.label.slice(1)} enviado para ${successCount} ${opts.isGroupMode ? 'grupo(s)' : 'contato(s) únicos'}!`);
  };

  // ─── Send Handlers ───
  const handleSendText = async () => {
    const trimmed = message.trim();
    if (!trimmed) { toast.error('Digite uma mensagem'); return; }
    if (trimmed.length > MAX_MESSAGE_LENGTH) { toast.error(`Mensagem muito longa (máximo ${MAX_MESSAGE_LENGTH} caracteres)`); return; }
    if (selectedGroups.length === 0) { toast.error('Selecione pelo menos um grupo'); return; }

    try {
      if (excludeAdmins) {
        const members = uniqueRegularMembers.filter(m => selectedParticipants.has(m.jid));
        if (members.length === 0) { toast.error('Selecione pelo menos um participante'); return; }
        await runSendLoop(members, async (m, at) => {
          await sendToNumber(m.jid, trimmed, at);
          saveToHelpdesk(instance.id, m.jid, m.jid.replace('@s.whatsapp.net', ''), null, { content: trimmed, media_type: 'text' });
        }, { messageType: 'text', content: trimmed, mediaUrl: null, isGroupMode: false, label: 'mensagem' });
      } else {
        await runSendLoop(selectedGroups, async (g, at) => {
          await sendToNumber(g.id, trimmed, at);
        }, { messageType: 'text', content: trimmed, mediaUrl: null, isGroupMode: true, label: 'mensagem' });
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
    if (!finalMediaUrl) { toast.error('Selecione um arquivo ou informe uma URL'); return; }
    if (selectedGroups.length === 0) { toast.error('Selecione pelo menos um grupo'); return; }
    if (mediaType === 'file' && !filename.trim()) { toast.error('Informe o nome do arquivo'); return; }

    const sendType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType === 'file' ? 'document' : mediaType;
    const docName = mediaType === 'file' ? filename.trim() : '';
    const mediaLabel = mediaType === 'image' ? 'imagem' : mediaType === 'video' ? 'vídeo' : mediaType === 'audio' ? 'áudio' : 'arquivo';

    try {
      if (excludeAdmins) {
        const members = uniqueRegularMembers.filter(m => selectedParticipants.has(m.jid));
        if (members.length === 0) { toast.error('Selecione pelo menos um participante'); return; }
        await runSendLoop(members, async (m, at) => {
          await sendMediaToNumber(m.jid, finalMediaUrl, sendType, caption.trim(), docName, at);
          saveToHelpdesk(instance.id, m.jid, m.jid.replace('@s.whatsapp.net', ''), null, {
            content: caption.trim() || null, media_type: sendType === 'ptt' ? 'audio' : sendType === 'document' ? 'document' : sendType, media_url: mediaUrl.trim() || null,
          });
        }, { messageType: sendType, content: caption.trim() || null, mediaUrl: mediaUrl.trim() || null, isGroupMode: false, label: mediaLabel });
      } else {
        await runSendLoop(selectedGroups, async (g, at) => {
          await sendMediaToNumber(g.id, finalMediaUrl, sendType, caption.trim(), docName, at);
        }, { messageType: sendType, content: caption.trim() || null, mediaUrl: mediaUrl.trim() || null, isGroupMode: true, label: mediaLabel });
      }
      clearFile(); setMediaUrl(''); setCaption('');
      onComplete?.();
    } catch (error) {
      console.error('Error sending media broadcast:', error);
      toast.error('Erro ao enviar mídia');
      setProgress(p => ({ ...p, status: 'error' }));
    }
  };

  const handleSendCarousel = async () => {
    if (carouselData.cards.length < 2) { toast.error('O carrossel precisa ter pelo menos 2 cards'); return; }
    if (carouselData.cards.some(c => (!c.image && !c.imageFile) || !c.text.trim())) { toast.error('Todos os cards devem ter imagem e texto'); return; }
    if (carouselData.cards.some(c => c.buttons.some(b => !b.label.trim() || (b.type === 'URL' && !b.url?.trim()) || (b.type === 'CALL' && !b.phone?.trim())))) { toast.error('Preencha todos os campos dos botões'); return; }
    if (selectedGroups.length === 0) { toast.error('Selecione pelo menos um grupo'); return; }
    if (excludeAdmins && selectedParticipants.size === 0) { toast.error('Selecione pelo menos um participante'); return; }

    try {
      const saveHelpdeskCarousel = async (jid: string) => {
        const phone = jid.replace('@s.whatsapp.net', '');
        try {
          const helpdeskCards = await Promise.all(carouselData.cards.map(async c => {
            let img = c.image || '';
            if (c.imageFile) img = await uploadCarouselImage(c.imageFile);
            else if (c.image?.startsWith('data:')) img = await uploadCarouselImage(await base64ToFile(c.image, `card-${c.id}.jpg`));
            return { id: c.id, text: c.text, image: img, buttons: c.buttons.map(b => ({ id: b.id, type: b.type, label: b.label, value: b.url || b.phone || '' })) };
          }));
          saveToHelpdesk(instance.id, jid, phone, null, {
            content: carouselData.message || '📋 Carrossel enviado',
            media_type: 'carousel',
            media_url: JSON.stringify({ message: carouselData.message, cards: helpdeskCards }),
          });
        } catch (err) { console.error('Error uploading carousel images for helpdesk:', err); }
      };

      if (excludeAdmins) {
        const members = uniqueRegularMembers.filter(m => selectedParticipants.has(m.jid));
        await runSendLoop(members, async (m, at) => {
          await sendCarouselToNumber(m.jid, carouselData, at);
          await saveHelpdeskCarousel(m.jid);
        }, { messageType: 'carousel', content: carouselData.message || null, mediaUrl: null, carouselData, isGroupMode: false, label: 'carrossel' });
      } else {
        await runSendLoop(selectedGroups, async (g, at) => {
          await sendCarouselToNumber(g.id, carouselData, at);
        }, { messageType: 'carousel', content: carouselData.message || null, mediaUrl: null, carouselData, isGroupMode: true, label: 'carrossel' });
      }
      setCarouselData({ message: '', cards: [createEmptyCard(), createEmptyCard()] });
      onComplete?.();
    } catch (error) {
      console.error('Error sending carousel broadcast:', error);
      toast.error('Erro ao enviar carrossel');
      setProgress(p => ({ ...p, status: 'error' }));
    }
  };

  const handleSend = async () => {
    if (activeTab === 'text') await handleSendText();
    else if (activeTab === 'carousel') await handleSendCarousel();
    else await handleSendMedia();
  };

  // ─── Schedule Handlers ───
  const handleSchedule = async (config: ScheduleConfig) => {
    if (activeTab === 'carousel') { toast.error('Agendamento de carrossel não suportado ainda'); return; }
    activeTab === 'text' ? await handleScheduleText(config) : await handleScheduleMedia(config);
  };

  const handleScheduleText = async (config: ScheduleConfig) => {
    const trimmed = message.trim();
    if (!trimmed) { toast.error('Digite uma mensagem'); return; }
    if (selectedGroups.length === 0) { toast.error('Selecione pelo menos um grupo'); return; }
    setIsScheduling(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { toast.error('Sessão expirada'); return; }
      const results = await Promise.all(selectedGroups.map(group => {
        const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin);
        const recipients = excludeAdmins && regularMembers.length > 0 ? regularMembers.map(m => ({ jid: m.jid })) : null;
        return supabase.from('scheduled_messages').insert({
          user_id: session.data.session!.user.id, instance_id: instance.id, group_jid: group.id, group_name: group.name,
          exclude_admins: excludeAdmins, recipients, message_type: 'text', content: trimmed,
          scheduled_at: config.scheduledAt.toISOString(), next_run_at: config.scheduledAt.toISOString(),
          is_recurring: config.isRecurring, recurrence_type: config.isRecurring ? config.recurrenceType : null,
          recurrence_interval: config.recurrenceInterval, recurrence_days: config.recurrenceDays.length > 0 ? config.recurrenceDays : null,
          recurrence_end_at: config.recurrenceEndAt?.toISOString() || null, recurrence_count: config.recurrenceCount || null,
          random_delay: config.randomDelay, status: 'pending',
        });
      }));
      if (results.filter(r => r.error).length > 0) throw new Error(`Falha ao agendar`);
      toast.success(`${selectedGroups.length} agendamento(s) criado(s)!`);
      setMessage(''); setShowScheduleDialog(false); onComplete?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao agendar'); }
    finally { setIsScheduling(false); }
  };

  const handleScheduleMedia = async (config: ScheduleConfig) => {
    const trimmedUrl = mediaUrl.trim();
    if (!trimmedUrl) { toast.error('Para agendar mídia, informe uma URL (não arquivo local)'); return; }
    if (selectedGroups.length === 0) { toast.error('Selecione pelo menos um grupo'); return; }
    if (mediaType === 'file' && !filename.trim()) { toast.error('Informe o nome do arquivo'); return; }
    setIsScheduling(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { toast.error('Sessão expirada'); return; }
      const sendType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType === 'file' ? 'document' : mediaType;
      const results = await Promise.all(selectedGroups.map(group => {
        const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin);
        const recipients = excludeAdmins && regularMembers.length > 0 ? regularMembers.map(m => ({ jid: m.jid })) : null;
        return supabase.from('scheduled_messages').insert({
          user_id: session.data.session!.user.id, instance_id: instance.id, group_jid: group.id, group_name: group.name,
          exclude_admins: excludeAdmins, recipients, message_type: sendType, content: caption.trim() || null,
          media_url: trimmedUrl, filename: mediaType === 'file' ? filename.trim() : null,
          scheduled_at: config.scheduledAt.toISOString(), next_run_at: config.scheduledAt.toISOString(),
          is_recurring: config.isRecurring, recurrence_type: config.isRecurring ? config.recurrenceType : null,
          recurrence_interval: config.recurrenceInterval, recurrence_days: config.recurrenceDays.length > 0 ? config.recurrenceDays : null,
          recurrence_end_at: config.recurrenceEndAt?.toISOString() || null, recurrence_count: config.recurrenceCount || null,
          random_delay: config.randomDelay, status: 'pending',
        });
      }));
      if (results.filter(r => r.error).length > 0) throw new Error(`Falha ao agendar`);
      toast.success(`${selectedGroups.length} agendamento(s) de mídia criado(s)!`);
      setMediaUrl(''); setCaption(''); setFilename(''); setShowScheduleDialog(false); onComplete?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao agendar mídia'); }
    finally { setIsScheduling(false); }
  };

  // ─── Template Handling ───
  const handleSelectTemplate = (template: MessageTemplate) => {
    if (template.message_type === 'carousel' && template.carousel_data) {
      setActiveTab('carousel'); setCarouselData(template.carousel_data);
    } else if (template.message_type === 'text') {
      setActiveTab('text'); setMessage(template.content || '');
    } else {
      setActiveTab('media');
      const typeMap: Record<string, MediaType> = { image: 'image', video: 'video', audio: 'audio', ptt: 'audio', document: 'file' };
      setMediaType(typeMap[template.message_type] || 'image');
      setIsPtt(template.message_type === 'ptt');
      setMediaUrl(template.media_url || ''); setCaption(template.content || ''); setFilename(template.filename || ''); clearFile();
    }
    toast.success(`Template "${template.name}" aplicado`);
  };

  const handleSaveTemplate = async () => {
    if (activeTab === 'carousel') {
      if (carouselData.cards.length < 2) { toast.error('O carrossel precisa ter pelo menos 2 cards'); return null; }
      const hasLocalFiles = carouselData.cards.some(c => c.imageFile);
      if (hasLocalFiles) toast.info('Enviando imagens do carrossel...');
      try {
        const uploadedCards = await Promise.all(carouselData.cards.map(async c => c.imageFile ? { ...c, image: await uploadCarouselImage(c.imageFile), imageFile: undefined } : { ...c, imageFile: undefined }));
        return { name: '', content: carouselData.message || undefined, message_type: 'carousel', carousel_data: { message: carouselData.message, cards: uploadedCards } };
      } catch { toast.error('Erro ao enviar imagens. Tente novamente.'); return null; }
    } else if (activeTab === 'text') {
      const t = message.trim();
      if (!t) { toast.error('Digite uma mensagem para salvar'); return null; }
      return { name: '', content: t, message_type: 'text' };
    } else {
      const u = mediaUrl.trim();
      if (!u && !selectedFile) { toast.error('Selecione uma mídia para salvar'); return null; }
      if (!u) { toast.error('Para salvar template de mídia, use uma URL'); return null; }
      const sendType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType === 'file' ? 'document' : mediaType;
      return { name: '', content: caption.trim() || undefined, message_type: sendType, media_url: u, filename: mediaType === 'file' ? filename.trim() : undefined };
    }
  };

  // ─── Validation ───
  const isMediaValid = activeTab === 'media' && (selectedFile || mediaUrl.trim()) && (mediaType !== 'file' || filename.trim());
  const isTextValid = activeTab === 'text' && message.trim() && !isOverLimit;
  const isCarouselValid = activeTab === 'carousel' && carouselData.cards.length >= 2 &&
    carouselData.cards.every(c => (c.image || c.imageFile) && c.text.trim()) &&
    carouselData.cards.every(c => c.buttons.every(b => b.label.trim() && (b.type !== 'URL' || b.url?.trim()) && (b.type !== 'CALL' || b.phone?.trim())));
  const canSend = (isTextValid || isMediaValid || isCarouselValid) && selectedGroups.length > 0 && !(excludeAdmins && activeTab !== 'carousel' && selectedParticipants.size === 0);
  const canSchedule = activeTab === 'text' ? (!!message.trim() && !isOverLimit && selectedGroups.length > 0) : activeTab === 'media' ? (!!mediaUrl.trim() && selectedGroups.length > 0 && (mediaType !== 'file' || !!filename.trim())) : false;

  // ─── Estimated Time ───
  const getEstimatedTime = (): { min: number; max: number } | null => {
    if (randomDelay === 'none' || targetCount <= 1) return null;
    const count = targetCount - 1;
    const [minSec, maxSec] = DELAY_RANGES_SECONDS[randomDelay] || [5, 10];
    return { min: count * minSec, max: count * maxSec };
  };

  const getRemainingTime = (): number | null => {
    if (!progress.startedAt || elapsedTime === 0) return null;
    const total = excludeAdmins ? progress.totalMembers : progress.totalGroups;
    const done = excludeAdmins ? progress.currentMember : progress.currentGroup;
    if (done === 0 || done >= total) return null;
    return Math.ceil((elapsedTime / done) * (total - done));
  };

  return {
    // State
    activeTab, setActiveTab, message, setMessage, excludeAdmins, setExcludeAdmins,
    randomDelay, setRandomDelay, selectedParticipants, progress, elapsedTime,
    showScheduleDialog, setShowScheduleDialog, isScheduling,
    // Media state
    mediaType, setMediaType, mediaUrl, setMediaUrl, selectedFile, previewUrl,
    caption, setCaption, isPtt, setIsPtt, filename, setFilename, fileInputRef,
    // Carousel state
    carouselData, setCarouselData,
    // Computed
    totalMembers, totalRegularMembers, uniqueRegularMembers, uniqueRegularMembersCount,
    characterCount, isOverLimit, isSending, targetCount,
    canSend, canSchedule, estimatedTime: getEstimatedTime(), remainingTime: getRemainingTime(),
    // Handlers
    handleSend, handleSchedule, handlePause, handleResume, handleCancel, handleCloseProgress,
    clearFile, getAcceptedTypes, handleFileSelect, handleParticipantSelectionChange,
    handleSelectTemplate, handleSaveTemplate,
    // Utils
    formatDuration,
  };
}
