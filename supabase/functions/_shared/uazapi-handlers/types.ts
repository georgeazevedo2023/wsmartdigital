import { corsHeaders } from '../cors.ts'

/** Context passed to every action handler */
export interface HandlerContext {
  body: Record<string, unknown>
  instanceToken: string | undefined
  groupjid: string | undefined
  uazapiUrl: string
  adminToken: string
}

/** Helper – build a JSON Response with CORS headers */
export function respond(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Parse upstream response text into JSON gracefully */
export function parseUpstream(raw: string): unknown {
  try { return JSON.parse(raw) } catch { return { raw } }
}

/** Fetch upstream, read text, return parsed JSON + status */
export async function fetchUpstream(
  url: string,
  opts: RequestInit,
): Promise<{ data: unknown; status: number; raw: string }> {
  const resp = await fetch(url, opts)
  const raw = await resp.text()
  return { data: parseUpstream(raw), status: resp.status, raw }
}

/** Require instance token or return 400 */
export function requireToken(ctx: HandlerContext): Response | null {
  if (!ctx.instanceToken) return respond({ error: 'Instance token required' }, 400)
  return null
}

/** Validate URLs to prevent SSRF attacks */
export function isValidMediaUrl(url: string): boolean {
  if (url.startsWith('data:')) return true
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    const h = parsed.hostname.toLowerCase()
    if (
      h === 'localhost' || h.startsWith('127.') || h.startsWith('10.') ||
      h.startsWith('192.168.') ||
      h.startsWith('172.16.') || h.startsWith('172.17.') || h.startsWith('172.18.') ||
      h.startsWith('172.19.') || h.startsWith('172.20.') || h.startsWith('172.21.') ||
      h.startsWith('172.22.') || h.startsWith('172.23.') || h.startsWith('172.24.') ||
      h.startsWith('172.25.') || h.startsWith('172.26.') || h.startsWith('172.27.') ||
      h.startsWith('172.28.') || h.startsWith('172.29.') || h.startsWith('172.30.') ||
      h.startsWith('172.31.') || h.startsWith('169.254.') ||
      h === '0.0.0.0' || h === '[::1]' ||
      h.endsWith('.internal') || h.endsWith('.local')
    ) return false
    return true
  } catch { return false }
}
