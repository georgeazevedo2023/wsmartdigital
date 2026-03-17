import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadCarouselImage } from '@/lib/uploadCarouselImage';
import { saveToHelpdesk } from '@/lib/saveToHelpdesk';
import { createEmptyCard } from '@/components/broadcast/CarouselEditor';
import type { MessageTemplate } from '@/hooks/useMessageTemplates';
import type { Instance } from '@/components/broadcast/InstanceSelector';
import type { Group } from '@/components/broadcast/GroupSelector';
import type { ScheduleConfig } from '@/components/group/ScheduleMessageDialog';

import { useBroadcastMedia } from './broadcast/useBroadcastMedia';
import { useBroadcastCarousel } from './broadcast/useBroadcastCarousel';
import { useBroadcastSend } from './broadcast/useBroadcastSend';
import { fileToBase64, formatDuration, MAX_MESSAGE_LENGTH, DELAY_RANGES_SECONDS } from './broadcast/types';
import type { ActiveTab, InitialData, MediaType, RandomDelay } from './broadcast/types';

// Re-export types and constants for backwards compatibility
export { formatDuration, MAX_MESSAGE_LENGTH, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, ALLOWED_AUDIO_TYPES } from './broadcast/types';
export type { InitialData, SendProgress, MediaType, ActiveTab, RandomDelay } from './broadcast/types';

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
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // ─── Sub-hooks ───
  const media = useBroadcastMedia(initialData);
  const carousel = useBroadcastCarousel(initialData);
  const send = useBroadcastSend({ instance, selectedGroups, excludeAdmins, randomDelay });

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
  const targetCount = excludeAdmins ? selectedParticipants.size : selectedGroups.length;

  // ─── Effects ───
  useEffect(() => {
    if (excludeAdmins) setSelectedParticipants(new Set(uniqueRegularMembers.map(m => m.jid)));
    else setSelectedParticipants(new Set());
  }, [excludeAdmins, uniqueRegularMembers]);

  useEffect(() => {
    return () => { if (media.previewUrl) URL.revokeObjectURL(media.previewUrl); };
  }, [media.previewUrl]);

  const handleParticipantSelectionChange = useCallback((s: Set<string>) => setSelectedParticipants(s), []);

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
        await send.runSendLoop(members, async (m, at) => {
          await send.sendText(m.jid, trimmed, at);
          saveToHelpdesk(instance.id, m.jid, m.jid.replace('@s.whatsapp.net', ''), null, { content: trimmed, media_type: 'text' });
        }, { messageType: 'text', content: trimmed, mediaUrl: null, isGroupMode: false, label: 'mensagem' });
      } else {
        await send.runSendLoop(selectedGroups, async (g, at) => {
          await send.sendText(g.id, trimmed, at);
        }, { messageType: 'text', content: trimmed, mediaUrl: null, isGroupMode: true, label: 'mensagem' });
      }
      setMessage('');
      onComplete?.();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Erro ao enviar mensagens');
    }
  };

  const handleSendMedia = async () => {
    const finalMediaUrl = media.selectedFile ? await fileToBase64(media.selectedFile) : media.mediaUrl.trim();
    if (!finalMediaUrl) { toast.error('Selecione um arquivo ou informe uma URL'); return; }
    if (selectedGroups.length === 0) { toast.error('Selecione pelo menos um grupo'); return; }
    if (media.mediaType === 'file' && !media.filename.trim()) { toast.error('Informe o nome do arquivo'); return; }

    const sendType = media.mediaType === 'audio' && media.isPtt ? 'ptt' : media.mediaType === 'file' ? 'document' : media.mediaType;
    const docName = media.mediaType === 'file' ? media.filename.trim() : '';
    const mediaLabel = media.mediaType === 'image' ? 'imagem' : media.mediaType === 'video' ? 'vídeo' : media.mediaType === 'audio' ? 'áudio' : 'arquivo';

    try {
      if (excludeAdmins) {
        const members = uniqueRegularMembers.filter(m => selectedParticipants.has(m.jid));
        if (members.length === 0) { toast.error('Selecione pelo menos um participante'); return; }
        await send.runSendLoop(members, async (m, at) => {
          await send.sendMedia(m.jid, finalMediaUrl, sendType, media.caption.trim(), docName, at);
          saveToHelpdesk(instance.id, m.jid, m.jid.replace('@s.whatsapp.net', ''), null, {
            content: media.caption.trim() || null, media_type: sendType === 'ptt' ? 'audio' : sendType === 'document' ? 'document' : sendType, media_url: media.mediaUrl.trim() || null,
          });
        }, { messageType: sendType, content: media.caption.trim() || null, mediaUrl: media.mediaUrl.trim() || null, isGroupMode: false, label: mediaLabel });
      } else {
        await send.runSendLoop(selectedGroups, async (g, at) => {
          await send.sendMedia(g.id, finalMediaUrl, sendType, media.caption.trim(), docName, at);
        }, { messageType: sendType, content: media.caption.trim() || null, mediaUrl: media.mediaUrl.trim() || null, isGroupMode: true, label: mediaLabel });
      }
      media.clearFile(); media.setMediaUrl(''); media.setCaption('');
      onComplete?.();
    } catch (error) {
      console.error('Error sending media broadcast:', error);
      toast.error('Erro ao enviar mídia');
    }
  };

  const handleSendCarousel = async () => {
    const cd = carousel.carouselData;
    if (cd.cards.length < 2) { toast.error('O carrossel precisa ter pelo menos 2 cards'); return; }
    if (cd.cards.some(c => (!c.image && !c.imageFile) || !c.text.trim())) { toast.error('Todos os cards devem ter imagem e texto'); return; }
    if (cd.cards.some(c => c.buttons.some(b => !b.label.trim() || (b.type === 'URL' && !b.url?.trim()) || (b.type === 'CALL' && !b.phone?.trim())))) { toast.error('Preencha todos os campos dos botões'); return; }
    if (selectedGroups.length === 0) { toast.error('Selecione pelo menos um grupo'); return; }
    if (excludeAdmins && selectedParticipants.size === 0) { toast.error('Selecione pelo menos um participante'); return; }

    try {
      const saveHelpdeskCarousel = async (jid: string) => {
        const phone = jid.replace('@s.whatsapp.net', '');
        try {
          const helpdeskCards = await Promise.all(cd.cards.map(async c => {
            let img = c.image || '';
            if (c.imageFile) img = await uploadCarouselImage(c.imageFile);
            else if (c.image?.startsWith('data:')) img = await uploadCarouselImage(await (await import('@/lib/uploadCarouselImage')).base64ToFile(c.image, `card-${c.id}.jpg`));
            return { id: c.id, text: c.text, image: img, buttons: c.buttons.map(b => ({ id: b.id, type: b.type, label: b.label, value: b.url || b.phone || '' })) };
          }));
          saveToHelpdesk(instance.id, jid, phone, null, {
            content: cd.message || '📋 Carrossel enviado',
            media_type: 'carousel',
            media_url: JSON.stringify({ message: cd.message, cards: helpdeskCards }),
          });
        } catch (err) { console.error('Error uploading carousel images for helpdesk:', err); }
      };

      if (excludeAdmins) {
        const members = uniqueRegularMembers.filter(m => selectedParticipants.has(m.jid));
        await send.runSendLoop(members, async (m, at) => {
          await send.sendCarousel(m.jid, cd, at);
          await saveHelpdeskCarousel(m.jid);
        }, { messageType: 'carousel', content: cd.message || null, mediaUrl: null, carouselData: cd, isGroupMode: false, label: 'carrossel' });
      } else {
        await send.runSendLoop(selectedGroups, async (g, at) => {
          await send.sendCarousel(g.id, cd, at);
        }, { messageType: 'carousel', content: cd.message || null, mediaUrl: null, carouselData: cd, isGroupMode: true, label: 'carrossel' });
      }
      carousel.resetCarousel();
      onComplete?.();
    } catch (error) {
      console.error('Error sending carousel broadcast:', error);
      toast.error('Erro ao enviar carrossel');
    }
  };

  const handleSend = async () => {
    if (activeTab === 'text') await handleSendText();
    else if (activeTab === 'carousel') await handleSendCarousel();
    else await handleSendMedia();
  };

  // ─── Schedule Handlers ───
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
      if (results.filter(r => r.error).length > 0) throw new Error('Falha ao agendar');
      toast.success(`${selectedGroups.length} agendamento(s) criado(s)!`);
      setMessage(''); setShowScheduleDialog(false); onComplete?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao agendar'); }
    finally { setIsScheduling(false); }
  };

  const handleScheduleMedia = async (config: ScheduleConfig) => {
    const trimmedUrl = media.mediaUrl.trim();
    if (!trimmedUrl) { toast.error('Para agendar mídia, informe uma URL (não arquivo local)'); return; }
    if (selectedGroups.length === 0) { toast.error('Selecione pelo menos um grupo'); return; }
    if (media.mediaType === 'file' && !media.filename.trim()) { toast.error('Informe o nome do arquivo'); return; }
    setIsScheduling(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { toast.error('Sessão expirada'); return; }
      const sendType = media.mediaType === 'audio' && media.isPtt ? 'ptt' : media.mediaType === 'file' ? 'document' : media.mediaType;
      const results = await Promise.all(selectedGroups.map(group => {
        const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin);
        const recipients = excludeAdmins && regularMembers.length > 0 ? regularMembers.map(m => ({ jid: m.jid })) : null;
        return supabase.from('scheduled_messages').insert({
          user_id: session.data.session!.user.id, instance_id: instance.id, group_jid: group.id, group_name: group.name,
          exclude_admins: excludeAdmins, recipients, message_type: sendType, content: media.caption.trim() || null,
          media_url: trimmedUrl, filename: media.mediaType === 'file' ? media.filename.trim() : null,
          scheduled_at: config.scheduledAt.toISOString(), next_run_at: config.scheduledAt.toISOString(),
          is_recurring: config.isRecurring, recurrence_type: config.isRecurring ? config.recurrenceType : null,
          recurrence_interval: config.recurrenceInterval, recurrence_days: config.recurrenceDays.length > 0 ? config.recurrenceDays : null,
          recurrence_end_at: config.recurrenceEndAt?.toISOString() || null, recurrence_count: config.recurrenceCount || null,
          random_delay: config.randomDelay, status: 'pending',
        });
      }));
      if (results.filter(r => r.error).length > 0) throw new Error('Falha ao agendar');
      toast.success(`${selectedGroups.length} agendamento(s) de mídia criado(s)!`);
      media.setMediaUrl(''); media.setCaption(''); media.setFilename(''); setShowScheduleDialog(false); onComplete?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao agendar mídia'); }
    finally { setIsScheduling(false); }
  };

  const handleSchedule = async (config: ScheduleConfig) => {
    if (activeTab === 'carousel') { toast.error('Agendamento de carrossel não suportado ainda'); return; }
    activeTab === 'text' ? await handleScheduleText(config) : await handleScheduleMedia(config);
  };

  // ─── Template Handling ───
  const handleSelectTemplate = (template: MessageTemplate) => {
    if (template.message_type === 'carousel' && template.carousel_data) {
      setActiveTab('carousel'); carousel.setCarouselData(template.carousel_data);
    } else if (template.message_type === 'text') {
      setActiveTab('text'); setMessage(template.content || '');
    } else {
      setActiveTab('media');
      const typeMap: Record<string, MediaType> = { image: 'image', video: 'video', audio: 'audio', ptt: 'audio', document: 'file' };
      media.setMediaType(typeMap[template.message_type] || 'image');
      media.setIsPtt(template.message_type === 'ptt');
      media.setMediaUrl(template.media_url || ''); media.setCaption(template.content || ''); media.setFilename(template.filename || ''); media.clearFile();
    }
    toast.success(`Template "${template.name}" aplicado`);
  };

  const handleSaveTemplate = async () => {
    if (activeTab === 'carousel') {
      const cd = carousel.carouselData;
      if (cd.cards.length < 2) { toast.error('O carrossel precisa ter pelo menos 2 cards'); return null; }
      const hasLocalFiles = cd.cards.some(c => c.imageFile);
      if (hasLocalFiles) toast.info('Enviando imagens do carrossel...');
      try {
        const uploadedCards = await Promise.all(cd.cards.map(async c => c.imageFile ? { ...c, image: await uploadCarouselImage(c.imageFile), imageFile: undefined } : { ...c, imageFile: undefined }));
        return { name: '', content: cd.message || undefined, message_type: 'carousel', carousel_data: { message: cd.message, cards: uploadedCards } };
      } catch { toast.error('Erro ao enviar imagens. Tente novamente.'); return null; }
    } else if (activeTab === 'text') {
      const t = message.trim();
      if (!t) { toast.error('Digite uma mensagem para salvar'); return null; }
      return { name: '', content: t, message_type: 'text' };
    } else {
      const u = media.mediaUrl.trim();
      if (!u && !media.selectedFile) { toast.error('Selecione uma mídia para salvar'); return null; }
      if (!u) { toast.error('Para salvar template de mídia, use uma URL'); return null; }
      const sendType = media.mediaType === 'audio' && media.isPtt ? 'ptt' : media.mediaType === 'file' ? 'document' : media.mediaType;
      return { name: '', content: media.caption.trim() || undefined, message_type: sendType, media_url: u, filename: media.mediaType === 'file' ? media.filename.trim() : undefined };
    }
  };

  // ─── Validation ───
  const isTextValid = activeTab === 'text' && message.trim() && !isOverLimit;
  const canSend = (isTextValid || (activeTab === 'media' && media.isMediaValid) || (activeTab === 'carousel' && carousel.isCarouselValid)) && selectedGroups.length > 0 && !(excludeAdmins && activeTab !== 'carousel' && selectedParticipants.size === 0);
  const canSchedule = activeTab === 'text' ? (!!message.trim() && !isOverLimit && selectedGroups.length > 0) : activeTab === 'media' ? (!!media.mediaUrl.trim() && selectedGroups.length > 0 && (media.mediaType !== 'file' || !!media.filename.trim())) : false;

  // ─── Estimated Time ───
  const getEstimatedTime = (): { min: number; max: number } | null => {
    if (randomDelay === 'none' || targetCount <= 1) return null;
    const count = targetCount - 1;
    const [minSec, maxSec] = DELAY_RANGES_SECONDS[randomDelay] || [5, 10];
    return { min: count * minSec, max: count * maxSec };
  };

  const getRemainingTime = (): number | null => {
    if (!send.progress.startedAt || send.elapsedTime === 0) return null;
    const total = excludeAdmins ? send.progress.totalMembers : send.progress.totalGroups;
    const done = excludeAdmins ? send.progress.currentMember : send.progress.currentGroup;
    if (done === 0 || done >= total) return null;
    return Math.ceil((send.elapsedTime / done) * (total - done));
  };

  return {
    // State
    activeTab, setActiveTab, message, setMessage, excludeAdmins, setExcludeAdmins,
    randomDelay, setRandomDelay, selectedParticipants, progress: send.progress, elapsedTime: send.elapsedTime,
    showScheduleDialog, setShowScheduleDialog, isScheduling,
    // Media state
    mediaType: media.mediaType, setMediaType: media.setMediaType, mediaUrl: media.mediaUrl, setMediaUrl: media.setMediaUrl,
    selectedFile: media.selectedFile, previewUrl: media.previewUrl,
    caption: media.caption, setCaption: media.setCaption, isPtt: media.isPtt, setIsPtt: media.setIsPtt,
    filename: media.filename, setFilename: media.setFilename, fileInputRef: media.fileInputRef,
    // Carousel state
    carouselData: carousel.carouselData, setCarouselData: carousel.setCarouselData,
    // Computed
    totalMembers, totalRegularMembers, uniqueRegularMembers, uniqueRegularMembersCount,
    characterCount, isOverLimit, isSending: send.isSending, targetCount,
    canSend, canSchedule, estimatedTime: getEstimatedTime(), remainingTime: getRemainingTime(),
    // Handlers
    handleSend, handleSchedule, handlePause: send.handlePause, handleResume: send.handleResume,
    handleCancel: send.handleCancel, handleCloseProgress: send.handleCloseProgress,
    clearFile: media.clearFile, getAcceptedTypes: media.getAcceptedTypes, handleFileSelect: media.handleFileSelect,
    handleParticipantSelectionChange, handleSelectTemplate, handleSaveTemplate,
    // Utils
    formatDuration,
  };
}
