import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, StopCircle, Users, MessageSquare, Image, Video,
  Mic, FileIcon, LayoutGrid, Shield, ChevronDown, ChevronUp, User,
  Timer, Play, RefreshCw, Trash2, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBR } from '@/lib/dateUtils';
import { HistoryCarouselPreview, HistoryCarouselData } from './HistoryCarouselPreview';
import { formatDuration, getDeliveryRate, getMessageTypeLabel, type BroadcastLog } from '@/hooks/useBroadcastHistory';

// ─── WhatsApp formatting ─────────────────────────────────────────────
const formatWhatsAppText = (text: string): React.ReactNode => {
  const wrapWithStyle = (content: React.ReactNode[], style: 'bold' | 'italic' | 'strike', key: string): React.ReactNode => {
    const className = style === 'bold' ? 'font-bold' : style === 'italic' ? 'italic' : 'line-through';
    return <span key={key} className={className}>{content}</span>;
  };

  const applyFormatting = (content: string, keyPrefix = 'fmt'): React.ReactNode[] => {
    const patterns: { regex: RegExp; style: 'bold' | 'italic' | 'strike' }[] = [
      { regex: /\*([^*]+)\*/, style: 'bold' },
      { regex: /_([^_]+)_/, style: 'italic' },
      { regex: /~([^~]+)~/, style: 'strike' },
    ];

    let firstMatch: RegExpExecArray | null = null;
    let matchedPattern: (typeof patterns)[0] | null = null;

    for (const pattern of patterns) {
      const match = pattern.regex.exec(content);
      if (match && (!firstMatch || match.index < firstMatch.index)) {
        firstMatch = match;
        matchedPattern = pattern;
      }
    }

    if (!firstMatch || !matchedPattern) return content ? [<span key={keyPrefix}>{content}</span>] : [];

    const parts: React.ReactNode[] = [];
    if (firstMatch.index > 0) parts.push(...applyFormatting(content.slice(0, firstMatch.index), `${keyPrefix}-pre`));
    parts.push(wrapWithStyle(applyFormatting(firstMatch[1], `${keyPrefix}-inner`), matchedPattern.style, `${keyPrefix}-wrap`));
    const afterIndex = firstMatch.index + firstMatch[0].length;
    if (afterIndex < content.length) parts.push(...applyFormatting(content.slice(afterIndex), `${keyPrefix}-post`));
    return parts;
  };

  return <>{applyFormatting(text)}</>;
};

// ─── Message Preview ─────────────────────────────────────────────────
const HistoryMessagePreview = ({ type, content, mediaUrl, carouselData }: {
  type: string; content: string | null; mediaUrl: string | null; carouselData?: HistoryCarouselData | null;
}) => {
  const isImage = type === 'image';
  const isVideo = type === 'video';
  const isAudio = type === 'audio' || type === 'ptt';
  const isDocument = type === 'document' || type === 'file';

  if (type === 'carousel' && carouselData) return <HistoryCarouselPreview data={carouselData} />;

  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="flex items-start gap-2 mb-2">
        <Eye className="w-4 h-4 text-muted-foreground mt-0.5" />
        <span className="text-xs text-muted-foreground">Preview da mensagem</span>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-primary/10 rounded-lg rounded-tr-none p-3 border border-border/30">
          {isImage && mediaUrl && (
            <div className="mb-2 rounded-md overflow-hidden">
              <img src={mediaUrl} alt="Preview" className="max-h-32 w-auto object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          )}
          {isVideo && mediaUrl && (
            <div className="mb-2 rounded-md overflow-hidden bg-muted relative">
              <div className="w-full h-24 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                  <Play className="w-5 h-5 text-primary ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
          )}
          {isAudio && (
            <div className="mb-2 flex items-center gap-2 bg-muted/50 rounded-full px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 h-1 bg-muted rounded-full"><div className="w-1/3 h-full bg-primary/50 rounded-full" /></div>
              <span className="text-xs text-muted-foreground">0:00</span>
            </div>
          )}
          {isDocument && (
            <div className="mb-2 flex items-center gap-2 bg-muted/50 rounded-md p-2">
              <FileIcon className="w-8 h-8 text-primary" />
              <span className="text-xs text-muted-foreground truncate">Documento</span>
            </div>
          )}
          {content && <p className="text-sm whitespace-pre-wrap break-words">{formatWhatsAppText(content)}</p>}
          <div className="flex justify-end items-center gap-1 mt-1"><span className="text-[10px] text-muted-foreground">✓✓</span></div>
        </div>
      </div>
    </div>
  );
};

// ─── Status/Type helpers ─────────────────────────────────────────────
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Concluído</Badge>;
    case 'cancelled':
      return <Badge variant="secondary" className="bg-muted text-muted-foreground"><StopCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
    case 'error':
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getMessageTypeIcon = (type: string) => {
  const map: Record<string, React.ReactNode> = {
    image: <Image className="w-4 h-4" />, video: <Video className="w-4 h-4" />,
    audio: <Mic className="w-4 h-4" />, ptt: <Mic className="w-4 h-4" />,
    document: <FileIcon className="w-4 h-4" />, carousel: <LayoutGrid className="w-4 h-4" />,
  };
  return map[type] || <MessageSquare className="w-4 h-4" />;
};

// ─── Component ───────────────────────────────────────────────────────
interface BroadcastHistoryLogItemProps {
  log: BroadcastLog;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onResend?: (log: BroadcastLog) => void;
}

const BroadcastHistoryLogItem = ({
  log, isExpanded, isSelected, onToggleExpand, onToggleSelect, onDelete, onResend,
}: BroadcastHistoryLogItemProps) => {
  const deliveryRate = getDeliveryRate(log.recipients_success, log.recipients_targeted);

  return (
    <div className={cn(
      "border rounded-lg p-2.5 sm:p-3 bg-background/50 hover:bg-background/80 transition-colors",
      isSelected && "ring-2 ring-primary/50 border-primary/50"
    )}>
      {/* Header row */}
      <div className="flex items-start sm:items-center justify-between cursor-pointer gap-2" onClick={onToggleExpand}>
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <input
            type="checkbox" checked={isSelected}
            onChange={(e) => { e.stopPropagation(); onToggleSelect(e as unknown as React.MouseEvent); }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-border shrink-0 mt-1 sm:mt-0"
          />
          <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 shrink-0">{getMessageTypeIcon(log.message_type)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {getStatusBadge(log.status)}
              <Badge variant="outline" className="text-xs">{getMessageTypeLabel(log.message_type)}</Badge>
              {log.groups_targeted === 0 ? (
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                  <User className="w-3 h-3 mr-0.5" /><span className="hidden sm:inline">Leads</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-0.5" /><span>{log.groups_targeted}</span>
                  <span className="hidden sm:inline ml-0.5">grupo{log.groups_targeted !== 1 ? 's' : ''}</span>
                </Badge>
              )}
              {log.random_delay && log.random_delay !== 'none' && (
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  <Shield className="w-3 h-3 mr-1" />
                  {log.random_delay === '120-180' ? '2-3min' : `${log.random_delay}s`}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
              {log.instance_name || log.instance_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs sm:text-sm font-medium">{log.recipients_success}/{log.recipients_targeted}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">{deliveryRate}%</div>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3 sm:space-y-4">
          {log.group_names && log.group_names.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                {log.groups_targeted === 0 ? <><User className="w-3 h-3" /> Leads ({log.group_names.length}):</> : <><Users className="w-3 h-3" /> Grupos ({log.group_names.length}):</>}
              </p>
              <div className="flex flex-wrap gap-1">
                {log.group_names.map((name, idx) => <Badge key={idx} variant="secondary" className="text-xs">{name}</Badge>)}
              </div>
            </div>
          )}

          {(log.content || log.media_url || log.carousel_data) && (
            <HistoryMessagePreview
              type={log.message_type} content={log.content} mediaUrl={log.media_url}
              carouselData={log.carousel_data as unknown as HistoryCarouselData | null}
            />
          )}

          <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Play className="w-3.5 h-3.5 text-green-500" />
              <span className="truncate">Início: {formatBR(log.started_at, "dd/MM/yy 'às' HH:mm")}</span>
            </div>
            {log.completed_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span className="truncate">Fim: {formatBR(log.completed_at, "dd/MM/yy 'às' HH:mm")}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Timer className="w-3.5 h-3.5" /><span>Duração: {formatDuration(log.duration_seconds)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-3.5 h-3.5" /><span>{log.exclude_admins ? 'Excluindo admins' : 'Todos os membros'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-600">{log.recipients_success} sucesso</span>
            </div>
            {log.recipients_failed > 0 && (
              <div className="flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-600">{log.recipients_failed} {log.recipients_failed === 1 ? 'falha' : 'falhas'}</span>
              </div>
            )}
          </div>

          {(log.error_message || log.recipients_failed > 0) && (
            <div className="p-2 bg-destructive/10 rounded text-xs sm:text-sm text-destructive border border-destructive/20">
              <p className="text-xs font-medium mb-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> Observações de erro:</p>
              <p>{log.error_message || `${log.recipients_failed} destinatário${log.recipients_failed === 1 ? '' : 's'} não recebeu a mensagem. Possíveis causas: número inválido, contato bloqueou o remetente ou falha temporária na API.`}</p>
            </div>
          )}

          <div className="flex gap-2">
            {onResend && (
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs sm:text-sm" onClick={(e) => { e.stopPropagation(); onResend(log); }}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reenviar
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastHistoryLogItem;
