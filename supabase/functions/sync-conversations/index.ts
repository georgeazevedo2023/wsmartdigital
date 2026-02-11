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

    // 2. Fetch chats from UAZAPI
    // Try POST /chat/search first, fallback to GET /chat/list
    let chats: Array<Record<string, unknown>> = []

    // Try multiple UAZAPI endpoints to find chats
    const chatEndpoints = [
      { url: `${uazapiUrl}/chat/fetchChats`, method: 'POST', body: JSON.stringify({ count: 200 }) },
      { url: `${uazapiUrl}/chat/getChats`, method: 'POST', body: JSON.stringify({ count: 200 }) },
      { url: `${uazapiUrl}/chat/search`, method: 'GET', body: null },
      { url: `${uazapiUrl}/chat/list`, method: 'POST', body: JSON.stringify({}) },
      { url: `${uazapiUrl}/chat/list`, method: 'GET', body: null },
    ]

    for (const ep of chatEndpoints) {
      if (chats.length > 0) break
      try {
        console.log(`Trying ${ep.method} ${ep.url}`)
        const fetchOpts: RequestInit = {
          method: ep.method,
          headers: { 'Content-Type': 'application/json', 'token': instanceToken },
        }
        if (ep.body && ep.method === 'POST') fetchOpts.body = ep.body

        const res = await fetch(ep.url, fetchOpts)
        const text = await res.text()
        console.log(`${ep.url} status: ${res.status}, response (first 300): ${text.substring(0, 300)}`)

        if (!res.ok) continue

        let parsed: unknown
        try { parsed = JSON.parse(text) } catch { continue }

        let extracted: unknown[] = []
        if (Array.isArray(parsed)) {
          extracted = parsed
        } else if (parsed && typeof parsed === 'object') {
          const obj = parsed as Record<string, unknown>
          const candidate = obj.chats || obj.Chats || obj.data || obj.Data || obj.conversations || obj.Conversations
          if (Array.isArray(candidate)) extracted = candidate
        }

        if (extracted.length > 0) {
          chats = extracted as Array<Record<string, unknown>>
          console.log(`Success with ${ep.url}, got ${chats.length} chats`)
        }
      } catch (e) {
        console.error(`${ep.url} failed:`, e)
      }
    }

    console.log(`Total chats fetched: ${chats.length}`)

    // 3. Filter individual chats only (exclude groups @g.us and status @broadcast)
    const individualChats = chats.filter((chat) => {
      const jid = String(chat.jid || chat.Jid || chat.JID || chat.id || chat.Id || '')
      return jid.endsWith('@s.whatsapp.net') && !jid.includes('status')
    })

    console.log(`Individual chats to sync: ${individualChats.length}`)

    let synced = 0
    let errors = 0

    for (const chat of individualChats) {
      try {
        const jid = String(chat.jid || chat.Jid || chat.JID || chat.id || chat.Id || '')
        const chatName = String(chat.name || chat.Name || chat.pushName || chat.PushName || '')
        const phone = jid.split('@')[0]

        if (!jid || !phone) continue

        // 3a. Upsert contact
        // Check if contact exists first
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('jid', jid)
          .maybeSingle()

        let contactId: string

        if (existingContact) {
          contactId = existingContact.id
          // Update name if we have a new one
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

        // 3b. Check if conversation already exists for this contact+inbox
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
          // Get last message timestamp from chat data
          const lastMsgTimestamp = chat.lastMessageTimestamp || chat.LastMessageTimestamp ||
            chat.timestamp || chat.Timestamp || null
          const lastMsgAt = lastMsgTimestamp
            ? new Date(typeof lastMsgTimestamp === 'number' 
                ? lastMsgTimestamp > 9999999999 ? lastMsgTimestamp : lastMsgTimestamp * 1000 
                : lastMsgTimestamp
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
          const msgsRes = await fetch(`${uazapiUrl}/chat/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'token': instanceToken },
            body: JSON.stringify({ chatjid: jid, count: 30 }),
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
              const msgId = String(msg.id || msg.Id || msg.ID || msg.key?.id || '')
              if (!msgId) continue

              // Check if already exists
              const { data: existing } = await supabase
                .from('conversation_messages')
                .select('id')
                .eq('external_id', msgId)
                .maybeSingle()

              if (existing) continue

              const fromMe = msg.fromMe ?? msg.FromMe ?? msg.from_me ?? false
              const msgContent = String(
                msg.body || msg.Body || msg.text || msg.Text || 
                msg.message?.conversation || msg.message?.extendedTextMessage?.text || 
                msg.content || ''
              )
              const msgTimestamp = msg.timestamp || msg.Timestamp || msg.messageTimestamp || Date.now() / 1000
              const createdAt = new Date(
                typeof msgTimestamp === 'number'
                  ? msgTimestamp > 9999999999 ? msgTimestamp : msgTimestamp * 1000
                  : msgTimestamp
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
