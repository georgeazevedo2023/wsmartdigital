import { ConversationList } from '@/components/helpdesk/ConversationList';
import { ChatPanel } from '@/components/helpdesk/ChatPanel';
import { ContactInfoPanel } from '@/components/helpdesk/ContactInfoPanel';
import { ManageLabelsDialog } from '@/components/helpdesk/ManageLabelsDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useHelpDesk, type Conversation, type Message, type AiSummary } from '@/hooks/useHelpDesk';

export type { Conversation, Message, AiSummary };

const statusTabs = [
  { value: 'aberta', label: 'Abertas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'resolvida', label: 'Resolvidas' },
  { value: 'todas', label: 'Todas' },
];

const HelpDesk = () => {
  const h = useHelpDesk();

  const unifiedHeader = (
    <div className="shrink-0 bg-card/50 backdrop-blur-sm border-b border-border/50">
      <div className="flex items-center gap-2 px-4 h-11">
        <h2 className="font-display font-bold text-base shrink-0">Atendimento</h2>
        <div className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
          {statusTabs.map(tab => (
            <button key={tab.value} onClick={() => h.setStatusFilter(tab.value)}
              className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                h.statusFilter === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              )}>{tab.label}</button>
          ))}
        </div>
        {h.inboxes.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="hidden md:inline text-xs text-muted-foreground">Caixa:</span>
            <Select value={h.selectedInboxId} onValueChange={h.handleInboxChange}>
              <SelectTrigger className="w-36 md:w-48 h-7 text-xs border-border/30 bg-secondary/50"><SelectValue placeholder="Selecionar inbox" /></SelectTrigger>
              <SelectContent>
                {h.inboxes.map(inbox => <SelectItem key={inbox.id} value={inbox.id}>{inbox.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="md:hidden flex items-center gap-0.5 px-3 pb-2 overflow-x-auto no-scrollbar">
        {statusTabs.map(tab => (
          <button key={tab.value} onClick={() => h.setStatusFilter(tab.value)}
            className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0',
              h.statusFilter === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            )}>{tab.label}</button>
        ))}
      </div>
    </div>
  );

  const listProps = {
    conversations: h.filteredConversations,
    selectedId: h.selectedConversation?.id || null,
    searchQuery: h.searchQuery,
    onSearchChange: h.setSearchQuery,
    onSelect: h.handleSelectConversation,
    loading: h.loading,
    inboxLabels: h.inboxLabels,
    conversationLabelsMap: h.conversationLabelsMap,
    labelFilter: h.labelFilter,
    onLabelFilterChange: h.setLabelFilter,
    inboxId: h.selectedInboxId,
    onLabelsChanged: h.handleLabelsChanged,
    agentNamesMap: h.agentNamesMap,
    conversationNotesSet: h.conversationNotesSet,
    assignmentFilter: h.assignmentFilter,
    onAssignmentFilterChange: h.setAssignmentFilter,
    priorityFilter: h.priorityFilter,
    onPriorityFilterChange: h.setPriorityFilter,
  };

  const labelsDialog = h.selectedInboxId && (
    <ManageLabelsDialog
      open={h.manageLabelsOpen} onOpenChange={h.setManageLabelsOpen}
      inboxId={h.selectedInboxId} labels={h.inboxLabels} onChanged={h.handleLabelsChanged}
    />
  );

  const chatProps = {
    conversation: h.selectedConversation,
    onUpdateConversation: h.handleUpdateConversation,
    inboxLabels: h.inboxLabels,
    assignedLabelIds: h.selectedConversation ? h.conversationLabelsMap[h.selectedConversation.id] || [] : [],
    onLabelsChanged: h.handleLabelsChanged,
    agentNamesMap: h.agentNamesMap,
    onAgentAssigned: h.handleAgentAssigned,
  };

  if (h.isMobile) {
    return (
      <div className="flex flex-col h-[calc(100dvh-3.5rem)] -m-4 overflow-hidden">
        {h.mobileView === 'list' && (<>{unifiedHeader}<div className="flex-1 flex flex-col overflow-hidden"><ConversationList {...listProps} /></div></>)}
        {h.mobileView === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatPanel {...chatProps} onBack={() => h.setMobileView('list')} onShowInfo={() => h.setMobileView('info')} />
          </div>
        )}
        {h.mobileView === 'info' && h.selectedConversation && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ContactInfoPanel conversation={h.selectedConversation} onUpdateConversation={h.handleUpdateConversation}
              onBack={() => h.setMobileView('chat')} inboxLabels={h.inboxLabels}
              assignedLabelIds={h.conversationLabelsMap[h.selectedConversation.id] || []}
              onLabelsChanged={h.handleLabelsChanged} agentNamesMap={h.agentNamesMap} />
          </div>
        )}
        {labelsDialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {unifiedHeader}
      {labelsDialog}
      <div className="flex flex-1 overflow-hidden rounded-xl border border-border/50 bg-card/30">
        {h.showConversationList && (
          <div className="w-80 lg:w-96 border-r border-border/50 flex flex-col shrink-0 overflow-hidden">
            <ConversationList {...listProps} />
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ChatPanel {...chatProps}
            onToggleInfo={() => h.setShowContactInfo(prev => !prev)} showingInfo={h.showContactInfo}
            onToggleList={() => h.setShowConversationList(prev => !prev)} showingList={h.showConversationList}
          />
        </div>
        {h.selectedConversation && h.showContactInfo && (
          <div className="w-64 lg:w-72 border-l border-border/50 flex flex-col shrink-0 overflow-hidden">
            <ContactInfoPanel conversation={h.selectedConversation} onUpdateConversation={h.handleUpdateConversation}
              inboxLabels={h.inboxLabels} assignedLabelIds={h.conversationLabelsMap[h.selectedConversation.id] || []}
              onLabelsChanged={h.handleLabelsChanged} agentNamesMap={h.agentNamesMap} />
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpDesk;
