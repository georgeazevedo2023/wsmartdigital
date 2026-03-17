import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
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

    const body = await req.json()
    const { email, password, full_name, role } = body
    const validRoles = ['super_admin', 'gerente', 'user']
    const userRole = validRoles.includes(role) ? role : 'user'

    if (!email || !password) return errorResponse('Email and password are required', 400)

    const adminClient = createServiceClient()

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createError) return errorResponse(createError.message, 400)

    if (newUser.user) {
      await adminClient.from('user_roles').delete().eq('user_id', newUser.user.id)
      await adminClient.from('user_roles').insert({ user_id: newUser.user.id, role: userRole })
    }

    return jsonResponse({
      success: true,
      user: { id: newUser.user?.id, email: newUser.user?.email },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error:', error)
    return errorResponse(errorMessage, 500)
  }
})
