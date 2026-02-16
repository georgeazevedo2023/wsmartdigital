import { useState } from 'react';
import { Search, Inbox, RefreshCw, Tags } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ConversationItem } from './ConversationItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManageLabelsDialog } from './ManageLabelsDialog';
import type { Conversation } from '@/pages/dashboard/HelpDesk';
import type { Label } from './ConversationLabels';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (c: Conversation) => void;
  loading: boolean;
  onSync?: () => void;
  syncing?: boolean;
  inboxLabels?: Label[];
  conversationLabelsMap?: Record<string, string[]>;
  labelFilter?: string | null;
  onLabelFilterChange?: (labelId: string | null) => void;
  inboxId?: string;
  onLabelsChanged?: () => void;
  agentNamesMap?: Record<string, string>;
}

const statusTabs = [
  { value: 'aberta', label: 'Abertas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'resolvida', label: 'Resolvidas' },
  { value: 'todas', label: 'Todas' },
];

export const ConversationList = ({
  conversations,
  selectedId,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  onSelect,
  loading,
  onSync,
  syncing,
  inboxLabels = [],
  conversationLabelsMap = {},
  labelFilter,
  onLabelFilterChange,
  inboxId,
  onLabelsChanged,
  agentNamesMap = {},
}: ConversationListProps) => {
  const unreadCount = conversations.filter(c => !c.is_read).length;
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <>
      {/* Filters */}
      <div className="p-3 border-b border-border/50">
        {/* Status tabs */}
        <div className="flex gap-1 mb-3">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => onStatusFilterChange(tab.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Label filter */}
        {inboxLabels.length > 0 && onLabelFilterChange && (
          <div className="mb-3">
            <Select value={labelFilter || '_all'} onValueChange={v => onLabelFilterChange(v === '_all' ? null : v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Filtrar por etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas as etiquetas</SelectItem>
                {inboxLabels.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                      {l.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar conversa..."
            className="pl-8 h-8 text-sm bg-secondary/50 border-border/30"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="w-10 h-10 mb-2" />
            <p className="text-sm">Nenhuma conversa</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30 pr-3">
            {conversations.map(c => (
              <ConversationItem
                key={c.id}
                conversation={c}
                isSelected={c.id === selectedId}
                onClick={() => onSelect(c)}
                labels={inboxLabels.filter(l => (conversationLabelsMap[c.id] || []).includes(l.id))}
                agentName={c.assigned_to ? agentNamesMap[c.assigned_to] || null : null}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Manage Labels Dialog */}
      {inboxId && onLabelsChanged && (
        <ManageLabelsDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          inboxId={inboxId}
          labels={inboxLabels}
          onChanged={onLabelsChanged}
        />
      )}
    </>
  );
};
