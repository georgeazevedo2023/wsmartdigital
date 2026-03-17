import { corsHeaders } from '../cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { HandlerContext, respond } from './types.ts'

export async function handleDownloadMedia(ctx: HandlerContext): Promise<Response> {
  if (!ctx.body.fileUrl || !ctx.body.instanceId) {
    return respond({ error: 'fileUrl and instanceId required' }, 400)
  }

  const serviceSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: inst, error: instError } = await serviceSupabase
    .from('instances')
    .select('token')
    .eq('id', ctx.body.instanceId)
    .single()

  if (instError || !inst) return respond({ error: 'Instance not found' }, 404)

  console.log('Proxying file download:', String(ctx.body.fileUrl).substring(0, 80))

  const fileResp = await fetch(String(ctx.body.fileUrl), {
    headers: { token: inst.token },
  })

  if (!fileResp.ok) {
    return respond({ error: 'Failed to download file', status: fileResp.status }, fileResp.status)
  }

  return new Response(fileResp.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': fileResp.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Disposition': fileResp.headers.get('Content-Disposition') || 'inline',
    },
  })
}
