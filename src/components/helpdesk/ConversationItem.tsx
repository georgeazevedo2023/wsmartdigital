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
        'w-full text-left px-3 py-3 flex items-start gap-3 transition-colors hover:bg-secondary/50',
        isSelected && 'bg-primary/10 border-l-2 border-primary',
        !conversation.is_read && 'bg-secondary/30'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={contact?.profile_pic_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
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
          <span className={cn('text-sm truncate', !conversation.is_read && 'font-bold')}>
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
          <p className="text-xs text-muted-foreground truncate">
            {conversation.inbox?.name || ''}
          </p>
          {!conversation.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
};
