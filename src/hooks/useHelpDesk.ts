import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHelpdeskInboxes } from './helpdesk/useHelpdeskInboxes';
import { useHelpdeskLabels } from './helpdesk/useHelpdeskLabels';
import { useHelpdeskConversations } from './helpdesk/useHelpdeskConversations';

// Re-export types for backward compatibility
export type { Conversation } from './helpdesk/useHelpdeskConversations';

export interface AiSummary {
  reason: string;
  summary: string;
  resolution: string;
  generated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: string;
  content: string | null;
  media_type: string;
  media_url: string | null;
  sender_id: string | null;
  external_id: string | null;
  created_at: string;
  transcription?: string | null;
}

export function useHelpDesk() {
  const { user, isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const inboxParam = searchParams.get('inbox');
  const isMobile = useIsMobile();

  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);

  const { inboxes, selectedInboxId, syncing, handleSync, handleInboxChange } =
    useHelpdeskInboxes(user, isSuperAdmin, inboxParam, isMobile);

  const { inboxLabels, conversationLabelsMap, agentNamesMap, conversationNotesSet, fetchConversationLabels, fetchConversationNotes, handleLabelsChanged } =
    useHelpdeskLabels(selectedInboxId);

  const {
    conversations, selectedConversation, setSelectedConversation,
    statusFilter, setStatusFilter, searchQuery, setSearchQuery, loading,
    assignmentFilter, setAssignmentFilter, priorityFilter, setPriorityFilter,
    labelFilter, setLabelFilter, filteredConversations,
    fetchConversations, handleSelectConversation, handleUpdateConversation, handleAgentAssigned,
  } = useHelpdeskConversations({
    user, selectedInboxId, isMobile, setMobileView,
    fetchConversationLabels, fetchConversationNotes, conversationLabelsMap,
  });

  return {
    user, isMobile, mobileView, setMobileView,
    showContactInfo, setShowContactInfo, showConversationList, setShowConversationList,
    selectedConversation, setSelectedConversation, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, loading, inboxes, selectedInboxId,
    syncing, inboxLabels, conversationLabelsMap, labelFilter, setLabelFilter,
    agentNamesMap, conversationNotesSet, assignmentFilter, setAssignmentFilter,
    priorityFilter, setPriorityFilter, manageLabelsOpen, setManageLabelsOpen,
    filteredConversations,
    handleSync: () => handleSync(fetchConversations),
    handleSelectConversation, handleUpdateConversation,
    handleLabelsChanged: () => handleLabelsChanged(conversations.map(c => c.id)),
    handleAgentAssigned,
    handleInboxChange: (id: string) => handleInboxChange(id, () => {
      setSelectedConversation(null);
      setLabelFilter(null);
      if (isMobile) setMobileView('list');
    }),
  };
}
