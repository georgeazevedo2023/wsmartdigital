import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { EmojiPickerContent } from '@/components/ui/emoji-picker';
import { StickyNote, ImageIcon, Paperclip, Smile, Tags, CircleDot, Check, Plus, Loader2 } from 'lucide-react';
import { STATUS_OPTIONS } from '@/hooks/useChatInput';
import type { Label } from './ConversationLabels';

interface ChatActionsMenuProps {
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  isNote: boolean;
  setIsNote: (v: boolean) => void;
  sending: boolean;
  sendingFile: boolean;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  showStatus: boolean;
  setShowStatus: (v: boolean) => void;
  togglingLabel: string | null;
  conversationStatus: string;
  inboxLabels: Label[];
  assignedLabelIds: string[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  imageInputRef: React.RefObject<HTMLInputElement>;
  onToggleLabel: (labelId: string, isAssigned: boolean) => void;
  onStatusChange: (status: string) => void;
  onEmojiSelect: (emoji: string) => void;
}

const ChatActionsMenu = ({
  menuOpen, setMenuOpen, isNote, setIsNote, sending, sendingFile,
  showLabels, setShowLabels, showStatus, setShowStatus,
  togglingLabel, conversationStatus,
  inboxLabels, assignedLabelIds,
  fileInputRef, imageInputRef,
  onToggleLabel, onStatusChange, onEmojiSelect,
}: ChatActionsMenuProps) => {
  if (sendingFile) {
    return (
      <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
          <Plus className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-48 p-1.5">
        <div className="flex flex-col gap-0.5">
          {/* Note toggle */}
          <button
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors ${
              isNote ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-accent text-foreground'
            }`}
            onClick={() => { setIsNote(!isNote); setMenuOpen(false); }}
          >
            <StickyNote className="w-4 h-4" />
            {isNote ? 'Desativar nota' : 'Nota privada'}
          </button>

          {/* Image */}
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => { imageInputRef.current?.click(); setMenuOpen(false); }}
            disabled={isNote}
          >
            <ImageIcon className="w-4 h-4" /> Enviar imagem
          </button>

          {/* Document */}
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => { fileInputRef.current?.click(); setMenuOpen(false); }}
            disabled={isNote}
          >
            <Paperclip className="w-4 h-4" /> Enviar documento
          </button>

          {/* Labels */}
          {inboxLabels.length > 0 && (
            <>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground"
                onClick={() => setShowLabels(!showLabels)}
              >
                <Tags className="w-4 h-4" /> Etiquetas
              </button>
              {showLabels && (
                <div className="border-t border-border/50 pt-1 mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                  {inboxLabels.map(label => {
                    const isAssigned = assignedLabelIds.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md hover:bg-secondary/50 text-sm disabled:opacity-50"
                        onClick={() => onToggleLabel(label.id, isAssigned)}
                        disabled={togglingLabel === label.id}
                      >
                        <Checkbox checked={isAssigned} className="pointer-events-none" />
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                        <span className="truncate">{label.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Status */}
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground"
            onClick={() => setShowStatus(!showStatus)}
          >
            <CircleDot className="w-4 h-4" /> Status
          </button>
          {showStatus && (
            <div className="border-t border-border/50 pt-1 mt-1 space-y-0.5">
              {STATUS_OPTIONS.map(opt => {
                const isActive = conversationStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors ${isActive ? 'bg-accent font-medium' : 'hover:bg-secondary/50'}`}
                    onClick={() => onStatusChange(opt.value)}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dotClass}`} />
                    <span className="flex-1 text-left">{opt.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Emoji */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent text-foreground"
                disabled={sending}
              >
                <Smile className="w-4 h-4" /> Enviar Emojis
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-[320px] p-0 z-[100]">
              <EmojiPickerContent onEmojiSelect={onEmojiSelect} />
            </PopoverContent>
          </Popover>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ChatActionsMenu;
