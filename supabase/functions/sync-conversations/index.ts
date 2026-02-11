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
    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { inbox_id } = await req.json()
    if (!inbox_id) {
      return new Response(JSON.stringify({ error: 'inbox_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Get inbox -> instance -> token
    const { data: inbox, error: inboxError } = await supabase
      .from('inboxes')
      .select('id, name, instance_id')
      .eq('id', inbox_id)
      .single()

    if (inboxError || !inbox) {
      return new Response(JSON.stringify({ error: 'Inbox not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id, name, token')
      .eq('id', inbox.instance_id)
      .single()

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: 'Instance not found for this inbox' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const uazapiUrl = Deno.env.get('UAZAPI_SERVER_URL') || 'https://wsmart.uazapi.com'
    const instanceToken = instance.token

    console.log(`Syncing conversations for inbox ${inbox.name} (instance: ${instance.name})`)

    // 2. Fetch chats from UAZAPI using POST /chat/find (V2 API)
    console.log(`Calling POST ${uazapiUrl}/chat/find`)
    const chatsRes = await fetch(`${uazapiUrl}/chat/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': instanceToken },
      body: JSON.stringify({
        wa_isGroup: false,
        limit: 200,
        sort: '-wa_lastMsgTimestamp',
      }),
    })

    const chatsText = await chatsRes.text()
    console.log(`/chat/find status: ${chatsRes.status}, response (first 500): ${chatsText.substring(0, 500)}`)

    if (!chatsRes.ok) {
      return new Response(JSON.stringify({ error: `UAZAPI /chat/find returned ${chatsRes.status}`, detail: chatsText.substring(0, 300) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let chatsParsed: unknown
    try { chatsParsed = JSON.parse(chatsText) } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse /chat/find response' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract array from response
    let chats: Array<Record<string, unknown>> = []
    if (Array.isArray(chatsParsed)) {
      chats = chatsParsed
    } else if (chatsParsed && typeof chatsParsed === 'object') {
      const obj = chatsParsed as Record<string, unknown>
      const candidate = obj.chats || obj.data || obj.Data || obj.results
      if (Array.isArray(candidate)) chats = candidate
    }

    console.log(`Total chats fetched: ${chats.length}`)

    // 3. Filter individual chats (exclude groups and status broadcast)
    const individualChats = chats.filter((chat) => {
      const jid = String(chat.wa_chatid || chat.wa_fastid || chat.jid || chat.id || '')
      return jid.endsWith('@s.whatsapp.net') && !jid.includes('status')
    })

    console.log(`Individual chats to sync: ${individualChats.length}`)

    let synced = 0
    let errors = 0

    for (const chat of individualChats) {
      try {
        const jid = String(chat.wa_chatid || chat.wa_fastid || chat.jid || chat.id || '')
        const chatName = String(chat.wa_contactName || chat.wa_name || chat.name || chat.pushName || '')
        const phone = jid.split('@')[0]

        if (!jid || !phone) continue

        // 3a. Upsert contact
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('jid', jid)
          .maybeSingle()

        let contactId: string

        if (existingContact) {
          contactId = existingContact.id
          if (chatName) {
            await supabase.from('contacts').update({ name: chatName }).eq('id', contactId)
          }
        } else {
          const { data: newContact, error: insertErr } = await supabase
            .from('contacts')
            .insert({ jid, phone, name: chatName || null })
            .select('id')
            .single()

          if (insertErr || !newContact) {
            console.error(`Failed to insert contact ${jid}:`, insertErr)
            errors++
            continue
          }
          contactId = newContact.id
        }

        // 3b. Check if conversation already exists
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('inbox_id', inbox_id)
          .eq('contact_id', contactId)
          .in('status', ['aberta', 'pendente'])
          .maybeSingle()

        let conversationId: string

        if (existingConv) {
          conversationId = existingConv.id
        } else {
          const lastMsgTimestamp = chat.wa_lastMsgTimestamp || chat.lastMessageTimestamp || chat.timestamp || null
          const lastMsgAt = lastMsgTimestamp
            ? new Date(typeof lastMsgTimestamp === 'number' 
                ? (lastMsgTimestamp as number) > 9999999999 ? (lastMsgTimestamp as number) : (lastMsgTimestamp as number) * 1000 
                : lastMsgTimestamp as string
              ).toISOString()
            : new Date().toISOString()

          const { data: newConv, error: convErr } = await supabase
            .from('conversations')
            .insert({
              inbox_id,
              contact_id: contactId,
              status: 'aberta',
              priority: 'media',
              is_read: false,
              last_message_at: lastMsgAt,
            })
            .select('id')
            .single()

          if (convErr || !newConv) {
            console.error(`Failed to create conversation for ${jid}:`, convErr)
            errors++
            continue
          }
          conversationId = newConv.id
        }

        // 3c. Fetch recent messages for this chat
        try {
          const msgsRes = await fetch(`${uazapiUrl}/message/find`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'token': instanceToken },
            body: JSON.stringify({ wa_chatid: jid, limit: 30, sort: '-wa_timestamp' }),
          })

          const msgsText = await msgsRes.text()
          let msgsData: unknown
          try { msgsData = JSON.parse(msgsText) } catch { msgsData = null }

          let messages: Array<Record<string, unknown>> = []
          if (Array.isArray(msgsData)) {
            messages = msgsData
          } else if (msgsData && typeof msgsData === 'object') {
            const obj = msgsData as Record<string, unknown>
            messages = (obj.messages || obj.Messages || obj.data || []) as Array<Record<string, unknown>>
          }

          if (messages.length > 0) {
            // Insert messages, skip duplicates by external_id
            const messagesToInsert = []

            for (const msg of messages) {
              const msgId = String(msg.wa_id || msg._id || msg.id || (msg.key as Record<string,unknown>)?.id || '')
              if (!msgId) continue

              // Check if already exists
              const { data: existing } = await supabase
                .from('conversation_messages')
                .select('id')
                .eq('external_id', msgId)
                .maybeSingle()

              if (existing) continue

              const fromMe = msg.wa_fromMe ?? msg.fromMe ?? false
              const msgContent = String(
                msg.wa_body || msg.wa_text || msg.body || msg.text || 
                msg.content || (msg.message as Record<string,unknown>)?.conversation || ''
              )
              const msgTimestamp = msg.wa_timestamp || msg.timestamp || msg.messageTimestamp || Date.now() / 1000
              const createdAt = new Date(
                typeof msgTimestamp === 'number'
                  ? (msgTimestamp as number) > 9999999999 ? (msgTimestamp as number) : (msgTimestamp as number) * 1000
                  : msgTimestamp as string
              ).toISOString()

              // Detect media
              let mediaType = 'text'
              let mediaUrl: string | null = null
              const msgObj = (msg.message || msg.Message || {}) as Record<string, unknown>
              if (msgObj.imageMessage) { mediaType = 'image'; mediaUrl = String((msgObj.imageMessage as Record<string, unknown>).url || '') }
              else if (msgObj.videoMessage) { mediaType = 'video'; mediaUrl = String((msgObj.videoMessage as Record<string, unknown>).url || '') }
              else if (msgObj.audioMessage) { mediaType = 'audio'; mediaUrl = String((msgObj.audioMessage as Record<string, unknown>).url || '') }
              else if (msgObj.documentMessage) { mediaType = 'document'; mediaUrl = String((msgObj.documentMessage as Record<string, unknown>).url || '') }

              messagesToInsert.push({
                conversation_id: conversationId,
                direction: fromMe ? 'outgoing' : 'incoming',
                content: msgContent || null,
                media_type: mediaType,
                media_url: mediaUrl,
                external_id: msgId,
                created_at: createdAt,
              })
            }

            if (messagesToInsert.length > 0) {
              const { error: insertMsgErr } = await supabase
                .from('conversation_messages')
                .insert(messagesToInsert)

              if (insertMsgErr) {
                console.error(`Failed to insert messages for ${jid}:`, insertMsgErr)
              }
            }

            // Update last_message_at on conversation
            const latestMsg = messagesToInsert.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
            if (latestMsg) {
              await supabase.from('conversations').update({
                last_message_at: latestMsg.created_at,
              }).eq('id', conversationId)
            }
          }
        } catch (msgErr) {
          console.error(`Failed to fetch messages for ${jid}:`, msgErr)
        }

        synced++
      } catch (chatErr) {
        console.error('Error processing chat:', chatErr)
        errors++
      }
    }

    console.log(`Sync complete: ${synced} synced, ${errors} errors`)

    return new Response(
      JSON.stringify({ synced, errors, total: individualChats.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
