import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadCarouselImage, base64ToFile } from '@/lib/uploadCarouselImage';
import { CarouselData } from '@/components/broadcast/CarouselEditor';
import type { Instance } from '@/components/broadcast/InstanceSelector';
import type { Group } from '@/components/broadcast/GroupSelector';
import type { SendProgress, RandomDelay } from './types';
import { delay, fileToBase64, DELAY_RANGES, SEND_DELAY_MS, GROUP_DELAY_MS } from './types';

interface UseBroadcastSendArgs {
  instance: Instance;
  selectedGroups: Group[];
  excludeAdmins: boolean;
  randomDelay: RandomDelay;
}

export function useBroadcastSend({ instance, selectedGroups, excludeAdmins, randomDelay }: UseBroadcastSendArgs) {
  const [progress, setProgress] = useState<SendProgress>({
    currentGroup: 0, totalGroups: 0, currentMember: 0, totalMembers: 0,
    groupName: '', status: 'idle', results: [], startedAt: null,
  });
  const [elapsedTime, setElapsedTime] = useState(0);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

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

  const handlePause = () => { isPausedRef.current = true; setProgress(p => ({ ...p, status: 'paused' })); };
  const handleResume = () => { isPausedRef.current = false; setProgress(p => ({ ...p, status: 'sending' })); };
  const handleCancel = () => { isCancelledRef.current = true; isPausedRef.current = false; };
  const handleCloseProgress = () => { setProgress(p => ({ ...p, status: 'idle', results: [], startedAt: null })); setElapsedTime(0); };

  const isSending = progress.status === 'sending' || progress.status === 'paused';

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

  const sendText = (jid: string, text: string, at: string) =>
    proxyCall({ action: 'send-message', groupjid: jid, message: text }, at);

  const sendMedia = (jid: string, media: string, type: string, cap: string, doc: string, at: string) =>
    proxyCall({ action: 'send-media', groupjid: jid, mediaUrl: media, mediaType: type, caption: cap, filename: doc }, at);

  const sendCarousel = async (jid: string, carousel: CarouselData, at: string) => {
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
  const runSendLoop = useCallback(async <T,>(
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
      const groupItems = items as any[];
      groupItems.forEach((item) => {
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
  }, [instance, selectedGroups, excludeAdmins, randomDelay]);

  return {
    progress, elapsedTime, isSending,
    handlePause, handleResume, handleCancel, handleCloseProgress,
    sendText, sendMedia, sendCarousel, runSendLoop,
  };
}
