import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Label } from '@/components/helpdesk/ConversationLabels';

export function useHelpdeskLabels(selectedInboxId: string) {
  const [inboxLabels, setInboxLabels] = useState<Label[]>([]);
  const [conversationLabelsMap, setConversationLabelsMap] = useState<Record<string, string[]>>({});
  const [agentNamesMap, setAgentNamesMap] = useState<Record<string, string>>({});
  const [conversationNotesSet, setConversationNotesSet] = useState<Set<string>>(new Set());

  const fetchLabels = useCallback(async () => {
    if (!selectedInboxId) return;
    const { data } = await supabase.from('labels').select('*').eq('inbox_id', selectedInboxId).order('name');
    setInboxLabels((data as Label[]) || []);
  }, [selectedInboxId]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  const fetchAgentNames = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('id, full_name');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(p => { if (p.full_name) map[p.id] = p.full_name; });
      setAgentNamesMap(map);
    }
  }, []);

  useEffect(() => { fetchAgentNames(); }, [fetchAgentNames]);

  const fetchConversationLabels = useCallback(async (convIds: string[]) => {
    if (convIds.length === 0) { setConversationLabelsMap({}); return; }
    const { data } = await supabase.from('conversation_labels').select('conversation_id, label_id').in('conversation_id', convIds);
    const map: Record<string, string[]> = {};
    (data || []).forEach(cl => {
      if (!map[cl.conversation_id]) map[cl.conversation_id] = [];
      map[cl.conversation_id].push(cl.label_id);
    });
    setConversationLabelsMap(map);
  }, []);

  const fetchConversationNotes = useCallback(async (convIds: string[]) => {
    if (convIds.length === 0) { setConversationNotesSet(new Set()); return; }
    const { data } = await supabase.from('conversation_messages').select('conversation_id').in('conversation_id', convIds).eq('direction', 'private_note');
    setConversationNotesSet(new Set((data || []).map((m: any) => m.conversation_id)));
  }, []);

  const handleLabelsChanged = useCallback((convIds: string[]) => {
    fetchLabels();
    fetchConversationLabels(convIds);
  }, [fetchLabels, fetchConversationLabels]);

  return {
    inboxLabels, conversationLabelsMap, agentNamesMap, conversationNotesSet,
    fetchConversationLabels, fetchConversationNotes, handleLabelsChanged,
  };
}
