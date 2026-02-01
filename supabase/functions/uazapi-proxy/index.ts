import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token)
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { action, instanceName, token: instanceToken, groupjid } = body

    const uazapiUrl = Deno.env.get('UAZAPI_SERVER_URL') || 'https://wsmart.uazapi.com'
    const adminToken = Deno.env.get('UAZAPI_ADMIN_TOKEN')

    if (!adminToken) {
      return new Response(
        JSON.stringify({ error: 'UAZAPI admin token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let response: Response

    switch (action) {
      case 'connect': {
        // Conforme documentação UAZAPI: token da instância no header, body vazio para QR Code
        if (!instanceToken) {
          return new Response(
            JSON.stringify({ error: 'Instance token required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log('Connecting instance with token (first 10 chars):', instanceToken.substring(0, 10))
        
        response = await fetch(`${uazapiUrl}/instance/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify({}),
        })
        
        console.log('Connect response status:', response.status)
        
        // Log response body para debug
        const connectRawText = await response.text()
        console.log('Connect response (first 500 chars):', connectRawText.substring(0, 500))
        
        let connectData: unknown
        try {
          connectData = JSON.parse(connectRawText)
        } catch {
          connectData = { raw: connectRawText }
        }
        
        return new Response(
          JSON.stringify(connectData),
          { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      case 'status': {
        // Verificar status da instância
        if (!instanceToken) {
          return new Response(
            JSON.stringify({ error: 'Instance token required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log('Checking status with token (first 10 chars):', instanceToken.substring(0, 10))
        
        response = await fetch(`${uazapiUrl}/instance/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
        })
        
        console.log('Status response status:', response.status)
        break
      }

      case 'list': {
        // List all instances
        console.log('Fetching instances from:', `${uazapiUrl}/instance/all`)
        console.log('Using admin token (first 10 chars):', adminToken?.substring(0, 10))
        response = await fetch(`${uazapiUrl}/instance/all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'admintoken': adminToken,
            'token': adminToken,
          },
        })
        console.log('UAZAPI response status:', response.status)
        break
      }

      case 'groups': {
        // List groups for an instance
        if (!instanceToken) {
          return new Response(
            JSON.stringify({ error: 'Instance token required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        console.log('Fetching groups with token (first 10 chars):', instanceToken.substring(0, 10))
        const groupsResponse = await fetch(`${uazapiUrl}/group/list?noparticipants=false`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
        })
        console.log('Groups response status:', groupsResponse.status)
        
        const groupsData = await groupsResponse.json()
        console.log('Groups raw response type:', typeof groupsData, Array.isArray(groupsData) ? 'is array' : 'not array')
        
        // UAZAPI pode retornar { groups: [...] } ou array direto
        // Normalizar para sempre retornar array
        let normalizedGroups: unknown[]
        if (Array.isArray(groupsData)) {
          normalizedGroups = groupsData
        } else if (groupsData?.groups && Array.isArray(groupsData.groups)) {
          normalizedGroups = groupsData.groups
          console.log('Unwrapped groups from object, count:', normalizedGroups.length)
        } else if (groupsData?.data && Array.isArray(groupsData.data)) {
          normalizedGroups = groupsData.data
          console.log('Unwrapped groups from data, count:', normalizedGroups.length)
        } else {
          console.log('Unexpected groups format:', JSON.stringify(groupsData).substring(0, 200))
          normalizedGroups = []
        }
        
        return new Response(
          JSON.stringify(normalizedGroups),
          { 
            status: groupsResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      case 'group-info': {
        // Get group info with participants
        if (!instanceToken || !groupjid) {
          return new Response(
            JSON.stringify({ error: 'Instance token and group JID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        response = await fetch(`${uazapiUrl}/group/info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify({ groupjid }),
        })
        break
      }

      case 'send-message': {
        // Send text message to group
        if (!instanceToken || !groupjid || !body.message) {
          return new Response(
            JSON.stringify({ error: 'Token, groupjid and message required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate message length (max 4096 characters)
        const message = String(body.message).trim()
        if (message.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Message cannot be empty' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (message.length > 4096) {
          return new Response(
            JSON.stringify({ error: 'Message too long (max 4096 characters)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // UAZAPI uses /send/text endpoint for text messages (per documentation)
        const sendUrl = `${uazapiUrl}/send/text`
        const sendBody = {
          number: groupjid,
          text: message,
        }
        
        console.log('Sending message to:', sendUrl)
        console.log('Payload:', JSON.stringify(sendBody))
        console.log('Token (first 10 chars):', instanceToken.substring(0, 10))
        
        const sendResponse = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(sendBody),
        })
        
        console.log('Send response status:', sendResponse.status)
        
        const rawText = await sendResponse.text()
        let sendData: unknown
        try {
          sendData = JSON.parse(rawText)
        } catch {
          sendData = { raw: rawText }
        }
        
        return new Response(
          JSON.stringify(sendData),
          { 
            status: sendResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      case 'send-media': {
        // Send media (image or document) to group using unified /send/media endpoint
        if (!instanceToken || !groupjid || !body.mediaUrl || !body.mediaType) {
          return new Response(
            JSON.stringify({ error: 'Token, groupjid, mediaUrl and mediaType required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const mediaEndpoint = `${uazapiUrl}/send/media`
        
        // Check if it's base64 and extract only the data part (remove prefix like "data:image/png;base64,")
        const isBase64 = body.mediaUrl.startsWith('data:')
        const fileValue = isBase64 
          ? body.mediaUrl.split(',')[1] || body.mediaUrl  // Get only base64 content
          : body.mediaUrl  // URL as-is
        
        // Build payload according to UAZAPI documentation
        const mediaBody: Record<string, unknown> = {
          number: groupjid,
          type: body.mediaType,  // 'image' or 'document'
          file: fileValue,
          text: body.caption || '',  // UAZAPI uses 'text' not 'caption'
        }
        
        // For documents, add the filename
        if (body.mediaType === 'document' && body.filename) {
          mediaBody.docName = body.filename
        }
        
        console.log('Sending media to:', mediaEndpoint)
        console.log('Media type:', body.mediaType)
        console.log('Is Base64:', isBase64)
        console.log('Token (first 10 chars):', instanceToken.substring(0, 10))
        
        const mediaResponse = await fetch(mediaEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(mediaBody),
        })
        
        console.log('Media response status:', mediaResponse.status)
        
        const mediaRawText = await mediaResponse.text()
        console.log('Media raw response:', mediaRawText.substring(0, 300))
        
        let mediaData: unknown
        try {
          mediaData = JSON.parse(mediaRawText)
        } catch {
          mediaData = { raw: mediaRawText }
        }
        
        return new Response(
          JSON.stringify(mediaData),
          { 
            status: mediaResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      case 'send-carousel': {
        // Send carousel message to group
        if (!instanceToken || !groupjid || !body.carousel) {
          return new Response(
            JSON.stringify({ error: 'Token, groupjid and carousel required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const carouselEndpoint = `${uazapiUrl}/send/carousel`
        
        // Process carousel cards - handle base64 images
        const processedCards = body.carousel.map((card: { text: string; image: string; buttons: Array<{ id?: string; label: string; type: string; url?: string; phone?: string }> }, idx: number) => {
          // Check if image is base64 and extract just the data
          let imageValue = card.image
          if (card.image && card.image.startsWith('data:')) {
            imageValue = card.image.split(',')[1] || card.image
          }
          
          return {
            text: card.text,
            image: imageValue,
            buttons: card.buttons.map((btn, btnIdx) => {
              const buttonData: Record<string, unknown> = {
                id: String(btnIdx + 1),
                label: btn.label,
                type: btn.type,
              }
              if (btn.type === 'URL' && btn.url) {
                buttonData.url = btn.url
              }
              if (btn.type === 'CALL' && btn.phone) {
                buttonData.phone = btn.phone
              }
              return buttonData
            }),
          }
        })
        
        // UAZAPI schemas vary by provider/version. We'll try a couple of common shapes.
        // Attempt 1: phone/message/carousel
        // Attempt 2: number/text/carousel (similar to /send/text and /send/media)

        const messageText = String(body.message ?? '').trim()

        const payloadCandidates: Array<Record<string, unknown>> = [
          {
            phone: groupjid,
            message: messageText,
            carousel: processedCards,
          },
          {
            number: groupjid,
            text: messageText,
            carousel: processedCards,
          },
        ]

        console.log('Sending carousel to:', carouselEndpoint)
        console.log('Token (first 10 chars):', instanceToken.substring(0, 10))
        console.log('Carousel cards count:', processedCards.length)

        let lastStatus = 500
        let lastRawText = ''

        for (let attempt = 0; attempt < payloadCandidates.length; attempt++) {
          const candidate = payloadCandidates[attempt]
          console.log(`Carousel attempt #${attempt + 1} payload:`, JSON.stringify(candidate).substring(0, 500))

          const resp = await fetch(carouselEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': instanceToken,
            },
            body: JSON.stringify(candidate),
          })

          lastStatus = resp.status
          lastRawText = await resp.text()
          console.log(`Carousel attempt #${attempt + 1} status:`, lastStatus)
          console.log(`Carousel attempt #${attempt + 1} raw response:`, lastRawText.substring(0, 500))

          // If it's not the "Missing required fields" class of error, don't keep retrying.
          if (resp.ok) break

          const lowered = lastRawText.toLowerCase()
          const shouldRetry = lowered.includes('missing required fields')
          if (!shouldRetry) break
        }

        let carouselData: unknown
        try {
          carouselData = JSON.parse(lastRawText)
        } catch {
          carouselData = { raw: lastRawText }
        }

        return new Response(
          JSON.stringify(carouselData),
          {
            status: lastStatus,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Parse response with resilience (handle non-JSON responses)
    const rawText = await response.text()
    let data: unknown
    try {
      data = JSON.parse(rawText)
    } catch {
      data = { raw: rawText }
    }

    return new Response(
      JSON.stringify(data),
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
