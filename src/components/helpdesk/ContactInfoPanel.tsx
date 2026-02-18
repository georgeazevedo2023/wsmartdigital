import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Phone, ArrowLeft, Tags, Settings2, UserCheck } from 'lucide-react';
import type { Conversation } from '@/pages/dashboard/HelpDesk';
import { ConversationLabels, type Label } from './ConversationLabels';
import { LabelPicker } from './LabelPicker';
import { ManageLabelsDialog } from './ManageLabelsDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InboxAgent {
  user_id: string;
  full_name: string;
}

interface ContactInfoPanelProps {
  conversation: Conversation;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack?: () => void;
  inboxLabels?: Label[];
  assignedLabelIds?: string[];
  onLabelsChanged?: () => void;
  agentNamesMap?: Record<string, string>;
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

export const ContactInfoPanel = ({
  conversation,
  onUpdateConversation,
  onBack,
  inboxLabels = [],
  assignedLabelIds = [],
  onLabelsChanged,
  agentNamesMap = {},
}: ContactInfoPanelProps) => {
  const contact = conversation.contact;
  const name = contact?.name || contact?.phone || 'Desconhecido';
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);
  const [agents, setAgents] = useState<InboxAgent[]>([]);

  // Fetch inbox members with their names directly (join inbox_users + user_profiles)
  useEffect(() => {
    const fetchAgents = async () => {
      if (!conversation.inbox_id) return;
      const { data, error } = await supabase
        .from('inbox_users')
        .select('user_id, user_profiles(id, full_name)')
        .eq('inbox_id', conversation.inbox_id);

      if (error) {
        console.error('[ContactInfoPanel] fetchAgents error:', error);
        return;
      }

      if (data) {
        const agentList: InboxAgent[] = data
          .map((d: any) => ({
            user_id: d.user_id,
            full_name: d.user_profiles?.full_name || d.user_id.slice(0, 8),
          }))
          .sort((a: InboxAgent, b: InboxAgent) => a.full_name.localeCompare(b.full_name));
        setAgents(agentList);
      }
    };
    fetchAgents();
  }, [conversation.inbox_id]);

  const assignedLabels = inboxLabels.filter(l => assignedLabelIds.includes(l.id));

  const handleRemoveLabel = async (labelId: string) => {
    try {
      await supabase
        .from('conversation_labels')
        .delete()
        .eq('conversation_id', conversation.id)
        .eq('label_id', labelId);
      onLabelsChanged?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover etiqueta');
    }
  };

  const handleAssignAgent = async (value: string) => {
    const agentId = value === '__none__' ? null : value;
    const agent = agentId ? agents.find(a => a.user_id === agentId) : null;
    const agentName = agent?.full_name || null;

    // Update DB
    const { error } = await supabase
      .from('conversations')
      .update({ assigned_to: agentId })
      .eq('id', conversation.id);

    if (error) {
      toast.error('Erro ao atribuir agente');
      return;
    }

    // Broadcast para sync em tempo real
    await supabase.channel('helpdesk-conversations').send({
      type: 'broadcast',
      event: 'assigned-agent',
      payload: {
        conversation_id: conversation.id,
        assigned_to: agentId,
      },
    });

    // Update local via callback
    onUpdateConversation(conversation.id, { assigned_to: agentId } as any);
    toast.success(agentId ? `Atribuído a ${agentName}` : 'Agente removido');
  };

  // Allow re-selecting "Nenhum" even when already null (force clear)
  const handleSelectOpenChange = (open: boolean) => {
    if (!open && conversation.assigned_to !== null) return;
  };

  return (
    <div className="p-4 space-y-5 overflow-y-auto flex-1">
      {onBack && (
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 -mt-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      )}

      {/* Contact */}
      <div className="flex flex-col items-center text-center">
        <Avatar className="w-16 h-16 mb-2">
          <AvatarImage src={contact?.profile_pic_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold">{name}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Phone className="w-3 h-3" />
          <span>{contact?.phone}</span>
        </div>
      </div>

      {/* Labels */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Tags className="w-3 h-3" />
            Etiquetas
          </label>
          <div className="flex items-center gap-0.5">
            {onLabelsChanged && (
              <LabelPicker
                conversationId={conversation.id}
                inboxLabels={inboxLabels}
                assignedLabelIds={assignedLabelIds}
                onChanged={onLabelsChanged}
              />
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setManageLabelsOpen(true)} title="Gerenciar etiquetas">
              <Settings2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <ConversationLabels labels={assignedLabels} size="md" onRemove={handleRemoveLabel} />
        {assignedLabels.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma etiqueta</p>
        )}
      </div>

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
                  <span className={cn('w-2 h-2 rounded-full', opt.color.split(' ')[0])} />
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
            onValueChange={handleAssignAgent}
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
              onClick={() => handleAssignAgent('__none__')}
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

      {/* Manage Labels Dialog */}
      {conversation.inbox_id && onLabelsChanged && (
        <ManageLabelsDialog
          open={manageLabelsOpen}
          onOpenChange={setManageLabelsOpen}
          inboxId={conversation.inbox_id}
          labels={inboxLabels}
          onChanged={onLabelsChanged}
        />
      )}
    </div>
  );
};
