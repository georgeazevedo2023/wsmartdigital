import { corsResponse, errorResponse } from '../_shared/cors.ts'
import {
  extractAuth,
  createUserClient,
  getInstanceToken,
  getAccessibleInstanceIds,
  checkRole,
} from '../_shared/supabase-admin.ts'
import { type HandlerContext, respond } from '../_shared/uazapi-handlers/types.ts'
import { handleConnect } from '../_shared/uazapi-handlers/connect.ts'
import { handleStatus } from '../_shared/uazapi-handlers/status.ts'
import { handleList } from '../_shared/uazapi-handlers/list.ts'
import { handleGroups } from '../_shared/uazapi-handlers/groups.ts'
import { handleGroupInfo } from '../_shared/uazapi-handlers/group-info.ts'
import { handleSendMessage } from '../_shared/uazapi-handlers/send-message.ts'
import { handleSendMedia } from '../_shared/uazapi-handlers/send-media.ts'
import { handleSendCarousel } from '../_shared/uazapi-handlers/send-carousel.ts'
import { handleCheckNumbers } from '../_shared/uazapi-handlers/check-numbers.ts'
import { handleResolveLids } from '../_shared/uazapi-handlers/resolve-lids.ts'
import { handleDownloadMedia } from '../_shared/uazapi-handlers/download-media.ts'
import { handleSendAudio } from '../_shared/uazapi-handlers/send-audio.ts'
import { handleSendChat } from '../_shared/uazapi-handlers/send-chat.ts'

/** Action → handler map */
const handlers: Record<string, (ctx: HandlerContext) => Promise<Response>> = {
  'connect': handleConnect,
  'status': handleStatus,
  'list': handleList,
  'groups': handleGroups,
  'group-info': handleGroupInfo,
  'send-message': handleSendMessage,
  'send-media': handleSendMedia,
  'send-carousel': handleSendCarousel,
  'check-numbers': handleCheckNumbers,
  'resolve-lids': handleResolveLids,
  'download-media': handleDownloadMedia,
  'send-audio': handleSendAudio,
  'send-chat': handleSendChat,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    // ── Auth ──
    const auth = extractAuth(req)
    if (!auth) return errorResponse('Unauthorized', 401)

    const supabase = createUserClient(auth.authHeader)
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(auth.token)
    if (claimsError || !claimsData?.user) return errorResponse('Unauthorized', 401)
    const userId = claimsData.user.id

    // ── Parse body & build context ──
    const body = await req.json()
    const {
      action,
      instanceId,
      token: bodyToken,
      instanceToken: altToken,
      groupjid,
    } = body as Record<string, unknown>

    const isSuperAdmin = await checkRole(userId, 'super_admin')

    // Resolve instance token server-side from instanceId (preferred, secure path).
    // Fall back to a token supplied in the body only for legacy callers.
    let instanceToken: string | undefined
    let accessibleInstanceIds: Set<string> | undefined

    if (typeof instanceId === 'string' && instanceId.length > 0) {
      accessibleInstanceIds = await getAccessibleInstanceIds(userId, isSuperAdmin)
      if (!accessibleInstanceIds.has(instanceId)) {
        return respond({ error: 'Forbidden: no access to this instance' }, 403)
      }
      const resolved = await getInstanceToken(instanceId)
      if (!resolved) return respond({ error: 'Instance token not found' }, 400)
      instanceToken = resolved
    } else if (typeof bodyToken === 'string' || typeof altToken === 'string') {
      console.warn('[uazapi-proxy] legacy call without instanceId; using token from body')
      instanceToken = (bodyToken as string) || (altToken as string)
    }

    const uazapiUrl = Deno.env.get('UAZAPI_SERVER_URL') || 'https://wsmart.uazapi.com'
    const adminToken = Deno.env.get('UAZAPI_ADMIN_TOKEN')
    if (!adminToken) return respond({ error: 'UAZAPI admin token not configured' }, 500)

    const ctx: HandlerContext = {
      body: body as Record<string, unknown>,
      instanceId: typeof instanceId === 'string' ? instanceId : undefined,
      instanceToken,
      groupjid: typeof groupjid === 'string' ? groupjid : undefined,
      uazapiUrl,
      adminToken,
      userId,
      isSuperAdmin,
      accessibleInstanceIds,
    }

    // ── Route to handler ──
    const handler = handlers[action]
    if (!handler) return respond({ error: 'Invalid action' }, 400)

    return await handler(ctx)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error:', error)
    return respond({ error: msg }, 500)
  }
})
