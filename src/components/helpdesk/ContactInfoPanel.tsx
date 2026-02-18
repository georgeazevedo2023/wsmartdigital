import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Phone, ArrowLeft, Tags, Settings2, UserCheck, Sparkles, RefreshCw, Clock, Target, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Conversation, AiSummary } from '@/pages/dashboard/HelpDesk';
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
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(conversation.ai_summary || null);
  const [summarizing, setSummarizing] = useState(false);

  // Sync aiSummary when conversation changes
  useEffect(() => {
    setAiSummary(conversation.ai_summary || null);
  }, [conversation.id, conversation.ai_summary]);

  const handleSummarize = async (forceRefresh = false) => {
    setSummarizing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-conversation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ conversation_id: conversation.id, force_refresh: forceRefresh }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 429) throw new Error('Limite de IA atingido. Tente mais tarde.');
        if (res.status === 402) throw new Error('Créditos de IA insuficientes.');
        throw new Error(result.error || 'Erro ao gerar resumo');
      }

      setAiSummary(result.summary);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar resumo');
    } finally {
      setSummarizing(false);
    }
  };

  // Fetch inbox members using two separate queries (no FK between inbox_users and user_profiles)
  useEffect(() => {
    const fetchAgents = async () => {
      if (!conversation.inbox_id) return;

      // Step 1: get user_ids from inbox_users
      const { data: members, error: membersError } = await supabase
        .from('inbox_users')
        .select('user_id')
        .eq('inbox_id', conversation.inbox_id);

      if (membersError) {
        console.error('[ContactInfoPanel] fetchAgents members error:', membersError);
        return;
      }

      const userIds = members?.map(m => m.user_id) ?? [];
      if (userIds.length === 0) {
        setAgents([]);
        return;
      }

      // Step 2: get full names from user_profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('[ContactInfoPanel] fetchAgents profiles error:', profilesError);
        return;
      }

      const agentList: InboxAgent[] = (profiles ?? [])
        .map(p => ({
          user_id: p.id,
          full_name: p.full_name || 'Sem nome',
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

      setAgents(agentList);
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

      {/* AI Summary */}
      <div className="space-y-2 border border-border/50 rounded-lg p-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium flex items-center gap-1.5 text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Resumo da Conversa
          </label>
          {aiSummary && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => handleSummarize(true)}
              disabled={summarizing}
              title="Atualizar resumo"
            >
              <RefreshCw className={cn('w-3 h-3', summarizing && 'animate-spin')} />
            </Button>
          )}
        </div>

        {summarizing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-primary" />
            <span>Analisando conversa com IA...</span>
          </div>
        )}

      {!summarizing && !aiSummary && (
          <p className="text-xs text-muted-foreground italic py-1">
            Resumo gerado automaticamente ao resolver a conversa ou após 1h de inatividade.
          </p>
        )}

        {!summarizing && aiSummary && (
          <div className="space-y-2.5 text-xs">
            {/* Reason */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-muted-foreground font-medium">
                <Target className="w-3 h-3" />
                Motivo do contato
              </div>
              <p className="text-foreground leading-relaxed">{aiSummary.reason}</p>
            </div>

            {/* Summary */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-muted-foreground font-medium">
                <AlertCircle className="w-3 h-3" />
                Resumo
              </div>
              <p className="text-foreground leading-relaxed">{aiSummary.summary}</p>
            </div>

            {/* Resolution */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-muted-foreground font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Resolução
              </div>
              <p className="text-foreground leading-relaxed">{aiSummary.resolution}</p>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                <span>
                  Gerado {new Date(aiSummary.generated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <span className="text-muted-foreground">{aiSummary.message_count} msgs</span>
            </div>
          </div>
        )}
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
