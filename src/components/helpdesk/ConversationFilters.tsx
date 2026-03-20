import { Search, UserCheck, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Label } from './ConversationLabels';

const assignmentOptions: { value: 'todas' | 'minhas' | 'nao-atribuidas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'minhas', label: 'Minhas' },
  { value: 'nao-atribuidas', label: 'Não atribuídas' },
];

const priorityOptions: { value: 'todas' | 'alta' | 'media' | 'baixa'; label: string }[] = [
  { value: 'todas', label: 'Prioridade' },
  { value: 'alta', label: '🔴 Alta' },
  { value: 'media', label: '🟡 Média' },
  { value: 'baixa', label: '🔵 Baixa' },
];

interface ConversationFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  assignmentFilter: 'todas' | 'minhas' | 'nao-atribuidas';
  onAssignmentFilterChange?: (v: 'todas' | 'minhas' | 'nao-atribuidas') => void;
  priorityFilter: 'todas' | 'alta' | 'media' | 'baixa';
  onPriorityFilterChange?: (v: 'todas' | 'alta' | 'media' | 'baixa') => void;
  inboxLabels: Label[];
  labelFilter: string | null;
  onLabelFilterChange?: (labelId: string | null) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export const ConversationFilters = ({
  searchQuery,
  onSearchChange,
  assignmentFilter,
  onAssignmentFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  inboxLabels,
  labelFilter,
  onLabelFilterChange,
  hasActiveFilters,
  onClearFilters,
}: ConversationFiltersProps) => (
  <div className="p-2.5 border-b border-border/50 space-y-2">
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <Input
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Buscar conversa..."
        className="pl-8 h-8 text-sm bg-secondary/40 border-border/30 focus-visible:ring-1"
      />
    </div>

    <div className="flex gap-1.5">
      <Select
        value={assignmentFilter}
        onValueChange={(v) => onAssignmentFilterChange?.(v as 'todas' | 'minhas' | 'nao-atribuidas')}
      >
        <SelectTrigger
          className={cn(
            'flex-1 h-7 text-xs border-border/30 gap-1 min-w-0',
            assignmentFilter !== 'todas' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary/40'
          )}
        >
          <UserCheck className="w-3 h-3 shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {assignmentOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={priorityFilter}
        onValueChange={(v) => onPriorityFilterChange?.(v as 'todas' | 'alta' | 'media' | 'baixa')}
      >
        <SelectTrigger
          className={cn(
            'flex-1 h-7 text-xs border-border/30 gap-1 min-w-0',
            priorityFilter !== 'todas' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary/40'
          )}
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {inboxLabels.length > 0 && onLabelFilterChange && (
        <Select
          value={labelFilter || '_all'}
          onValueChange={v => onLabelFilterChange(v === '_all' ? null : v)}
        >
          <SelectTrigger
            className={cn(
              'flex-1 h-7 text-xs border-border/30 gap-1 min-w-0',
              labelFilter ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary/40'
            )}
          >
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all" className="text-xs">Etiquetas</SelectItem>
            {inboxLabels.map(l => (
              <SelectItem key={l.id} value={l.id} className="text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  {l.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>

    {hasActiveFilters && (
      <button
        onClick={onClearFilters}
        className="text-[10px] text-primary/80 hover:text-primary transition-colors"
      >
        ✕ Limpar filtros
      </button>
    )}
  </div>
);
