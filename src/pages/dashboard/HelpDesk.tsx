import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { ConversationList } from '@/components/helpdesk/ConversationList';
import { ChatPanel } from '@/components/helpdesk/ChatPanel';
import { ContactInfoPanel } from '@/components/helpdesk/ContactInfoPanel';
import { ManageLabelsDialog } from '@/components/helpdesk/ManageLabelsDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Tags } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Label } from '@/components/helpdesk/ConversationLabels';

export interface Conversation {
  id: string;
  inbox_id: string;
  contact_id: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  is_read: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    name: string | null;
    phone: string;
    jid: string;
    profile_pic_url: string | null;
  };
  inbox?: {
    id: string;
    name: string;
    instance_id: string;
    webhook_outgoing_url?: string | null;
  };
  last_message?: string;
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

function mediaPreview(mediaType: string): string {
  switch (mediaType) {
    case 'image': return '📷 Foto';
    case 'video': return '🎥 Vídeo';
    case 'audio': return '🎵 Áudio';
    case 'document': return '📎 Documento';
    default: return '';
  }
}

interface Inbox {
  id: string;
  name: string;
  instance_id: string;
  webhook_outgoing_url?: string | null;
}

const HelpDesk = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const inboxParam = searchParams.get('inbox');
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('aberta');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [syncedInboxes, setSyncedInboxes] = useState<Set<string>>(new Set());

  // Labels state
  const [inboxLabels, setInboxLabels] = useState<Label[]>([]);
  const [conversationLabelsMap, setConversationLabelsMap] = useState<Record<string, string[]>>({});
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [agentNamesMap, setAgentNamesMap] = useState<Record<string, string>>({});

  const { isSuperAdmin } = useAuth();

  // Fetch user's inboxes (filtered by access for non-super-admins)
  useEffect(() => {
    const fetchInboxes = async () => {
      if (!user) return;

      let inboxData: Inbox[] = [];

      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('inboxes')
          .select('id, name, instance_id, webhook_outgoing_url')
          .order('name');
        if (!error && data) inboxData = data;
      } else {
        const { data, error } = await supabase
          .from('inbox_users')
          .select('inboxes(id, name, instance_id, webhook_outgoing_url)')
          .eq('user_id', user.id);
        if (!error && data) {
          inboxData = data
            .map((d: any) => d.inboxes)
            .filter(Boolean) as Inbox[];
        }
      }

      if (inboxData.length > 0) {
        setInboxes(inboxData);
        const targetInbox = inboxParam && inboxData.some(ib => ib.id === inboxParam)
          ? inboxParam
          : inboxData[0].id;
        setSelectedInboxId(targetInbox);
      }
    };
    fetchInboxes();
  }, [user, inboxParam, isSuperAdmin]);

  // Fetch labels for selected inbox
  const fetchLabels = useCallback(async () => {
    if (!selectedInboxId) return;
    const { data } = await supabase
      .from('labels')
      .select('*')
      .eq('inbox_id', selectedInboxId)
      .order('name');
    setInboxLabels((data as Label[]) || []);
  }, [selectedInboxId]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  // Fetch agent names from all user profiles
  const fetchAgentNames = useCallback(async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(p => {
        if (p.full_name) map[p.id] = p.full_name;
      });
      setAgentNamesMap(map);
    }
  }, []);

  useEffect(() => {
    fetchAgentNames();
  }, [fetchAgentNames]);

  // Fetch conversation_labels for loaded conversations
  const fetchConversationLabels = useCallback(async (convIds: string[]) => {
    if (convIds.length === 0) {
      setConversationLabelsMap({});
      return;
    }
    const { data } = await supabase
      .from('conversation_labels')
      .select('conversation_id, label_id')
      .in('conversation_id', convIds);

    const map: Record<string, string[]> = {};
    (data || []).forEach(cl => {
      if (!map[cl.conversation_id]) map[cl.conversation_id] = [];
      map[cl.conversation_id].push(cl.label_id);
    });
    setConversationLabelsMap(map);
  }, []);

  const fetchConversations = async () => {
    if (!user || !selectedInboxId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('conversations')
        .select('*, contacts(*), inboxes(id, name, instance_id, webhook_outgoing_url)')
        .eq('inbox_id', selectedInboxId)
        .order('last_message_at', { ascending: false });

      if (statusFilter !== 'todas') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const convIds = (data || []).map((c: any) => c.id);

      // Fetch last message + conversation labels in parallel
      let lastMsgMap: Record<string, string> = {};
      const [msgsResult] = await Promise.all([
        convIds.length > 0
          ? supabase
              .from('conversation_messages')
              .select('conversation_id, content, media_type, created_at')
              .in('conversation_id', convIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: null }),
        fetchConversationLabels(convIds),
      ]);

      if (msgsResult.data) {
        for (const msg of msgsResult.data) {
          if (!lastMsgMap[msg.conversation_id]) {
            const preview = msg.content || mediaPreview(msg.media_type);
            if (preview) {
              lastMsgMap[msg.conversation_id] = preview;
            }
          }
        }
      }

      const mapped: Conversation[] = (data || []).map((c: any) => ({
        ...c,
        contact: c.contacts,
        inbox: c.inboxes,
        last_message: lastMsgMap[c.id] || null,
      }));

      setConversations(mapped);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInboxId) {
      fetchConversations();
    }
  }, [user, statusFilter, selectedInboxId]);

  // Realtime via broadcast
  useEffect(() => {
    if (!selectedInboxId) return;

    const channel = supabase
      .channel('helpdesk-conversations')
      .on('broadcast', { event: 'new-message' }, (payload) => {
        console.log('[HelpDesk] broadcast received:', payload.payload);
        const data = payload.payload;
        if (data?.inbox_id === selectedInboxId) {
          setConversations(prev => {
            const exists = prev.some(c => c.id === data.conversation_id);
            if (exists) {
              const updated = prev.map(c =>
                c.id === data.conversation_id
                  ? { ...c, last_message: data.content || mediaPreview(data.media_type) || c.last_message, last_message_at: data.created_at, is_read: false }
                  : c
              );
              return updated.sort((a, b) =>
                new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
              );
            }
            fetchConversations();
            return prev;
          });
        }
      })
      .subscribe((status) => {
        console.log('[HelpDesk] channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedInboxId]);

  const handleSync = async () => {
    if (!selectedInboxId || syncing) return;
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-conversations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ inbox_id: selectedInboxId }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      toast({
        title: 'Sincronização concluída',
        description: `${result.synced} conversas sincronizadas${result.errors > 0 ? `, ${result.errors} erros` : ''}`,
      });

      fetchConversations();
    } catch (err: any) {
      console.error('Sync error:', err);
      toast({
        title: 'Erro na sincronização',
        description: err.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (isMobile) setMobileView('chat');

    if (!conversation.is_read) {
      await supabase
        .from('conversations')
        .update({ is_read: true })
        .eq('id', conversation.id);

      setConversations(prev =>
        prev.map(c => c.id === conversation.id ? { ...c, is_read: true } : c)
      );
    }
  };

  const handleUpdateConversation = async (id: string, updates: Partial<Conversation>) => {
    await supabase.from('conversations').update(updates).eq('id', id);
    fetchConversations();
    if (selectedConversation?.id === id) {
      setSelectedConversation(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleLabelsChanged = () => {
    fetchLabels();
    const convIds = conversations.map(c => c.id);
    fetchConversationLabels(convIds);
  };

  const filteredConversations = conversations.filter(c => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = c.contact?.name?.toLowerCase().includes(q) || c.contact?.phone?.includes(q);
      if (!matchesSearch) return false;
    }
    // Label filter
    if (labelFilter) {
      const convLabels = conversationLabelsMap[c.id] || [];
      if (!convLabels.includes(labelFilter)) return false;
    }
    return true;
  });

  const unreadCount = conversations.filter(c => !c.is_read).length;
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);

  const unifiedHeader = (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-2">
        <h2 className="font-display font-bold text-base">Atendimento</h2>
        {selectedInboxId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setManageLabelsOpen(true)}
            className="h-7 w-7"
            title="Gerenciar etiquetas"
          >
            <Tags className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSync}
          disabled={syncing}
          className="h-7 w-7"
          title="Sincronizar conversas"
        >
          <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
        </Button>
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>
      {inboxes.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Caixa:</span>
          <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
            <SelectTrigger className="w-32 md:w-48 h-7 text-xs border-border/30 bg-secondary/50">
              <SelectValue placeholder="Selecionar inbox" />
            </SelectTrigger>
            <SelectContent>
              {inboxes.map(inbox => (
                <SelectItem key={inbox.id} value={inbox.id}>
                  {inbox.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const listProps = {
    conversations: filteredConversations,
    selectedId: selectedConversation?.id || null,
    statusFilter,
    onStatusFilterChange: setStatusFilter,
    searchQuery,
    onSearchChange: setSearchQuery,
    onSelect: handleSelectConversation,
    loading,
    onSync: handleSync,
    syncing,
    inboxLabels,
    conversationLabelsMap,
    labelFilter,
    onLabelFilterChange: setLabelFilter,
    inboxId: selectedInboxId,
    onLabelsChanged: handleLabelsChanged,
    agentNamesMap,
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {mobileView === 'list' && (
          <>
            {unifiedHeader}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ConversationList {...listProps} />
            </div>
          </>
        )}
        {mobileView === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatPanel
              conversation={selectedConversation}
              onUpdateConversation={handleUpdateConversation}
              onBack={() => setMobileView('list')}
              onShowInfo={() => setMobileView('info')}
              inboxLabels={inboxLabels}
              assignedLabelIds={selectedConversation ? conversationLabelsMap[selectedConversation.id] || [] : []}
              onLabelsChanged={handleLabelsChanged}
              agentNamesMap={agentNamesMap}
            />
          </div>
        )}
        {mobileView === 'info' && selectedConversation && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ContactInfoPanel
              conversation={selectedConversation}
              onUpdateConversation={handleUpdateConversation}
              onBack={() => setMobileView('chat')}
              inboxLabels={inboxLabels}
              assignedLabelIds={conversationLabelsMap[selectedConversation.id] || []}
              onLabelsChanged={handleLabelsChanged}
            />
          </div>
        )}
        {selectedInboxId && (
          <ManageLabelsDialog
            open={manageLabelsOpen}
            onOpenChange={setManageLabelsOpen}
            inboxId={selectedInboxId}
            labels={inboxLabels}
            onChanged={handleLabelsChanged}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {unifiedHeader}
      {selectedInboxId && (
        <ManageLabelsDialog
          open={manageLabelsOpen}
          onOpenChange={setManageLabelsOpen}
          inboxId={selectedInboxId}
          labels={inboxLabels}
          onChanged={handleLabelsChanged}
        />
      )}
      <div className="flex flex-1 overflow-hidden rounded-xl border border-border/50 bg-card/30">
        {showConversationList && (
          <div className="w-80 lg:w-96 border-r border-border/50 flex flex-col shrink-0 overflow-hidden">
            <ConversationList {...listProps} />
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ChatPanel
            conversation={selectedConversation}
            onUpdateConversation={handleUpdateConversation}
            onToggleInfo={() => setShowContactInfo(prev => !prev)}
            showingInfo={showContactInfo}
            onToggleList={() => setShowConversationList(prev => !prev)}
            showingList={showConversationList}
            inboxLabels={inboxLabels}
            assignedLabelIds={selectedConversation ? conversationLabelsMap[selectedConversation.id] || [] : []}
            onLabelsChanged={handleLabelsChanged}
            agentNamesMap={agentNamesMap}
          />
        </div>

        {selectedConversation && showContactInfo && (
          <div className="w-64 lg:w-72 border-l border-border/50 flex flex-col shrink-0 overflow-hidden">
            <ContactInfoPanel
              conversation={selectedConversation}
              onUpdateConversation={handleUpdateConversation}
              inboxLabels={inboxLabels}
              assignedLabelIds={conversationLabelsMap[selectedConversation.id] || []}
              onLabelsChanged={handleLabelsChanged}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpDesk;
