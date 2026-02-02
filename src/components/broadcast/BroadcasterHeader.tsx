import { Button } from '@/components/ui/button';
import { Server, Database } from 'lucide-react';
import type { Instance } from './InstanceSelector';

interface LeadDatabase {
  id: string;
  name: string;
  description: string | null;
  leads_count: number;
  created_at: string;
  updated_at: string;
}

interface BroadcasterHeaderProps {
  instance?: Instance | null;
  database?: LeadDatabase | null;
  onChangeInstance?: () => void;
  onChangeDatabase?: () => void;
  showDatabase?: boolean;
}

const BroadcasterHeader = ({
  instance,
  database,
  onChangeInstance,
  onChangeDatabase,
  showDatabase = true,
}: BroadcasterHeaderProps) => {
  if (!instance) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/40 rounded-lg border text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Server className="w-4 h-4" />
        <span className="font-medium text-foreground">{instance.name}</span>
        {onChangeInstance && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onChangeInstance}
          >
            Trocar
          </Button>
        )}
      </div>

      {showDatabase && database && (
        <>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="w-4 h-4" />
            <span className="font-medium text-foreground">{database.name}</span>
            <span className="text-xs">({database.leads_count})</span>
            {onChangeDatabase && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={onChangeDatabase}
              >
                Trocar
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BroadcasterHeader;
