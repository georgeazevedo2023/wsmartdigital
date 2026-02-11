import { Search, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ConversationItem } from './ConversationItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '@/pages/dashboard/HelpDesk';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (c: Conversation) => void;
  loading: boolean;
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
}: ConversationListProps) => {
  const unreadCount = conversations.filter(c => !c.is_read).length;

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">Atendimento</h2>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

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
          <div className="divide-y divide-border/30">
            {conversations.map(c => (
              <ConversationItem
                key={c.id}
                conversation={c}
                isSelected={c.id === selectedId}
                onClick={() => onSelect(c)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );
};
