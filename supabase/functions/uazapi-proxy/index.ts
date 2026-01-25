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
        // Connect/create instance
        response = await fetch(`${uazapiUrl}/instance/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admintoken': adminToken,
          },
          body: JSON.stringify({
            instanceName,
            token: instanceToken,
          }),
        })
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

      case 'send-image': {
        // Send image to group
        if (!instanceToken || !groupjid || !body.mediaUrl) {
          return new Response(
            JSON.stringify({ error: 'Token, groupjid and mediaUrl required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if it's a base64 or URL
        const isBase64 = body.mediaUrl.startsWith('data:')
        const imageEndpoint = isBase64 ? '/send/imageBase64' : '/send/imageUrl'
        const imageUrl = `${uazapiUrl}${imageEndpoint}`
        
        // UAZAPI uses 'imageUrl' field for URL, 'image' for base64
        const imageBody = isBase64 
          ? { number: groupjid, image: body.mediaUrl, caption: body.caption || '' }
          : { number: groupjid, imageUrl: body.mediaUrl, caption: body.caption || '' }
        
        console.log('Sending image to:', imageUrl)
        console.log('Is Base64:', isBase64)
        console.log('Token (first 10 chars):', instanceToken.substring(0, 10))
        
        const imageResponse = await fetch(imageUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(imageBody),
        })
        
        console.log('Image response status:', imageResponse.status)
        
        const imageRawText = await imageResponse.text()
        console.log('Image raw response:', imageRawText.substring(0, 200))
        
        let imageData: unknown
        try {
          imageData = JSON.parse(imageRawText)
        } catch {
          imageData = { raw: imageRawText }
        }
        
        return new Response(
          JSON.stringify(imageData),
          { 
            status: imageResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      case 'send-file': {
        // Send file to group
        if (!instanceToken || !groupjid || !body.mediaUrl || !body.filename) {
          return new Response(
            JSON.stringify({ error: 'Token, groupjid, mediaUrl and filename required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const fileUrl = `${uazapiUrl}/send/file`
        const fileBody = {
          number: groupjid,
          file: body.mediaUrl,
          filename: body.filename,
          caption: body.caption || '',
        }
        
        console.log('Sending file to:', fileUrl)
        console.log('Token (first 10 chars):', instanceToken.substring(0, 10))
        
        const fileResponse = await fetch(fileUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(fileBody),
        })
        
        console.log('File response status:', fileResponse.status)
        
        const fileRawText = await fileResponse.text()
        let fileData: unknown
        try {
          fileData = JSON.parse(fileRawText)
        } catch {
          fileData = { raw: fileRawText }
        }
        
        return new Response(
          JSON.stringify(fileData),
          { 
            status: fileResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
