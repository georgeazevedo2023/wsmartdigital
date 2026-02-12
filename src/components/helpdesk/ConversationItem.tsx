import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Conversation } from '@/pages/dashboard/HelpDesk';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const priorityColors: Record<string, string> = {
  alta: 'bg-destructive',
  media: 'bg-warning',
  baixa: 'bg-primary',
};

export const ConversationItem = ({ conversation, isSelected, onClick }: ConversationItemProps) => {
  const contact = conversation.contact;
  const name = contact?.name || contact?.phone || 'Desconhecido';
  const initials = name.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-3 min-h-[64px] flex items-center gap-3 transition-colors',
        'hover:bg-secondary/50 active:bg-secondary/70',
        isSelected && 'bg-primary/10 border-l-[3px] border-l-primary',
        !isSelected && !conversation.is_read && 'bg-primary/5 border-l-[3px] border-l-primary/50',
        !isSelected && conversation.is_read && 'border-l-[3px] border-l-transparent'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="w-11 h-11">
          <AvatarImage src={contact?.profile_pic_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Priority indicator */}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
            priorityColors[conversation.priority] || 'bg-muted'
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', !conversation.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground/90')}>
            {name}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {conversation.last_message_at
              ? formatDistanceToNow(new Date(conversation.last_message_at), {
                  addSuffix: false,
                  locale: ptBR,
                })
              : ''}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            'text-xs truncate flex-1',
            !conversation.is_read ? 'text-foreground/80 font-medium' : 'text-muted-foreground'
          )}>
            {conversation.last_message || conversation.inbox?.name || ''}
          </p>
          {!conversation.is_read && (
            <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
};
