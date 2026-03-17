import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Loader2 } from 'lucide-react';
import type { GroupData } from '@/hooks/useLeadImport';

interface ImportGroupsTabProps {
  groups: GroupData[];
  loadingGroups: boolean;
  selectedGroupIds: Set<string>;
  groupSearch: string;
  setGroupSearch: (v: string) => void;
  filteredGroups: GroupData[];
  isExtracting: boolean;
  onFetchGroups: () => void;
  onToggleGroup: (id: string) => void;
  onExtract: () => void;
}

const ImportGroupsTab = ({
  groups, loadingGroups, selectedGroupIds, groupSearch, setGroupSearch,
  filteredGroups, isExtracting, onFetchGroups, onToggleGroup, onExtract,
}: ImportGroupsTabProps) => {
  if (loadingGroups) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Clique para carregar os grupos</p>
        <Button variant="outline" className="mt-4" onClick={onFetchGroups}>Carregar Grupos</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar grupo..." value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} className="pl-9" />
      </div>

      <ScrollArea className="h-64 border rounded-lg">
        <div className="p-2 space-y-1">
          {filteredGroups.map(group => {
            const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin).length;
            return (
              <Card
                key={group.id}
                className={`cursor-pointer transition-all ${selectedGroupIds.has(group.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                onClick={() => onToggleGroup(group.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <Checkbox checked={selectedGroupIds.has(group.id)} onCheckedChange={() => onToggleGroup(group.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground">{regularMembers} membro{regularMembers !== 1 ? 's' : ''} (excluindo admins)</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {selectedGroupIds.size > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            {selectedGroupIds.size} grupo{selectedGroupIds.size !== 1 ? 's' : ''} selecionado{selectedGroupIds.size !== 1 ? 's' : ''}
          </Badge>
          <Button onClick={onExtract} disabled={isExtracting}>
            {isExtracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
            Extrair Membros
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImportGroupsTab;
