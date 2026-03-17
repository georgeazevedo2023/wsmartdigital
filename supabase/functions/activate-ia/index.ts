import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { extractAuth, createUserClient, validateUser, createServiceClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const auth = extractAuth(req)
    if (!auth) return errorResponse('Unauthorized', 401)

    const userSupabase = createUserClient(auth.authHeader)
    const userId = await validateUser(userSupabase, auth.token)
    if (!userId) return errorResponse('Unauthorized', 401)

    const { chatid, phone, instanceId } = await req.json()

    if (!chatid || !phone) return errorResponse('chatid and phone are required', 400)

    // Verify user has access to the supplied instanceId
    if (instanceId) {
      const { data: access } = await userSupabase
        .from('user_instance_access')
        .select('id')
        .eq('user_id', userId)
        .eq('instance_id', instanceId)
        .maybeSingle()

      if (!access) {
        // Also check if user is super_admin
        const { data: roleData } = await userSupabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'super_admin')
          .maybeSingle()

        if (!roleData) return errorResponse('Access denied to this instance', 403)
      }
    }

    // Get instance token
    const { data: instance } = await userSupabase
      .from('instances')
      .select('token')
      .eq('id', instanceId)
      .single()

    if (!instance?.token) return errorResponse('Instance not found', 404)

    const UAZAPI_URL = Deno.env.get('UAZAPI_SERVER_URL') || 'https://wsmart.uazapi.com'

    // Activate IA on UAZAPI
    const response = await fetch(`${UAZAPI_URL}/instance/ia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instance.token,
      },
      body: JSON.stringify({
        chatId: chatid,
        phone,
        activate: true,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('UAZAPI error:', response.status, errText)
      return errorResponse('Failed to activate IA', 500)
    }

    const result = await response.json()
    return jsonResponse({ ok: true, result })
  } catch (error: unknown) {
    console.error('Error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
})
