import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ActionTooltip } from '@/components/ui/action-tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Inbox, Users, MoreVertical, Pencil, Copy, Trash2, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import WebhookRow from './WebhookRow';
import type { InboxWithDetails } from './types';

interface Props {
  inbox: InboxWithDetails;
  onManageMembers: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

const InboxCard = ({ inbox, onManageMembers, onDelete, onRefresh }: Props) => {
  const isConnected = inbox.instance_status === 'connected';

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Webhook editing (internalized)
  const [editingField, setEditingField] = useState<'webhook' | 'outgoing' | null>(null);
  const [webhookValue, setWebhookValue] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);

  const startEditName = () => { setNameValue(inbox.name); setEditingName(true); };
  const cancelEditName = () => setEditingName(false);
  const saveName = async () => {
    if (!nameValue.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.from('inboxes').update({ name: nameValue.trim() }).eq('id', inbox.id);
      if (error) throw error;
      toast.success('Nome atualizado!');
      setEditingName(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar nome');
    } finally {
      setSavingName(false);
    }
  };

  const startEditWebhook = (field: 'webhook' | 'outgoing') => {
    setEditingField(field);
    setWebhookValue((field === 'webhook' ? inbox.webhook_url : inbox.webhook_outgoing_url) || '');
  };

  const saveWebhook = async () => {
    if (!editingField) return;
    setSavingWebhook(true);
    const col = editingField === 'webhook' ? 'webhook_url' : 'webhook_outgoing_url';
    try {
      const { error } = await supabase.from('inboxes').update({ [col]: webhookValue.trim() || null } as any).eq('id', inbox.id);
      if (error) throw error;
      toast.success('Webhook atualizado!');
      setEditingField(null);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingWebhook(false);
    }
  };

  return (
    <div className="glass-card-hover p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isConnected ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 border border-border/50'}`}>
            <Inbox className={`w-5 h-5 ${isConnected ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <Input
                  className="h-8 text-sm font-semibold flex-1"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
                />
                <ActionTooltip label="Salvar nome">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary shrink-0" disabled={savingName} onClick={saveName}>
                    {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </Button>
                </ActionTooltip>
                <ActionTooltip label="Cancelar">
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={cancelEditName}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </ActionTooltip>
              </div>
            ) : (
              <p className="font-semibold text-sm truncate">{inbox.name}</p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
              <span className="text-xs text-muted-foreground truncate">{inbox.instance_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ActionTooltip label="Total de membros">
            <Badge variant="outline" className="gap-1 h-7 cursor-default">
              <Users className="w-3 h-3" />{inbox.member_count}
            </Badge>
          </ActionTooltip>
          <DropdownMenu>
            <ActionTooltip label="Opções">
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </ActionTooltip>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={startEditName}>
                <Pencil className="w-4 h-4 mr-2" /> Editar Nome
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManageMembers}>
                <Users className="w-4 h-4 mr-2" /> Gerenciar Membros
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(inbox.id); toast.success('Inbox ID copiado!'); }}>
                <Copy className="w-4 h-4 mr-2" /> Copiar ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Webhooks */}
      <div className="space-y-2">
        <WebhookRow
          label="Webhook Entrada"
          value={inbox.webhook_url}
          isEditing={editingField === 'webhook'}
          editValue={webhookValue}
          setEditValue={setWebhookValue}
          onEdit={() => startEditWebhook('webhook')}
          onSave={saveWebhook}
          onCancel={() => setEditingField(null)}
          isSaving={savingWebhook}
        />
        <WebhookRow
          label="Webhook Saída"
          value={inbox.webhook_outgoing_url}
          isEditing={editingField === 'outgoing'}
          editValue={webhookValue}
          setEditValue={setWebhookValue}
          onEdit={() => startEditWebhook('outgoing')}
          onSave={saveWebhook}
          onCancel={() => setEditingField(null)}
          isSaving={savingWebhook}
        />
      </div>
    </div>
  );
};

export default InboxCard;
