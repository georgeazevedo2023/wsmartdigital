import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, CheckSquare, Square, User } from 'lucide-react';
import type { Lead } from '@/pages/dashboard/LeadsBroadcaster';

interface LeadListProps {
  leads: Lead[];
  selectedLeads: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

const LeadList = ({ leads, selectedLeads, onSelectionChange }: LeadListProps) => {
  const [search, setSearch] = useState('');

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    
    const searchLower = search.toLowerCase();
    return leads.filter(lead =>
      lead.phone.includes(search) ||
      lead.name?.toLowerCase().includes(searchLower) ||
      lead.groupName?.toLowerCase().includes(searchLower)
    );
  }, [leads, search]);

  const handleToggle = (leadId: string) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredLeads.map(l => l.id));
    onSelectionChange(allIds);
  };

  const handleClearSelection = () => {
    onSelectionChange(new Set());
  };

  const allSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedLeads.has(l.id));
  const someSelected = filteredLeads.some(l => selectedLeads.has(l.id));

  const getSourceBadge = (source: Lead['source'], groupName?: string) => {
    switch (source) {
      case 'paste':
        return <Badge variant="outline" className="text-xs">Colado</Badge>;
      case 'manual':
        return <Badge variant="outline" className="text-xs">Manual</Badge>;
      case 'group':
        return (
          <Badge variant="secondary" className="text-xs truncate max-w-[120px]" title={groupName}>
            {groupName || 'Grupo'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Search and actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, número ou grupo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={allSelected ? handleClearSelection : handleSelectAll}
            className="gap-1.5"
          >
            {allSelected ? (
              <>
                <Square className="w-4 h-4" />
                Limpar
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                Selecionar todos
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Selection counter */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {selectedLeads.size} de {leads.length} selecionado{selectedLeads.size !== 1 ? 's' : ''}
        </span>
        {search && filteredLeads.length !== leads.length && (
          <Badge variant="secondary" className="text-xs">
            {filteredLeads.length} resultado{filteredLeads.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Lead list */}
      <ScrollArea className="h-64 border rounded-lg">
        <div className="p-2 space-y-1">
          {filteredLeads.map(lead => (
            <div
              key={lead.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                selectedLeads.has(lead.id) 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleToggle(lead.id)}
            >
              <Checkbox
                checked={selectedLeads.has(lead.id)}
                onCheckedChange={() => handleToggle(lead.id)}
              />
              
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {lead.name || lead.phone}
                </p>
                {lead.name && (
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                )}
              </div>
              
              {getSourceBadge(lead.source, lead.groupName)}
            </div>
          ))}

          {filteredLeads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {search ? 'Nenhum contato encontrado' : 'Nenhum contato importado'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default LeadList;
