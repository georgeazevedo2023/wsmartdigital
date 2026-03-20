import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { ConversationFilters } from './ConversationFilters';
import { ConversationItem } from './ConversationItem';
import { ManageLabelsDialog } from './ManageLabelsDialog';
import type { Conversation } from '@/pages/dashboard/HelpDesk';
import type { Label } from './ConversationLabels';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (c: Conversation) => void;
  loading: boolean;
  inboxLabels?: Label[];
  conversationLabelsMap?: Record<string, string[]>;
  labelFilter?: string | null;
  onLabelFilterChange?: (labelId: string | null) => void;
  inboxId?: string;
  onLabelsChanged?: () => void;
  agentNamesMap?: Record<string, string>;
  conversationNotesSet?: Set<string>;
  assignmentFilter?: 'todas' | 'minhas' | 'nao-atribuidas';
  onAssignmentFilterChange?: (v: 'todas' | 'minhas' | 'nao-atribuidas') => void;
  priorityFilter?: 'todas' | 'alta' | 'media' | 'baixa';
  onPriorityFilterChange?: (v: 'todas' | 'alta' | 'media' | 'baixa') => void;
}

export const ConversationList = ({
  conversations,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelect,
  loading,
  inboxLabels = [],
  conversationLabelsMap = {},
  labelFilter,
  onLabelFilterChange,
  inboxId,
  onLabelsChanged,
  agentNamesMap = {},
  conversationNotesSet = new Set(),
  assignmentFilter = 'todas',
  onAssignmentFilterChange,
  priorityFilter = 'todas',
  onPriorityFilterChange,
}: ConversationListProps) => {
  const [manageOpen, setManageOpen] = useState(false);

  const hasActiveFilters = assignmentFilter !== 'todas' || priorityFilter !== 'todas' || !!labelFilter;

  return (
    <>
      <ConversationFilters
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        assignmentFilter={assignmentFilter}
        onAssignmentFilterChange={onAssignmentFilterChange}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={onPriorityFilterChange}
        inboxLabels={inboxLabels}
        labelFilter={labelFilter ?? null}
        onLabelFilterChange={onLabelFilterChange}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          onAssignmentFilterChange?.('todas');
          onPriorityFilterChange?.('todas');
          onLabelFilterChange?.(null);
        }}
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma conversa</p>
            {hasActiveFilters && <p className="text-xs mt-1 opacity-70">Tente limpar os filtros</p>}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {conversations.map(c => (
              <ConversationItem
                key={c.id}
                conversation={c}
                isSelected={c.id === selectedId}
                onClick={() => onSelect(c)}
                labels={inboxLabels.filter(l => (conversationLabelsMap[c.id] || []).includes(l.id))}
                agentName={c.assigned_to ? agentNamesMap[c.assigned_to] || null : null}
                hasNotes={conversationNotesSet.has(c.id)}
              />
            ))}
          </div>
        )}
      </div>

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
