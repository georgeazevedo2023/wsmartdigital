import { Send, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useChatInput } from '@/hooks/useChatInput';
import AudioRecorderBar from './AudioRecorderBar';
import ChatActionsMenu from './ChatActionsMenu';
import type { Conversation } from '@/pages/dashboard/HelpDesk';
import type { Label } from './ConversationLabels';

interface ChatInputProps {
  conversation: Conversation;
  onMessageSent: () => void;
  onAgentAssigned?: (conversationId: string, agentId: string) => void;
  inboxLabels?: Label[];
  assignedLabelIds?: string[];
  onLabelsChanged?: () => void;
  onStatusChange?: (status: string) => void;
}

export const ChatInput = ({ conversation, onMessageSent, onAgentAssigned, inboxLabels = [], assignedLabelIds = [], onLabelsChanged, onStatusChange }: ChatInputProps) => {
  const h = useChatInput({ conversation, onMessageSent, onAgentAssigned, onStatusChange, onLabelsChanged });

  return (
    <div className="p-3 border-t border-border/50 bg-card/50">
      {h.isNote && !h.isRecording && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md px-3 py-1 mb-2 text-xs text-yellow-400">
          📝 Escrevendo nota privada — o cliente não verá esta mensagem
        </div>
      )}

      {h.isRecording ? (
        <AudioRecorderBar
          recordingTime={h.recordingTime}
          sending={h.sending}
          formatTime={h.formatTime}
          onCancel={h.cancelRecording}
          onSend={h.handleSendAudio}
        />
      ) : (
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={h.fileInputRef}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 20 * 1024 * 1024) { toast.error('Arquivo deve ter no máximo 20MB'); return; }
                h.handleSendFile(file);
              }
            }}
          />
          <input
            type="file"
            ref={h.imageInputRef}
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 20 * 1024 * 1024) { toast.error('Arquivo deve ter no máximo 20MB'); return; }
                h.handleSendFile(file);
              }
            }}
          />

          <ChatActionsMenu
            menuOpen={h.menuOpen}
            setMenuOpen={h.setMenuOpen}
            isNote={h.isNote}
            setIsNote={h.setIsNote}
            sending={h.sending}
            sendingFile={h.sendingFile}
            showLabels={h.showLabels}
            setShowLabels={h.setShowLabels}
            showStatus={h.showStatus}
            setShowStatus={h.setShowStatus}
            togglingLabel={h.togglingLabel}
            conversationStatus={conversation.status}
            inboxLabels={inboxLabels}
            assignedLabelIds={assignedLabelIds}
            fileInputRef={h.fileInputRef}
            imageInputRef={h.imageInputRef}
            onToggleLabel={h.handleToggleLabel}
            onStatusChange={h.handleStatusChange}
            onEmojiSelect={(emoji) => h.setText(prev => prev + emoji)}
          />

          <Textarea
            value={h.text}
            onChange={e => h.setText(e.target.value)}
            onKeyDown={h.handleKeyDown}
            placeholder={h.isNote ? 'Escrever nota privada...' : 'Escrever mensagem...'}
            className="min-h-[40px] max-h-32 resize-none text-sm md:text-sm text-base"
            rows={1}
          />
          <Button size="icon" className="shrink-0 h-9 w-9" onClick={h.handleSend} disabled={!h.text.trim() || h.sending}>
            <Send className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={h.startRecording} disabled={h.isNote} title="Gravar áudio">
            <Mic className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
