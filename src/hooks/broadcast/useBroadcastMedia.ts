import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { MediaType, InitialData } from './types';
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, ALLOWED_AUDIO_TYPES } from './types';

export function useBroadcastMedia(initialData?: InitialData) {
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

  const clearFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFilename('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl]);

  const getAcceptedTypes = () => {
    const map: Record<string, string> = {
      image: ALLOWED_IMAGE_TYPES.join(','),
      video: ALLOWED_VIDEO_TYPES.join(','),
      audio: ALLOWED_AUDIO_TYPES.join(','),
      file: '*/*',
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
    setSelectedFile(file);
    setFilename(file.name);
    if (['image', 'video', 'audio'].includes(mediaType)) setPreviewUrl(URL.createObjectURL(file));
  };

  const isMediaValid = (selectedFile || mediaUrl.trim()) && (mediaType !== 'file' || filename.trim());

  return {
    mediaType, setMediaType, mediaUrl, setMediaUrl, selectedFile, previewUrl,
    caption, setCaption, isPtt, setIsPtt, filename, setFilename, fileInputRef,
    clearFile, getAcceptedTypes, handleFileSelect, isMediaValid,
  };
}
