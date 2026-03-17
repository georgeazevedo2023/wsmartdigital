import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight } from 'lucide-react';

interface WizardStepsProps {
  step: 'instance' | 'contacts' | 'message';
  hasInstance: boolean;
  leadsCount: number;
}

const WizardSteps = ({ step, hasInstance, leadsCount }: WizardStepsProps) => (
  <div className="flex items-center gap-2 text-sm">
    <div className={`flex items-center gap-2 ${hasInstance ? 'text-primary' : 'text-muted-foreground'}`}>
      {hasInstance ? (
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">1</div>
      )}
      <span className="font-medium">Instância</span>
    </div>

    <ChevronRight className="w-4 h-4 text-muted-foreground" />

    <div className={`flex items-center gap-2 ${step === 'message' ? 'text-primary' : step === 'contacts' ? 'text-foreground' : 'text-muted-foreground'}`}>
      {step === 'message' ? (
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      ) : (
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'contacts' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>2</div>
      )}
      <span className="font-medium">Base + Contatos</span>
      {leadsCount > 0 && <Badge variant="secondary" className="text-xs">{leadsCount}</Badge>}
    </div>

    <ChevronRight className="w-4 h-4 text-muted-foreground" />

    <div className={`flex items-center gap-2 ${step === 'message' ? 'text-foreground' : 'text-muted-foreground'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'message' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>3</div>
      <span className="font-medium">Mensagem</span>
    </div>
  </div>
);

export default WizardSteps;
