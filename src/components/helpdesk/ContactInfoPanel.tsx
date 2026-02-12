import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Phone, ArrowLeft } from 'lucide-react';
import type { Conversation } from '@/pages/dashboard/HelpDesk';

interface ContactInfoPanelProps {
  conversation: Conversation;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack?: () => void;
}

const statusOptions = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'resolvida', label: 'Resolvida' },
];

const priorityOptions = [
  { value: 'alta', label: 'Alta', color: 'bg-destructive text-destructive-foreground' },
  { value: 'media', label: 'Média', color: 'bg-warning text-warning-foreground' },
  { value: 'baixa', label: 'Baixa', color: 'bg-primary text-primary-foreground' },
];

export const ContactInfoPanel = ({ conversation, onUpdateConversation, onBack }: ContactInfoPanelProps) => {
  const contact = conversation.contact;
  const name = contact?.name || contact?.phone || 'Desconhecido';

  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      {/* Back button (mobile) */}
      {onBack && (
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 -mt-1 h-10" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      )}
      {/* Contact */}
      <div className="flex flex-col items-center text-center">
        <Avatar className={cn('mb-3', onBack ? 'w-20 h-20' : 'w-16 h-16')}>
          <AvatarImage src={contact?.profile_pic_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-base">{name}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Phone className="w-3 h-3" />
          <span>{contact?.phone}</span>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium">Status</label>
        <Select
          value={conversation.status}
          onValueChange={(v) => onUpdateConversation(conversation.id, { status: v })}
        >
          <SelectTrigger className="h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium">Prioridade</label>
        <Select
          value={conversation.priority}
          onValueChange={(v) => onUpdateConversation(conversation.id, { priority: v })}
        >
          <SelectTrigger className="h-10 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', opt.color.split(' ')[0])} />
                  {opt.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inbox */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium">Caixa de Entrada</label>
        <Badge variant="secondary" className="text-xs">
          {conversation.inbox?.name || 'N/A'}
        </Badge>
      </div>
    </div>
  );
};
