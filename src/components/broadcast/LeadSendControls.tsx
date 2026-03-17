import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Shield, Timer, Loader2, Pause, Play, StopCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatTime, type RandomDelay, type LeadSendProgress } from '@/hooks/useLeadMessageForm';

const DELAY_OPTIONS: readonly [RandomDelay, string][] = [
  ['none', 'Desativado'], ['5-10', '5-10 seg'], ['10-20', '10-20 seg'],
  ['30-40', '30-40 seg'], ['40-60', '40-60 seg'], ['120-180', '2-3 min'],
];

interface LeadSendControlsProps {
  randomDelay: RandomDelay;
  onRandomDelayChange: (v: RandomDelay) => void;
  estimatedTime: string;
  canSend: boolean;
  isSending: boolean;
  isComplete: boolean;
  progress: LeadSendProgress;
  elapsedTime: number;
  successCount: number;
  failCount: number;
  leadsCount: number;
  onSend: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onReset: () => void;
  onComplete?: () => void;
}

const LeadSendControls = ({
  randomDelay, onRandomDelayChange, estimatedTime,
  canSend, isSending, isComplete, progress, elapsedTime,
  successCount, failCount, leadsCount,
  onSend, onPause, onResume, onCancel, onReset, onComplete,
}: LeadSendControlsProps) => {
  return (
    <div className="space-y-4">
      {/* Anti-Blocking Delay */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <Label>Delay anti-bloqueio</Label>
          </div>
          <Select value={randomDelay} onValueChange={(v) => onRandomDelayChange(v as RandomDelay)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DELAY_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {randomDelay !== 'none' && estimatedTime && (
          <Badge variant="secondary" className="gap-1.5">
            <Timer className="w-3 h-3" />
            Tempo estimado: {estimatedTime}
          </Badge>
        )}
      </div>

      {/* Send Button */}
      {!isSending && !isComplete && (
        <Button onClick={onSend} disabled={!canSend} className="w-full" size="lg">
          <Send className="w-4 h-4 mr-2" />
          Enviar para {leadsCount} contato{leadsCount !== 1 ? 's' : ''}
        </Button>
      )}

      {/* Progress Display */}
      {(isSending || isComplete) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {progress.status === 'sending' && <Loader2 className="w-4 h-4 animate-spin" />}
              {progress.status === 'paused' && <Pause className="w-4 h-4" />}
              {progress.status === 'success' && <CheckCircle2 className="w-4 h-4 text-success" />}
              {progress.status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
              {progress.status === 'cancelled' && <StopCircle className="w-4 h-4 text-muted-foreground" />}
              {isSending && `Enviando: ${progress.currentName}`}
              {progress.status === 'success' && 'Envio concluído!'}
              {progress.status === 'error' && 'Envio concluído com erros'}
              {progress.status === 'cancelled' && 'Envio cancelado'}
            </span>
            <span className="text-muted-foreground">{progress.current}/{progress.total}</span>
          </div>

          <Progress value={(progress.current / progress.total) * 100} />

          {isSending && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(elapsedTime)}
              </span>
              <div className="flex gap-2">
                {progress.status === 'paused' ? (
                  <Button variant="outline" size="sm" onClick={onResume}>
                    <Play className="w-3 h-3 mr-1" /> Continuar
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={onPause}>
                    <Pause className="w-3 h-3 mr-1" /> Pausar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onCancel}>
                  <StopCircle className="w-3 h-3 mr-1" /> Cancelar
                </Button>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <span className="text-success flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {successCount} sucesso
                </span>
                {failCount > 0 && (
                  <span className="text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> {failCount} falha{failCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onReset}>Novo Envio</Button>
                {onComplete && <Button size="sm" onClick={onComplete}>Concluir</Button>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadSendControls;
