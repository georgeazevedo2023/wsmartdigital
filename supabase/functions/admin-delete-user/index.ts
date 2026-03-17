import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { extractAuth, createUserClient, validateUser, checkRole, createServiceClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const auth = extractAuth(req)
    if (!auth) return errorResponse('Unauthorized', 401)

    const userClient = createUserClient(auth.authHeader)
    const userId = await validateUser(userClient, auth.token)
    if (!userId) return errorResponse('Unauthorized', 401)

    const isAdmin = await checkRole(userId, 'super_admin')
    if (!isAdmin) return errorResponse('Forbidden: Super admin required', 403)

    const { user_id } = await req.json()
    if (!user_id) return errorResponse('User ID is required', 400)
    if (user_id === userId) return errorResponse('Cannot delete your own account', 400)

    const adminClient = createServiceClient()

    await adminClient.from('user_instance_access').delete().eq('user_id', user_id)
    await adminClient.from('user_roles').delete().eq('user_id', user_id)
    await adminClient.from('user_profiles').delete().eq('id', user_id)

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
    if (deleteError) return errorResponse(deleteError.message, 400)

    return jsonResponse({ success: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error:', error)
    return errorResponse(errorMessage, 500)
  }
})
