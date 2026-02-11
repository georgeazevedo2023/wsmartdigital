import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationList } from '@/components/helpdesk/ConversationList';
import { ChatPanel } from '@/components/helpdesk/ChatPanel';
import { ContactInfoPanel } from '@/components/helpdesk/ContactInfoPanel';

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

const HelpDesk = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('aberta');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('conversations')
        .select('*, contacts(*), inboxes(id, name, instance_id)')
        .order('last_message_at', { ascending: false });

      if (statusFilter !== 'todas') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map the joined data
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
    fetchConversations();
  }, [user, statusFilter]);

  // Realtime subscription for new conversations and updates
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
  }, [user]);

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);

    // Mark as read
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-border/50 bg-card/30">
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
  );
};

export default HelpDesk;
