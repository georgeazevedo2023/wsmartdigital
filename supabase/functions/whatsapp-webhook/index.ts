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

async function getMediaLink(messageId: string, instanceToken: string, isAudio: boolean = false): Promise<{ url: string; mimetype?: string } | null> {
  try {
    console.log('Calling /message/download for messageId:', messageId, 'isAudio:', isAudio)
    const body: Record<string, unknown> = {
      id: messageId,
      return_base64: false,
      return_link: true,
    }
    if (isAudio) {
      body.generate_mp3 = true
    }
    const response = await fetch('https://wsmart.uazapi.com/message/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error('Download link request failed:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    console.log('UAZAPI /message/download full response:', JSON.stringify(data))
    // For audio with generate_mp3, prefer mp3Link
    if (isAudio && data.mp3Link) {
      return { url: data.mp3Link, mimetype: data.mimetype || data.mimeType }
    }
    const url = data.link || data.url || data.fileUrl || data.fileURL || null
    return url ? { url, mimetype: data.mimetype || data.mimeType } : null
  } catch (err) {
    console.error('Error getting media link:', err)
    return null
  }
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

    // Log ALL media-related fields for debugging
    console.log('Full message keys:', Object.keys(message).join(','))
    console.log('Message media fields:', JSON.stringify({
      fileURL: message.fileURL,
      fileUrl: message.fileUrl,
      file_url: message.file_url,
      mediaUrl: message.mediaUrl,
      media_url: message.media_url,
      contentURL: message.content?.URL,
      contentUrl: message.content?.url,
      mediaType: message.mediaType,
      fileName: message.fileName,
      resolvedMediaUrl: mediaUrl?.substring(0, 100),
    }))

    // Media: obter link persistente da UAZAPI antes de salvar
    if (mediaType !== 'text' && externalId && instance.token) {
      console.log('Requesting persistent media link from UAZAPI...')
      const persistentResult = await getMediaLink(externalId, instance.token, mediaType === 'audio')
      if (persistentResult) {
        mediaUrl = persistentResult.url
        console.log('Got persistent media URL:', mediaUrl.substring(0, 80))

        // Generate friendly name for documents without caption/fileName
        if (mediaType === 'document' && !content) {
          const mime = persistentResult.mimetype || ''
          const extMap: Record<string, string> = {
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'application/vnd.ms-powerpoint': 'ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
            'text/plain': 'txt',
            'text/csv': 'csv',
          }
          const ext = extMap[mime] || mime.split('/').pop() || 'pdf'
          content = `Documento.${ext}`
          console.log('Generated document name:', content, 'from mimetype:', mime)
        }
      } else {
        console.log('Failed to get persistent link, keeping original:', mediaUrl?.substring(0, 80))
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

    // Insert message
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

    // Broadcast via REST API
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

    // Trigger async transcription for incoming audio messages
    if (mediaType === 'audio' && mediaUrl && insertedMsg && direction === 'incoming') {
      console.log('Triggering audio transcription for message:', insertedMsg.id)
      fetch(`${SUPABASE_URL}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: insertedMsg.id,
          audioUrl: mediaUrl,
          conversationId: conversation.id,
        }),
      }).catch(err => console.error('Transcription call failed:', err))
    }

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