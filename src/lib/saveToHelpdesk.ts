import { supabase } from '@/integrations/supabase/client';

interface HelpdeskMessageData {
  content: string | null;
  media_type: string; // 'text' | 'image' | 'video' | 'audio' | 'document' | 'carousel'
  media_url?: string | null;
}

/**
 * After a successful broadcast send, save the outgoing message to the HelpDesk
 * so it appears in the conversation history.
 */
export const saveToHelpdesk = async (
  instanceId: string,
  contactJid: string,
  contactPhone: string,
  contactName: string | null,
  messageData: HelpdeskMessageData
): Promise<void> => {
  try {
    // 1. Find inbox linked to this instance
    const { data: inbox } = await supabase
      .from('inboxes')
      .select('id')
      .eq('instance_id', instanceId)
      .maybeSingle();

    if (!inbox) {
      // No inbox configured for this instance – skip silently
      return;
    }

    // 2. Find or create contact by JID
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('jid', contactJid)
      .maybeSingle();

    let contactId: string;

    if (existingContact) {
      contactId = existingContact.id;
      // Update name if we have a better one
      if (contactName) {
        await supabase
          .from('contacts')
          .update({ name: contactName })
          .eq('id', contactId);
      }
    } else {
      const { data: newContact, error: insertErr } = await supabase
        .from('contacts')
        .insert({
          jid: contactJid,
          phone: contactPhone,
          name: contactName,
        })
        .select('id')
        .single();

      if (insertErr || !newContact) {
        console.error('[saveToHelpdesk] Error creating contact:', insertErr);
        return;
      }
      contactId = newContact.id;
    }

    // 3. Find open/pending conversation or create new one
    const now = new Date().toISOString();

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('inbox_id', inbox.id)
      .eq('contact_id', contactId)
      .in('status', ['aberta', 'pendente'])
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
      // Update last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: now, updated_at: now })
        .eq('id', conversationId);
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          inbox_id: inbox.id,
          contact_id: contactId,
          status: 'aberta',
          last_message_at: now,
        })
        .select('id')
        .single();

      if (convErr || !newConv) {
        console.error('[saveToHelpdesk] Error creating conversation:', convErr);
        return;
      }
      conversationId = newConv.id;
    }

    // 4. Insert message into conversation_messages
    const { error: msgErr } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        direction: 'outgoing',
        content: messageData.content,
        media_type: messageData.media_type,
        media_url: messageData.media_url || null,
      });

    if (msgErr) {
      console.error('[saveToHelpdesk] Error inserting message:', msgErr);
      return;
    }

    // 5. Broadcast realtime update for HelpDesk
    const channel = supabase.channel('helpdesk-conversations');
    await channel.send({
      type: 'broadcast',
      event: 'conversation_updated',
      payload: { conversation_id: conversationId, inbox_id: inbox.id },
    });
    supabase.removeChannel(channel);
  } catch (err) {
    console.error('[saveToHelpdesk] Unexpected error:', err);
  }
};
