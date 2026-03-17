import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, ShieldCheck, Loader2 } from 'lucide-react';
import LeadList from '@/components/broadcast/LeadList';
import type { Lead } from '@/hooks/useLeadsBroadcaster';
import { ChevronRight } from 'lucide-react';

interface LeadContactsCardProps {
  leads: Lead[];
  selectedLeads: Set<string>;
  onSelectionChange: (s: Set<string>) => void;
  isVerifying: boolean;
  verificationProgress: number;
  hasVerifiedLeads: boolean;
  validLeadsCount: number;
  invalidLeadsCount: number;
  onVerifyNumbers: () => void;
  onClearLeads: () => void;
  onRemoveInvalid: () => void;
  onSelectOnlyValid: () => void;
  onContinue: () => void;
}

const LeadContactsCard = ({
  leads, selectedLeads, onSelectionChange,
  isVerifying, verificationProgress,
  hasVerifiedLeads, validLeadsCount, invalidLeadsCount,
  onVerifyNumbers, onClearLeads, onRemoveInvalid, onSelectOnlyValid, onContinue,
}: LeadContactsCardProps) => {
  if (leads.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Contatos Importados
            <Badge variant="secondary">{leads.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onVerifyNumbers}
              disabled={isVerifying || leads.length === 0}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando... {Math.round(verificationProgress)}%
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Verificar Números
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onClearLeads}>
              Limpar
            </Button>
          </div>
        </div>

        {hasVerifiedLeads && (
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
            <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/20">
              {validLeadsCount} válidos
            </Badge>
            <Badge variant="destructive" className="bg-red-500/20 text-red-600 border-red-500/30 hover:bg-red-500/20">
              {invalidLeadsCount} inválidos
            </Badge>
            <div className="flex gap-2 ml-auto">
              {invalidLeadsCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onRemoveInvalid} className="text-xs h-7 text-destructive hover:text-destructive">
                  Remover inválidos
                </Button>
              )}
              {validLeadsCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onSelectOnlyValid} className="text-xs h-7">
                  Selecionar válidos
                </Button>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <LeadList leads={leads} selectedLeads={selectedLeads} onSelectionChange={onSelectionChange} />

        {selectedLeads.size > 0 && (
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={onContinue}>
              Continuar com {selectedLeads.size} contato{selectedLeads.size !== 1 ? 's' : ''}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadContactsCard;
