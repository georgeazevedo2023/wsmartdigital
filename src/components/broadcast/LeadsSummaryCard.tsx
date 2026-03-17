import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import type { Lead } from '@/hooks/useLeadsBroadcaster';

interface LeadsSummaryCardProps {
  selectedLeads: Lead[];
  onChangeSelection: () => void;
}

const LeadsSummaryCard = ({ selectedLeads, onChangeSelection }: LeadsSummaryCardProps) => (
  <Card className="border-border/50 bg-muted/30">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {selectedLeads.length} contato{selectedLeads.length !== 1 ? 's' : ''} selecionado{selectedLeads.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              Envio individual para cada número
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onChangeSelection}>
          Alterar seleção
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {selectedLeads.slice(0, 5).map((lead) => (
          <Badge key={lead.id} variant="secondary" className="text-xs">
            {lead.name || lead.phone}
          </Badge>
        ))}
        {selectedLeads.length > 5 && (
          <Badge variant="outline" className="text-xs">
            +{selectedLeads.length - 5} mais
          </Badge>
        )}
      </div>
    </CardContent>
  </Card>
);

export default LeadsSummaryCard;
