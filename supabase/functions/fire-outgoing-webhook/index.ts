import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { extractAuth, createUserClient, validateUser } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const auth = extractAuth(req)
    if (!auth) return errorResponse('Unauthorized', 401)

    const supabase = createUserClient(auth.authHeader)
    const userId = await validateUser(supabase, auth.token)
    if (!userId) return errorResponse('Unauthorized', 401)

    const { webhook_url, payload } = await req.json()

    if (!webhook_url || !payload) {
      return errorResponse('webhook_url and payload are required', 400)
    }

    const webhookResponse = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const responseText = await webhookResponse.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    return jsonResponse({
      ok: webhookResponse.ok,
      status: webhookResponse.status,
      data: responseData,
    })
  } catch (error: unknown) {
    console.error('Error firing outgoing webhook:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return errorResponse(msg, 500)
  }
})
