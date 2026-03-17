import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Service-role client for admin operations (bypasses RLS) */
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
}

/** Client scoped to a user's JWT (respects RLS) */
export function createUserClient(authHeader: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
}

/** Service-role client that also passes the user's auth header (useful for auth.uid() in db functions like exec_sql) */
export function createAdminClientWithAuth(authHeader: string): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
}

/**
 * Extract and validate auth header from request.
 * Returns { authHeader, token } or null if invalid.
 */
export function extractAuth(req: Request): { authHeader: string; token: string } | null {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return { authHeader, token: authHeader.replace('Bearer ', '') }
}

/**
 * Validate a user JWT via getClaims. Returns userId or null.
 */
export async function validateUser(userClient: SupabaseClient, token: string): Promise<string | null> {
  const { data, error } = await userClient.auth.getClaims(token)
  if (error || !data?.claims) return null
  return data.claims.sub as string
}

/**
 * Check if a token is a service-role key or anon key (non-user token).
 */
export function isServiceToken(token: string): boolean {
  return token === ANON_KEY || token === SERVICE_ROLE_KEY
}

/**
 * Check if user has a specific role. Uses service client to bypass RLS.
 */
export async function checkRole(userId: string, role: string): Promise<boolean> {
  const client = createServiceClient()
  const { data } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle()
  return !!data
}

/**
 * Require super_admin role. Returns userId or throws.
 */
export async function requireSuperAdmin(req: Request): Promise<{ userId: string; userClient: SupabaseClient }> {
  const auth = extractAuth(req)
  if (!auth) throw new Error('Unauthorized')

  const userClient = createUserClient(auth.authHeader)
  const userId = await validateUser(userClient, auth.token)
  if (!userId) throw new Error('Unauthorized')

  const isAdmin = await checkRole(userId, 'super_admin')
  if (!isAdmin) throw new Error('Forbidden: Super admin required')

  return { userId, userClient }
}

export { SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY }
