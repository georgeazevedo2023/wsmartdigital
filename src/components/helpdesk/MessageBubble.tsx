import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Message } from '@/pages/dashboard/HelpDesk';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isOutgoing = message.direction === 'outgoing';
  const isNote = message.direction === 'private_note';

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

        {/* Media */}
        {message.media_type === 'image' && message.media_url && (
          <img
            src={message.media_url}
            alt="Imagem"
            className="rounded-lg max-w-full mb-1"
          />
        )}
        {message.media_type === 'audio' && message.media_url && (
          <audio controls className="max-w-full mb-1">
            <source src={message.media_url} />
          </audio>
        )}
        {message.media_type === 'video' && message.media_url && (
          <video controls className="rounded-lg max-w-full mb-1">
            <source src={message.media_url} />
          </video>
        )}

        {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

        <span className="text-[10px] text-muted-foreground block text-right mt-0.5">
          {format(new Date(message.created_at), 'HH:mm')}
        </span>
      </div>
    </div>
  );
};
