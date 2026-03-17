import type { Conversation } from '@/pages/dashboard/HelpDesk';
import type { Label } from './ConversationLabels';
import { ManageLabelsDialog } from './ManageLabelsDialog';
import { useContactInfo } from '@/hooks/useContactInfo';
import { ContactHeader } from './ContactHeader';
import { ContactLabelsSection } from './ContactLabelsSection';
import { ContactDetailsSection } from './ContactDetailsSection';
import { ContactAiSummary } from './ContactAiSummary';
import { ContactHistory } from './ContactHistory';

interface ContactInfoPanelProps {
  conversation: Conversation;
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void;
  onBack?: () => void;
  inboxLabels?: Label[];
  assignedLabelIds?: string[];
  onLabelsChanged?: () => void;
  agentNamesMap?: Record<string, string>;
}

export const ContactInfoPanel = ({
  conversation,
  onUpdateConversation,
  onBack,
  inboxLabels = [],
  assignedLabelIds = [],
  onLabelsChanged,
}: ContactInfoPanelProps) => {
  const contact = conversation.contact;
  const name = contact?.name || contact?.phone || 'Desconhecido';

  const h = useContactInfo({ conversation, onUpdateConversation });

  return (
    <div className="p-4 space-y-5 overflow-y-auto flex-1">
      <ContactHeader
        name={name}
        phone={contact?.phone}
        profilePicUrl={contact?.profile_pic_url}
        onBack={onBack}
      />

      <ContactLabelsSection
        conversationId={conversation.id}
        inboxLabels={inboxLabels}
        assignedLabelIds={assignedLabelIds}
        onLabelsChanged={onLabelsChanged}
        onRemoveLabel={(labelId) => h.handleRemoveLabel(labelId, onLabelsChanged)}
        onManageLabels={() => h.setManageLabelsOpen(true)}
      />

      <ContactDetailsSection
        conversation={conversation}
        agents={h.agents}
        onUpdateConversation={onUpdateConversation}
        onAssignAgent={h.handleAssignAgent}
      />

      <ContactAiSummary
        aiSummary={h.aiSummary}
        summarizing={h.summarizing}
        onSummarize={h.handleSummarize}
      />

      <ContactHistory
        pastConversations={h.pastConversations}
        historyLoading={h.historyLoading}
        historyExpanded={h.historyExpanded}
        onToggleExpanded={() => h.setHistoryExpanded(v => !v)}
        expandedSummaries={h.expandedSummaries}
        onToggleSummary={h.toggleSummaryExpanded}
        generatingSummaryFor={h.generatingSummaryFor}
        onGenerateSummary={h.handleGenerateHistorySummary}
      />

      {conversation.inbox_id && onLabelsChanged && (
        <ManageLabelsDialog
          open={h.manageLabelsOpen}
          onOpenChange={h.setManageLabelsOpen}
          inboxId={conversation.inbox_id}
          labels={inboxLabels}
          onChanged={onLabelsChanged}
        />
      )}
    </div>
  );
};
