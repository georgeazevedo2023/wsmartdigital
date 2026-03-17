import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, RefreshCw, Clock, Target, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AiSummary } from '@/pages/dashboard/HelpDesk';

interface ContactAiSummaryProps {
  aiSummary: AiSummary | null;
  summarizing: boolean;
  onSummarize: (forceRefresh: boolean) => void;
}

export const ContactAiSummary = ({ aiSummary, summarizing, onSummarize }: ContactAiSummaryProps) => (
  <div className="space-y-2 border border-border/50 rounded-lg p-3 bg-muted/30">
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium flex items-center gap-1.5 text-foreground">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        Resumo da Conversa
      </label>
      {aiSummary && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => onSummarize(true)}
          disabled={summarizing}
          title="Atualizar resumo"
        >
          <RefreshCw className={cn('w-3 h-3', summarizing && 'animate-spin')} />
        </Button>
      )}
    </div>

    {summarizing && (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Sparkles className="w-3.5 h-3.5 animate-pulse text-primary" />
        <span>Analisando conversa com IA...</span>
      </div>
    )}

    {!summarizing && !aiSummary && (
      <p className="text-xs text-muted-foreground italic py-1">
        Resumo gerado automaticamente ao resolver a conversa ou após 1h de inatividade.
      </p>
    )}

    {!summarizing && aiSummary && (
      <div className="space-y-2.5 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-muted-foreground font-medium">
            <Target className="w-3 h-3" />
            Motivo do contato
          </div>
          <p className="text-foreground leading-relaxed">{aiSummary.reason}</p>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-muted-foreground font-medium">
            <AlertCircle className="w-3 h-3" />
            Resumo
          </div>
          <p className="text-foreground leading-relaxed">{aiSummary.summary}</p>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-muted-foreground font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Resolução
          </div>
          <p className="text-foreground leading-relaxed">{aiSummary.resolution}</p>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            <span>
              Gerado {new Date(aiSummary.generated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <span className="text-muted-foreground">{aiSummary.message_count} msgs</span>
        </div>
      </div>
    )}
  </div>
);
