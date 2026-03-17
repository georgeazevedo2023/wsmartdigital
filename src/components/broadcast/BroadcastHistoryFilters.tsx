import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Filter, X, Calendar, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatusFilter, MessageTypeFilter, TargetFilter } from '@/hooks/useBroadcastHistory';

interface FiltersProps {
  statusFilter: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  typeFilter: MessageTypeFilter;
  onTypeChange: (v: MessageTypeFilter) => void;
  targetFilter: TargetFilter;
  onTargetChange: (v: TargetFilter) => void;
  instanceFilter: string;
  onInstanceChange: (v: string) => void;
  uniqueInstances: { id: string; name: string }[];
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onClearFilters: () => void;
  isMobile: boolean;
  filtersExpanded: boolean;
  onFiltersExpandedChange: (v: boolean) => void;
}

const STATUS_OPTIONS: [StatusFilter, string][] = [
  ['all', 'Todos status'], ['completed', 'Concluído'], ['cancelled', 'Cancelado'], ['error', 'Erro'],
];

const TYPE_OPTIONS: [MessageTypeFilter, string][] = [
  ['all', 'Todos tipos'], ['text', 'Texto'], ['image', 'Imagem'],
  ['video', 'Vídeo'], ['audio', 'Áudio'], ['document', 'Documento'], ['carousel', 'Carrossel'],
];

const TARGET_OPTIONS: [TargetFilter, string][] = [
  ['all', 'Todos destinos'], ['groups', 'Grupos'], ['leads', 'Leads'],
];

const SelectFilter = <T extends string>({
  value, onChange, options, className,
}: { value: T; onChange: (v: T) => void; options: [T, string][]; className?: string }) => (
  <Select value={value} onValueChange={(v) => onChange(v as T)}>
    <SelectTrigger className={className}><SelectValue /></SelectTrigger>
    <SelectContent>
      {options.map(([val, label]) => (
        <SelectItem key={val} value={val}>{label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const MobileFilters = (props: FiltersProps) => (
  <Collapsible open={props.filtersExpanded} onOpenChange={props.onFiltersExpandedChange}>
    <CollapsibleTrigger asChild>
      <Button variant="outline" className="w-full justify-between h-10">
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span>Filtros</span>
          {props.activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">{props.activeFilterCount}</Badge>
          )}
        </span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", props.filtersExpanded && "rotate-180")} />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="pt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <SelectFilter value={props.statusFilter} onChange={props.onStatusChange} options={STATUS_OPTIONS} className="h-9 text-xs" />
        <SelectFilter value={props.typeFilter} onChange={props.onTypeChange} options={TYPE_OPTIONS} className="h-9 text-xs" />
        <SelectFilter value={props.targetFilter} onChange={props.onTargetChange} options={TARGET_OPTIONS} className="h-9 text-xs" />
        <Select value={props.instanceFilter} onValueChange={props.onInstanceChange}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Instância" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas instâncias</SelectItem>
            {props.uniqueInstances.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Input type="date" value={props.dateFrom} onChange={(e) => props.onDateFromChange(e.target.value)} className="flex-1 h-9 text-xs" />
        <span className="text-muted-foreground text-xs shrink-0">até</span>
        <Input type="date" value={props.dateTo} onChange={(e) => props.onDateToChange(e.target.value)} className="flex-1 h-9 text-xs" />
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={props.searchQuery} onChange={(e) => props.onSearchChange(e.target.value)} placeholder="Buscar..." className="w-full h-9 text-xs pl-8" />
      </div>
      {props.hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={props.onClearFilters} className="w-full h-8 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4 mr-1" /> Limpar filtros
        </Button>
      )}
    </CollapsibleContent>
  </Collapsible>
);

const DesktopFilters = (props: FiltersProps) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="w-4 h-4" /><span>Filtros:</span>
      </div>
      <SelectFilter value={props.statusFilter} onChange={props.onStatusChange} options={STATUS_OPTIONS} className="w-[140px] h-8 text-sm" />
      <SelectFilter value={props.typeFilter} onChange={props.onTypeChange} options={TYPE_OPTIONS} className="w-[140px] h-8 text-sm" />
      <SelectFilter value={props.targetFilter} onChange={props.onTargetChange} options={TARGET_OPTIONS} className="w-[130px] h-8 text-sm" />
      <Select value={props.instanceFilter} onValueChange={props.onInstanceChange}>
        <SelectTrigger className="w-[180px] h-8 text-sm"><SelectValue placeholder="Instância" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas instâncias</SelectItem>
          {props.uniqueInstances.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {props.hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={props.onClearFilters} className="h-8 px-2 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4 mr-1" /> Limpar
        </Button>
      )}
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Input type="date" value={props.dateFrom} onChange={(e) => props.onDateFromChange(e.target.value)} className="w-[140px] h-8 text-sm" />
        <span className="text-muted-foreground text-sm">até</span>
        <Input type="date" value={props.dateTo} onChange={(e) => props.onDateToChange(e.target.value)} className="w-[140px] h-8 text-sm" />
      </div>
      <Input value={props.searchQuery} onChange={(e) => props.onSearchChange(e.target.value)} placeholder="Buscar por conteúdo, instância ou grupo..." className="flex-1 min-w-[200px] h-8 text-sm" />
    </div>
  </div>
);

const BroadcastHistoryFilters = (props: FiltersProps) => {
  return props.isMobile ? <MobileFilters {...props} /> : <DesktopFilters {...props} />;
};

export default BroadcastHistoryFilters;
