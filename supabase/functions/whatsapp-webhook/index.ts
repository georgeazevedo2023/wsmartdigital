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

async function downloadMedia(
  uazapiUrl: string,
  instanceToken: string,
  messageId: string
): Promise<string> {
  try {
    const response = await fetch(`${uazapiUrl}/message/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({ messageid: messageId }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.log('Download media failed:', response.status, errText)
      return ''
    }

    const data = await response.json()
    console.log('Download media response keys:', Object.keys(data))
    return data.url || data.URL || data.fileUrl || data.file || data.base64 || ''
  } catch (err) {
    console.error('Error downloading media:', err)
    return ''
  }
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
      .select('id, name, token')
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
    const rawExternalId = message.messageid || message.id || ''
    // Normalize: strip "owner:" prefix if present to use short format consistently
    const externalId = rawExternalId.includes(':') ? rawExternalId.split(':').pop()! : rawExternalId
    const owner = payload.owner || chatId.split('@')[0] || ''

    // Extract content and media
    const mediaType = normalizeMediaType(message.mediaType || message.type || '')
    let mediaUrl = message.fileURL || message.mediaUrl || ''
    if (!mediaUrl && message.content && typeof message.content === 'object') {
      mediaUrl = message.content.URL || message.content.url || ''
    }
    const rawContent = message.text || message.caption || ''
    let content = typeof rawContent === 'string' ? rawContent : ''
    if (!content && typeof message.content === 'string') {
      content = message.content
    }

    // Fallback content for media without caption
    if (mediaType !== 'text' && !content && message.fileName) {
      content = message.fileName
    }

    // Download persistent media URL from UAZAPI
    if (mediaType !== 'text' && instance.token) {
      const uazapiUrl = Deno.env.get('UAZAPI_SERVER_URL') || 'https://wsmart.uazapi.com'
      const downloadedUrl = await downloadMedia(uazapiUrl, instance.token, rawExternalId)
      if (downloadedUrl) {
        mediaUrl = downloadedUrl
        console.log('Downloaded persistent media URL:', mediaUrl.substring(0, 80))
      }
    }

    console.log(`Processing: direction=${direction}, mediaType=${mediaType}, externalId=${externalId}, chatId=${chatId}, mediaUrl=${mediaUrl ? 'YES' : 'NO'}`)

    // Deduplication: check if external_id already exists
    if (externalId) {
      const { data: existingMsg } = await supabase
        .from('conversation_messages')
        .select('id')
        .or(`external_id.eq.${externalId},external_id.eq.${owner}:${externalId}`)
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

    // Insert message (ON CONFLICT DO NOTHING for dedup via unique index)
    const { data: insertedMsg, error: insertError } = await supabase.from('conversation_messages').insert({
      conversation_id: conversation.id,
      direction,
      content,
      media_type: mediaType,
      media_url: mediaUrl || null,
      external_id: externalId || null,
      created_at: msgTimestamp,
    }).select('id').maybeSingle()

    if (insertError) {
      // Check if it's a unique constraint violation (duplicate) - treat as success
      if (insertError.code === '23505') {
        console.log('Duplicate detected by unique index, skipping:', externalId)
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'duplicate_index' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      console.error('Failed to insert message:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to insert message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If no row was inserted (shouldn't happen with error check above, but just in case)
    if (!insertedMsg) {
      console.log('No row inserted (possible duplicate):', externalId)
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no_insert' }), {
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

    // Broadcast via REST API to TWO topics (chat panel + conversation list)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const broadcastPayload = {
      conversation_id: conversation.id,
      inbox_id: inbox.id,
      message_id: insertedMsg.id,
      direction,
      content,
      media_type: mediaType,
      media_url: mediaUrl || null,
      created_at: msgTimestamp,
    }
    const topics = ['helpdesk-realtime', 'helpdesk-conversations']
    const broadcastResults = await Promise.all(
      topics.map(topic =>
        fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
          method: 'POST',
          headers: {
            'apikey': ANON_KEY,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ topic, event: 'new-message', payload: broadcastPayload }],
          }),
        })
      )
    )

    console.log('Message processed + REST broadcast status:', broadcastResults.map(r => r.status).join(','), conversation.id, direction, mediaType)

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
