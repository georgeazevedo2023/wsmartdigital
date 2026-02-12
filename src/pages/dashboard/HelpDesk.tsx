import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { ConversationList } from '@/components/helpdesk/ConversationList';
import { ChatPanel } from '@/components/helpdesk/ChatPanel';
import { ContactInfoPanel } from '@/components/helpdesk/ContactInfoPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

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
}

const HelpDesk = () => {
  const { user } = useAuth();
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

  // Fetch user's inboxes
  useEffect(() => {
    const fetchInboxes = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('inboxes')
        .select('id, name, instance_id')
        .order('name');

      if (!error && data && data.length > 0) {
        setInboxes(data);
        setSelectedInboxId(data[0].id);
      }
    };
    fetchInboxes();
  }, [user]);

  const fetchConversations = async () => {
    if (!user || !selectedInboxId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('conversations')
        .select('*, contacts(*), inboxes(id, name, instance_id)')
        .eq('inbox_id', selectedInboxId)
        .order('last_message_at', { ascending: false });

      if (statusFilter !== 'todas') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const convIds = (data || []).map((c: any) => c.id);

      // Fetch last message for each conversation
      let lastMsgMap: Record<string, string> = {};
      if (convIds.length > 0) {
        const { data: allMsgs } = await supabase
          .from('conversation_messages')
          .select('conversation_id, content, media_type, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false });

        if (allMsgs) {
          for (const msg of allMsgs) {
            if (!lastMsgMap[msg.conversation_id]) {
              const preview = msg.content || mediaPreview(msg.media_type);
              if (preview) {
                lastMsgMap[msg.conversation_id] = preview;
              }
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

  // Realtime via broadcast (bypasses RLS issues with postgres_changes)
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
              return prev.map(c =>
                c.id === data.conversation_id
                  ? { ...c, last_message: data.content || mediaPreview(data.media_type) || c.last_message, last_message_at: data.created_at, is_read: false }
                  : c
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

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.contact?.name?.toLowerCase().includes(q) ||
      c.contact?.phone?.includes(q)
    );
  });

  const inboxSelector = inboxes.length > 0 ? (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-card/50 shrink-0">
      <span className="text-sm text-muted-foreground font-medium">Caixa:</span>
      <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
        <SelectTrigger className="w-52 h-8 text-sm">
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
  ) : null;

  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {mobileView === 'list' && (
          <>
            {inboxSelector}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ConversationList
                conversations={filteredConversations}
                selectedId={selectedConversation?.id || null}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelect={handleSelectConversation}
                loading={loading}
                onSync={handleSync}
                syncing={syncing}
              />
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
            />
          </div>
        )}
        {mobileView === 'info' && selectedConversation && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ContactInfoPanel
              conversation={selectedConversation}
              onUpdateConversation={handleUpdateConversation}
              onBack={() => setMobileView('chat')}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {inboxSelector}
      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden rounded-xl border border-border/50 bg-card/30">
        {/* Left: Conversation List */}
        {showConversationList && (
          <div className="w-72 lg:w-80 border-r border-border/50 flex flex-col shrink-0 overflow-hidden">
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversation?.id || null}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelect={handleSelectConversation}
              loading={loading}
              onSync={handleSync}
              syncing={syncing}
            />
          </div>
        )}

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ChatPanel
            conversation={selectedConversation}
            onUpdateConversation={handleUpdateConversation}
            onToggleInfo={() => setShowContactInfo(prev => !prev)}
            showingInfo={showContactInfo}
            onToggleList={() => setShowConversationList(prev => !prev)}
            showingList={showConversationList}
          />
        </div>

        {/* Right: Contact Info */}
        {selectedConversation && showContactInfo && (
          <div className="w-64 lg:w-72 border-l border-border/50 flex flex-col shrink-0 overflow-hidden">
            <ContactInfoPanel
              conversation={selectedConversation}
              onUpdateConversation={handleUpdateConversation}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpDesk;
