import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const payload = await req.json()
    console.log('Webhook payload:', JSON.stringify(payload).substring(0, 500))

    // Extract message data from UAZAPI webhook payload
    // UAZAPI sends different event types - we care about messages
    const eventType = payload.event || payload.type || payload.Event
    
    // Only process incoming messages
    if (!['messages.upsert', 'message', 'messages'].includes(eventType)) {
      console.log('Ignoring event type:', eventType)
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract instance identifier from payload
    const instanceName = payload.instance || payload.instanceName || payload.Instance
    if (!instanceName) {
      console.error('No instance identifier in payload')
      return new Response(JSON.stringify({ error: 'No instance identifier' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find the instance and inbox
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
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no inbox' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract message details
    const messageData = payload.data?.message || payload.message || payload.data || payload
    const key = messageData?.key || payload.key || {}
    const isFromMe = key.fromMe === true
    
    // Skip outgoing messages
    if (isFromMe) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'outgoing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Skip group messages (we only handle individual chats in helpdesk)
    const remoteJid = key.remoteJid || ''
    if (remoteJid.endsWith('@g.us')) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'group' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract sender info
    const senderJid = remoteJid
    const senderPhone = senderJid.split('@')[0]
    const pushName = messageData?.pushName || payload.pushName || ''

    // Extract message content
    const msg = messageData?.message || messageData
    let content = ''
    let mediaType = 'text'
    let mediaUrl = ''

    if (msg?.conversation) {
      content = msg.conversation
    } else if (msg?.extendedTextMessage?.text) {
      content = msg.extendedTextMessage.text
    } else if (msg?.imageMessage) {
      mediaType = 'image'
      content = msg.imageMessage.caption || ''
      mediaUrl = msg.imageMessage.url || ''
    } else if (msg?.videoMessage) {
      mediaType = 'video'
      content = msg.videoMessage.caption || ''
      mediaUrl = msg.videoMessage.url || ''
    } else if (msg?.audioMessage) {
      mediaType = 'audio'
      mediaUrl = msg.audioMessage.url || ''
    } else if (msg?.documentMessage) {
      mediaType = 'pdf'
      content = msg.documentMessage.fileName || ''
      mediaUrl = msg.documentMessage.url || ''
    }

    const externalId = key.id || ''

    // Upsert contact
    const { data: contact } = await supabase
      .from('contacts')
      .upsert(
        { jid: senderJid, phone: senderPhone, name: pushName || senderPhone },
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
          last_message_at: new Date().toISOString(),
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
    await supabase.from('conversation_messages').insert({
      conversation_id: conversation.id,
      direction: 'incoming',
      content,
      media_type: mediaType,
      media_url: mediaUrl || null,
      external_id: externalId,
    })

    // Update conversation
    await supabase
      .from('conversations')
      .update({ is_read: false, last_message_at: new Date().toISOString() })
      .eq('id', conversation.id)

    console.log('Message processed for conversation:', conversation.id)

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
