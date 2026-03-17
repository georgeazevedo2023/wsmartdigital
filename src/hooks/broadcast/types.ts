import type { CarouselData } from '@/components/broadcast/CarouselEditor';

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
export type RandomDelay = 'none' | '5-10' | '10-20' | '30-40' | '40-60' | '120-180';

// ─── Constants ───────────────────────────────────────────────────────
export const MAX_MESSAGE_LENGTH = 4096;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const SEND_DELAY_MS = 350;
export const GROUP_DELAY_MS = 500;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/mp3', 'audio/wav'];

export const DELAY_RANGES: Record<string, [number, number]> = {
  '5-10': [5000, 10000],
  '10-20': [10000, 20000],
  '30-40': [30000, 40000],
  '40-60': [40000, 60000],
  '120-180': [120000, 180000],
};

export const DELAY_RANGES_SECONDS: Record<string, [number, number]> = {
  '5-10': [5, 10],
  '10-20': [10, 20],
  '30-40': [30, 40],
  '40-60': [40, 60],
  '120-180': [120, 180],
};

// ─── Utilities ───────────────────────────────────────────────────────
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fileToBase64 = (file: File): Promise<string> =>
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
