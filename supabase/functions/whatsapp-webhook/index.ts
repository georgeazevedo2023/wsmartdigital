import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeMediaType(raw: string): string {
  if (!raw || raw === '') return 'text'
  const lower = raw.toLowerCase()
  if (lower.includes('image')) return 'image'
  if (lower.includes('video')) return 'video'
  if (lower.includes('audio') || lower.includes('ptt')) return 'audio'
  if (lower.includes('document') || lower.includes('pdf')) return 'document'
  if (lower.includes('sticker')) return 'image'
  return 'text'
}

function extractPhone(jid: string): string {
  return jid.split('@')[0].replace(/\D/g, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const rawPayload = await req.json()
    console.log('Webhook raw received:', JSON.stringify(rawPayload).substring(0, 500))

    // Unwrap if n8n wraps the UAZAPI payload inside a "Body" key
    const payload = rawPayload.Body?.EventType ? rawPayload.Body : rawPayload
    console.log('Webhook unwrapped EventType:', payload.EventType || payload.eventType || 'none')

    // UAZAPI sends EventType field
    const eventType = payload.EventType || payload.eventType || payload.event || ''

    // Only process message events
    if (eventType !== 'messages') {
      console.log('Ignoring event type:', eventType)
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'not_message_event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const message = payload.message
    const chat = payload.chat

    if (!message) {
      console.error('No message object in payload')
      return new Response(JSON.stringify({ error: 'No message data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Skip group messages
    if (message.isGroup === true) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'group' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract instance name
    const instanceName = payload.instanceName || payload.instance || ''
    if (!instanceName) {
      console.error('No instance identifier in payload')
      return new Response(JSON.stringify({ error: 'No instance identifier' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find instance by name or id
    const { data: instance } = await supabase
      .from('instances')
      .select('id, name')
      .or(`id.eq.${instanceName},name.eq.${instanceName}`)
      .maybeSingle()

    if (!instance) {
      console.error('Instance not found:', instanceName)
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find inbox for this instance
    const { data: inbox } = await supabase
      .from('inboxes')
      .select('id')
      .eq('instance_id', instance.id)
      .maybeSingle()

    if (!inbox) {
      console.log('No inbox configured for instance:', instance.id)
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no_inbox' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract message fields from UAZAPI format
    const chatId = message.chatid || message.sender || ''
    const fromMe = message.fromMe === true
    const direction = fromMe ? 'outgoing' : 'incoming'
    const externalId = message.messageid || message.id || ''

    // Extract content and media
    const mediaType = normalizeMediaType(message.mediaType || message.type || '')
    const mediaUrl = message.fileURL || message.mediaUrl || ''
    let content = message.text || message.content || message.caption || ''

    // Fallback content for media without caption
    if (mediaType !== 'text' && !content && message.fileName) {
      content = message.fileName
    }

    console.log(`Processing: direction=${direction}, mediaType=${mediaType}, externalId=${externalId}, chatId=${chatId}`)

    // Deduplication: check if external_id already exists
    if (externalId) {
      const { data: existingMsg } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle()

      if (existingMsg) {
        console.log('Duplicate message skipped:', externalId)
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'duplicate' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Extract contact info
    const contactJid = fromMe ? chatId : (message.sender_pn || message.sender || chatId)
    const contactPhone = extractPhone(contactJid)
    const contactName = chat?.wa_contactName || chat?.name || message.senderName || contactPhone

    // Upsert contact
    const { data: contact } = await supabase
      .from('contacts')
      .upsert(
        { jid: contactJid, phone: contactPhone, name: contactName },
        { onConflict: 'jid' }
      )
      .select('id')
      .single()

    if (!contact) {
      console.error('Failed to upsert contact')
      return new Response(JSON.stringify({ error: 'Failed to upsert contact' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Convert timestamp (UAZAPI sends ms)
    const msgTimestamp = message.messageTimestamp
      ? new Date(Number(message.messageTimestamp)).toISOString()
      : new Date().toISOString()

    // Find or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('inbox_id', inbox.id)
      .eq('contact_id', contact.id)
      .in('status', ['aberta', 'pendente'])
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          inbox_id: inbox.id,
          contact_id: contact.id,
          status: 'aberta',
          priority: 'media',
          is_read: false,
          last_message_at: msgTimestamp,
        })
        .select('id')
        .single()
      conversation = newConv
    }

    if (!conversation) {
      console.error('Failed to create conversation')
      return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert message
    const { error: insertError } = await supabase.from('conversation_messages').insert({
      conversation_id: conversation.id,
      direction,
      content,
      media_type: mediaType,
      media_url: mediaUrl || null,
      external_id: externalId || null,
      created_at: msgTimestamp,
    })

    if (insertError) {
      console.error('Failed to insert message:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to insert message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update conversation
    const updateData: Record<string, unknown> = { last_message_at: msgTimestamp }
    if (direction === 'incoming') {
      updateData.is_read = false
    }
    await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversation.id)

    console.log('Message processed successfully:', conversation.id, direction, mediaType)

    return new Response(JSON.stringify({ ok: true, conversation_id: conversation.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
