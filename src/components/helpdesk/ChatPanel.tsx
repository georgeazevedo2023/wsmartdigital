import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatHeaderBar } from './ChatHeaderBar';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { NotesPanel } from './NotesPanel';
import { useChatMessages } from '@/hooks/useChatMessages';
import type { Conversation } from '@/pages/dashboard/HelpDesk';
import type { Label } from './ConversationLabels';

interface ChatPanelProps {
  conversation: Conversation | null;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack?: () => void;
  onShowInfo?: () => void;
  onToggleInfo?: () => void;
  showingInfo?: boolean;
  onToggleList?: () => void;
  showingList?: boolean;
  inboxLabels?: Label[];
  assignedLabelIds?: string[];
  onLabelsChanged?: () => void;
  agentNamesMap?: Record<string, string>;
  onAgentAssigned?: (conversationId: string, agentId: string) => void;
}

export const ChatPanel = ({
  conversation, onUpdateConversation, onBack, onShowInfo, onToggleInfo, showingInfo,
  onToggleList, showingList, inboxLabels, assignedLabelIds, onLabelsChanged,
  agentNamesMap, onAgentAssigned,
}: ChatPanelProps) => {
  const [notesOpen, setNotesOpen] = useState(false);
  const {
    chatMessages, notes, loading, bottomRef, setMessages,
    iaAtivada, setIaAtivada, ativandoIa, handleActivateIA, fetchMessages,
  } = useChatMessages(conversation);

  const agentName = conversation?.assigned_to
    ? (agentNamesMap?.[conversation.assigned_to] || conversation.assigned_to.slice(0, 8))
    : null;

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha uma conversa na lista para começar</p>
      </div>
    );
  }

  return (
    <>
      <ChatHeaderBar
        conversation={conversation}
        agentName={agentName}
        iaAtivada={iaAtivada}
        ativandoIa={ativandoIa}
        notes={notes}
        onActivateIA={handleActivateIA}
        onUpdateConversation={onUpdateConversation}
        onBack={onBack}
        onShowInfo={onShowInfo}
        onToggleInfo={onToggleInfo}
        showingInfo={showingInfo}
        onToggleList={onToggleList}
        showingList={showingList}
        onOpenNotes={() => setNotesOpen(true)}
      />

      <ChatMessageList
        chatMessages={chatMessages}
        loading={loading}
        bottomRef={bottomRef}
        instanceId={conversation.inbox?.instance_id}
        agentNamesMap={agentNamesMap}
      />

      <ChatInput
        conversation={conversation}
        onMessageSent={() => { fetchMessages(); setIaAtivada(false); }}
        onAgentAssigned={onAgentAssigned}
        inboxLabels={inboxLabels}
        assignedLabelIds={assignedLabelIds}
        onLabelsChanged={onLabelsChanged}
        onStatusChange={(status) => onUpdateConversation(conversation.id, { status })}
      />

      <NotesPanel
        open={notesOpen}
        onOpenChange={setNotesOpen}
        notes={notes}
        onNoteDeleted={(noteId) => setMessages(prev => prev.filter(m => m.id !== noteId))}
        agentNamesMap={agentNamesMap}
      />
    </>
  );
};
