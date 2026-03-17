import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Database, Plus, Save, Settings2, Loader2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { LeadDatabase } from '@/hooks/useLeadsBroadcaster';

interface LeadDatabasePickerProps {
  databases: LeadDatabase[];
  selectedDatabases: LeadDatabase[];
  isLoading: boolean;
  isCreatingNew: boolean;
  newDatabaseName: string;
  setNewDatabaseName: (v: string) => void;
  canSaveDatabase: boolean;
  isSavingDatabase: boolean;
  hasUnsavedChanges: boolean;
  onToggleDatabase: (db: LeadDatabase) => void;
  onStartNewDatabase: () => void;
  onSaveDatabase: () => void;
  onUpdateDatabase: () => void;
  onManage: (db: LeadDatabase) => void;
}

const LeadDatabasePicker = ({
  databases, selectedDatabases, isLoading, isCreatingNew,
  newDatabaseName, setNewDatabaseName, canSaveDatabase,
  isSavingDatabase, hasUnsavedChanges,
  onToggleDatabase, onStartNewDatabase, onSaveDatabase,
  onUpdateDatabase, onManage,
}: LeadDatabasePickerProps) => (
  <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
    <CardContent className="p-4">
      <Label className="text-sm font-medium mb-3 block">Bases de Leads</Label>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full border-dashed justify-start gap-2"
          onClick={onStartNewDatabase}
          disabled={isLoading}
        >
          <Plus className="w-4 h-4" />
          Criar Nova Base
        </Button>

        {isLoading ? (
          <LoadingSpinner size="sm" label="Carregando..." className="py-4" />
        ) : (
          databases.map(db => {
            const isSelected = selectedDatabases.some(d => d.id === db.id);
            return (
              <div
                key={db.id}
                onClick={() => onToggleDatabase(db)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                  isSelected ? "border-primary bg-primary/5" : "border-border/50"
                )}
              >
                <Checkbox checked={isSelected} className="pointer-events-none" />
                <Database className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{db.name}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{db.leads_count ?? 0} contatos</span>
              </div>
            );
          })
        )}
      </div>

      {isCreatingNew && (
        <div className="mt-3 pt-3 border-t">
          <Label className="text-sm font-medium mb-2 block">Nome da Nova Base</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Clientes VIP..."
              value={newDatabaseName}
              onChange={(e) => setNewDatabaseName(e.target.value)}
            />
            <LoadingButton
              onClick={onSaveDatabase}
              disabled={!canSaveDatabase}
              loading={isSavingDatabase}
              size="sm"
              className="shrink-0"
            >
              <Save className="w-4 h-4" />
            </LoadingButton>
          </div>
          {hasUnsavedChanges && !newDatabaseName.trim() && (
            <p className="text-xs text-destructive mt-2">
              Digite um nome para salvar a base de leads
            </p>
          )}
        </div>
      )}

      {selectedDatabases.length === 1 && !isCreatingNew && (
        <div className="mt-3 pt-3 border-t flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={() => onManage(selectedDatabases[0])}>
            <Settings2 className="w-4 h-4 mr-2" />
            Gerenciar
          </Button>
          <Button variant="outline" size="sm" onClick={onUpdateDatabase} disabled={isSavingDatabase}>
            {isSavingDatabase ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Atualizar Base
              </>
            )}
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);

export default LeadDatabasePicker;
