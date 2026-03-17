import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { UserCheck } from 'lucide-react';
import type { Conversation } from '@/pages/dashboard/HelpDesk';
import type { InboxAgent } from '@/hooks/useContactInfo';

const statusOptions = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'resolvida', label: 'Resolvida' },
];

const priorityOptions = [
  { value: 'alta', label: 'Alta', color: 'bg-destructive' },
  { value: 'media', label: 'Média', color: 'bg-warning' },
  { value: 'baixa', label: 'Baixa', color: 'bg-primary' },
];

interface ContactDetailsSectionProps {
  conversation: Conversation;
  agents: InboxAgent[];
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onAssignAgent: (value: string) => void;
}

export const ContactDetailsSection = ({
  conversation,
  agents,
  onUpdateConversation,
  onAssignAgent,
}: ContactDetailsSectionProps) => (
  <>
    {/* Status */}
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">Status</label>
      <Select
        value={conversation.status}
        onValueChange={(v) => onUpdateConversation(conversation.id, { status: v })}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Priority */}
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">Prioridade</label>
      <Select
        value={conversation.priority}
        onValueChange={(v) => onUpdateConversation(conversation.id, { priority: v })}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', opt.color)} />
                {opt.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Agent Assignment */}
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
        <UserCheck className="w-3 h-3" />
        Agente Responsável
      </label>
      <div className="flex gap-1">
        <Select
          value={conversation.assigned_to || '__none__'}
          onValueChange={onAssignAgent}
        >
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Nenhum —</SelectItem>
            {agents.map(agent => (
              <SelectItem key={agent.user_id} value={agent.user_id}>
                {agent.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {conversation.assigned_to && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onAssignAgent('__none__')}
            title="Remover atribuição"
          >
            ✕
          </Button>
        )}
      </div>
    </div>

    {/* Inbox */}
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground font-medium">Caixa de Entrada</label>
      <Badge variant="secondary" className="text-xs">
        {conversation.inbox?.name || 'N/A'}
      </Badge>
    </div>
  </>
);
