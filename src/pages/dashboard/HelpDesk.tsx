import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
}

interface Inbox {
  id: string;
  name: string;
  instance_id: string;
}

const HelpDesk = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('aberta');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

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

      const mapped: Conversation[] = (data || []).map((c: any) => ({
        ...c,
        contact: c.contacts,
        inbox: c.inboxes,
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('helpdesk-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, () => {
        fetchConversations();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_messages',
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedInboxId]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Inbox selector bar */}
      {inboxes.length > 0 && (
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
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden rounded-xl border border-border/50 bg-card/30">
        {/* Left: Conversation List */}
        <div className="w-80 border-r border-border/50 flex flex-col shrink-0">
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

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatPanel
            conversation={selectedConversation}
            onUpdateConversation={handleUpdateConversation}
          />
        </div>

        {/* Right: Contact Info */}
        {selectedConversation && (
          <div className="w-72 border-l border-border/50 flex flex-col shrink-0">
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
