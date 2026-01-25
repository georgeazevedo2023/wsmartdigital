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

        // UAZAPI uses /chat/send endpoint for text messages
        const sendUrl = `${uazapiUrl}/chat/send`
        const sendBody = {
          number: groupjid,
          message: message,
        }
        
        console.log('Sending message to:', sendUrl)
        console.log('Payload:', JSON.stringify(sendBody))
        console.log('Token (first 10 chars):', instanceToken.substring(0, 10))
        
        response = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify(sendBody),
        })
        
        console.log('Send response status:', response.status)
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const data = await response.json()

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
