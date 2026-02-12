import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ImageIcon, ExternalLink, FileText, Download, Loader2 } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from '@/pages/dashboard/HelpDesk';

interface MessageBubbleProps {
  message: Message;
  instanceId?: string;
}

export const MessageBubble = ({ message, instanceId }: MessageBubbleProps) => {
  const isOutgoing = message.direction === 'outgoing';
  const isNote = message.direction === 'private_note';
  const [imgError, setImgError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDocumentOpen = async () => {
    if (!message.media_url || !instanceId) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('uazapi-proxy', {
        body: { action: 'download-media', fileUrl: message.media_url, instanceId },
      });

      if (error) throw error;

      // data is already a Blob when responseType isn't json
      const blob = data instanceof Blob ? data : new Blob([JSON.stringify(data)], { type: 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Error downloading document:', err);
      // Fallback: try direct link
      window.open(message.media_url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  // Extract friendly file name for documents
  const getDocumentInfo = () => {
    const raw = (typeof message.content === 'string' && message.content) 
      ? message.content 
      : message.media_url?.split('/').pop()?.split('?')[0] || 'Documento';
    // If name looks like a hash (64+ hex chars), show generic name
    const isHash = /^[0-9a-f]{32,}\.\w+$/i.test(raw);
    const fileName = isHash ? `Documento.${raw.split('.').pop() || 'pdf'}` : raw;
    const ext = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() || 'DOC' : 'DOC';
    return { fileName, ext };
  };

  return (
    <div
      className={cn(
        'flex',
        isOutgoing ? 'justify-end' : 'justify-start',
        isNote && 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-xl px-3 py-2 text-sm',
          isNote
            ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-200 italic'
            : isOutgoing
              ? 'bg-emerald-600/25 border border-emerald-500/20 text-foreground rounded-br-sm'
              : 'bg-secondary/80 text-foreground rounded-bl-sm'
        )}
      >
        {isNote && (
          <span className="text-[10px] font-semibold text-yellow-400 block mb-0.5">
            📝 Nota privada
          </span>
        )}

        {/* Image with error fallback */}
        {message.media_type === 'image' && message.media_url && (
          <div className="mb-1">
            {!imgError ? (
              <a href={message.media_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={message.media_url}
                  alt="Imagem"
                  className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                  onError={() => setImgError(true)}
                />
              </a>
            ) : (
              <div className="rounded-lg bg-muted/50 border border-border flex flex-col items-center justify-center py-6 px-4 gap-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir imagem
                </a>
              </div>
            )}
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-primary hover:underline break-all block mt-0.5"
            >
              {message.media_url.length > 60
                ? message.media_url.substring(0, 60) + '...'
                : message.media_url}
            </a>
          </div>
        )}

        {message.media_type === 'audio' && message.media_url && (
          <div>
            <AudioPlayer src={message.media_url} direction={message.direction} />
            {message.transcription ? (
              <p className="text-[11px] text-muted-foreground italic mt-1 whitespace-pre-wrap">
                📝 {message.transcription}
              </p>
            ) : message.direction === 'incoming' ? (
              <div className="flex items-center gap-1.5 mt-1 animate-pulse">
                <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground animate-spin" />
                <span className="text-[11px] text-muted-foreground italic">Transcrevendo...</span>
              </div>
            ) : null}
          </div>
        )}
        {message.media_type === 'video' && message.media_url && (
          <video controls className="rounded-lg max-w-full mb-1">
            <source src={message.media_url} />
          </video>
        )}

        {message.media_type === 'document' && message.media_url && (() => {
          const { fileName, ext } = getDocumentInfo();
          return (
            <button
              onClick={handleDocumentOpen}
              disabled={downloading}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors mb-1 w-full text-left cursor-pointer disabled:opacity-50"
            >
              <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{fileName}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{ext}</span>
              </div>
              {downloading ? (
                <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
              ) : (
                <Download className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          );
        })()}

        {message.media_type !== 'document' && message.content && typeof message.content === 'string' && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        {message.content && typeof message.content === 'object' && (
          <p className="whitespace-pre-wrap break-words text-muted-foreground italic text-xs">[Mídia]</p>
        )}

        <span className="text-[10px] text-muted-foreground block text-right mt-0.5">
          {format(new Date(message.created_at), 'HH:mm')}
        </span>
      </div>
    </div>
  );
};
