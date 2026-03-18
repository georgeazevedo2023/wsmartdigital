import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose, Bot, StickyNote } from 'lucide-react';
import type { Conversation } from '@/pages/dashboard/HelpDesk';
import type { Message } from '@/pages/dashboard/HelpDesk';

interface ChatHeaderBarProps {
  conversation: Conversation;
  agentName: string | null;
  iaAtivada: boolean;
  ativandoIa: boolean;
  notes: Message[];
  onActivateIA: () => void;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack?: () => void;
  onShowInfo?: () => void;
  onToggleInfo?: () => void;
  showingInfo?: boolean;
  onToggleList?: () => void;
  showingList?: boolean;
  onOpenNotes: () => void;
}

export const ChatHeaderBar = ({
  conversation, agentName, iaAtivada, ativandoIa, notes,
  onActivateIA, onUpdateConversation,
  onBack, onShowInfo, onToggleInfo, showingInfo, onToggleList, showingList,
  onOpenNotes,
}: ChatHeaderBarProps) => {
  const contact = conversation.contact;

  return (
    <div className="min-h-[3.5rem] px-3 md:px-4 py-2 flex items-center gap-2 border-b border-border/50 bg-card shrink-0 z-10 relative">
      {/* Left: nav buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        {onToggleList && (
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={onToggleList}>
            {showingList ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </Button>
        )}
      </div>

      {/* Contact info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="font-semibold text-sm truncate leading-tight">
          {contact?.name || contact?.phone || 'Desconhecido'}
        </h3>
        {contact?.phone && (
          <span className="text-[11px] text-muted-foreground truncate leading-tight">{contact.phone}</span>
        )}
        {agentName && (
          <span className="text-[10px] text-primary/80 truncate leading-tight font-medium">👤 {agentName}</span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Select value={conversation.status} onValueChange={(status) => onUpdateConversation(conversation.id, { status })}>
          <SelectTrigger className="h-7 w-auto text-xs border-border/50 bg-transparent shadow-none focus:ring-0 gap-1 px-2 [&>svg:last-child]:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="aberta">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Aberta</span>
            </SelectItem>
            <SelectItem value="pendente">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Pendente</span>
            </SelectItem>
            <SelectItem value="resolvida">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-muted-foreground/50" /> Resolvida</span>
            </SelectItem>
          </SelectContent>
        </Select>

        {iaAtivada ? (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1 shrink-0 text-[11px] px-2 py-0.5">
            <Bot className="w-3 h-3" /> IA Ativada
          </Badge>
        ) : (
          <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs gap-1" onClick={onActivateIA} disabled={ativandoIa}>
            <Bot className="w-3 h-3" /> {ativandoIa ? 'Ativando...' : 'Ativar IA'}
          </Button>
        )}

        {notes.length > 0 && (
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 relative" onClick={onOpenNotes} title="Ver notas privadas">
            <StickyNote className="w-4 h-4 text-warning" />
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {notes.length}
            </span>
          </Button>
        )}

        {onShowInfo && (
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={onShowInfo}>
            <User className="w-4 h-4" />
          </Button>
        )}
        {onToggleInfo && (
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={onToggleInfo}>
            {showingInfo ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        )}
      </div>
    </div>
  );
};
