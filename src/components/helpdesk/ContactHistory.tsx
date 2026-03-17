import { cn } from '@/lib/utils';
import { History, ChevronDown, ChevronUp, Target, AlertCircle, CheckCircle2, MessageSquare, Sparkles, Wand2 } from 'lucide-react';
import { formatBR } from '@/lib/dateUtils';
import type { PastConversation } from '@/hooks/useContactInfo';

const statusBadgeClass: Record<string, string> = {
  aberta: 'bg-primary/15 text-primary border-primary/30',
  pendente: 'bg-warning/15 text-warning border-warning/30',
  resolvida: 'bg-success/15 text-success border-success/30',
};

const statusLabel: Record<string, string> = {
  aberta: 'Aberta',
  pendente: 'Pendente',
  resolvida: 'Resolvida',
};

interface ContactHistoryProps {
  pastConversations: PastConversation[];
  historyLoading: boolean;
  historyExpanded: boolean;
  onToggleExpanded: () => void;
  expandedSummaries: Set<string>;
  onToggleSummary: (id: string) => void;
  generatingSummaryFor: string | null;
  onGenerateSummary: (id: string) => void;
}

export const ContactHistory = ({
  pastConversations,
  historyLoading,
  historyExpanded,
  onToggleExpanded,
  expandedSummaries,
  onToggleSummary,
  generatingSummaryFor,
  onGenerateSummary,
}: ContactHistoryProps) => (
  <div className="space-y-2">
    <button
      onClick={onToggleExpanded}
      className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
    >
      <span className="flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" />
        Histórico do contato
        {!historyLoading && (
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {pastConversations.length}
          </span>
        )}
      </span>
      {historyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
    </button>

    {historyExpanded && (
      <div className="space-y-0">
        {historyLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3 pl-1">
            <div className="w-3 h-3 rounded-full border border-muted-foreground/30 border-t-primary animate-spin" />
            Carregando histórico...
          </div>
        )}

        {!historyLoading && pastConversations.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2 pl-1">
            Nenhuma conversa anterior com este contato.
          </p>
        )}

        {!historyLoading && pastConversations.length > 0 && (
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
            <div className="space-y-0">
              {pastConversations.map((past) => {
                const dateStr = past.last_message_at || past.created_at;
                const isExpanded = expandedSummaries.has(past.id);
                const hasSummary = !!past.ai_summary;

                return (
                  <div key={past.id} className="relative pl-5 pb-4 last:pb-0">
                    <div className={cn(
                      'absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-background flex items-center justify-center',
                      past.status === 'resolvida' ? 'border-success' : past.status === 'pendente' ? 'border-warning' : 'border-primary'
                    )}>
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        past.status === 'resolvida' ? 'bg-success' : past.status === 'pendente' ? 'bg-warning' : 'bg-primary'
                      )} />
                    </div>

                    <div className="rounded-md border border-border/40 bg-muted/20 overflow-hidden">
                      <div className="flex items-center justify-between px-2.5 py-1.5 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-medium text-foreground shrink-0">
                            {formatBR(dateStr, 'dd/MM/yyyy')}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatBR(dateStr, 'HH:mm')}
                          </span>
                        </div>
                        <span className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0',
                          statusBadgeClass[past.status] || 'bg-muted text-muted-foreground border-border'
                        )}>
                          {statusLabel[past.status] || past.status}
                        </span>
                      </div>

                      {!hasSummary && (
                        <div className="px-2.5 pb-2 space-y-1.5">
                          {past.last_message && (
                            <div className="flex items-start gap-1">
                              <MessageSquare className="w-2.5 h-2.5 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                {past.last_message}
                              </p>
                            </div>
                          )}
                          <button
                            onClick={() => onGenerateSummary(past.id)}
                            disabled={generatingSummaryFor === past.id}
                            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {generatingSummaryFor === past.id ? (
                              <><Sparkles className="w-3 h-3 animate-pulse" /> Gerando resumo...</>
                            ) : (
                              <><Wand2 className="w-3 h-3" /> Gerar resumo com IA</>
                            )}
                          </button>
                        </div>
                      )}

                      {hasSummary && (
                        <div className="border-t border-border/30">
                          <div className="px-2.5 py-1.5">
                            <div className="flex items-start gap-1">
                              <Target className="w-2.5 h-2.5 text-primary mt-0.5 shrink-0" />
                              <p className="text-[11px] text-foreground leading-relaxed">
                                {past.ai_summary!.reason}
                              </p>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-2.5 pb-2 space-y-1.5 border-t border-border/20 pt-1.5">
                              {past.ai_summary!.summary && (
                                <div className="flex items-start gap-1">
                                  <AlertCircle className="w-2.5 h-2.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {past.ai_summary!.summary}
                                  </p>
                                </div>
                              )}
                              {past.ai_summary!.resolution && (
                                <div className="flex items-start gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-success mt-0.5 shrink-0" />
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {past.ai_summary!.resolution}
                                  </p>
                                </div>
                              )}
                              {past.ai_summary!.message_count && (
                                <p className="text-[10px] text-muted-foreground/60">
                                  {past.ai_summary!.message_count} mensagens
                                </p>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => onToggleSummary(past.id)}
                            className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors border-t border-border/20"
                          >
                            {isExpanded ? (
                              <>Ver menos <ChevronUp className="w-3 h-3" /></>
                            ) : (
                              <>Ver resumo completo <ChevronDown className="w-3 h-3" /></>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);
