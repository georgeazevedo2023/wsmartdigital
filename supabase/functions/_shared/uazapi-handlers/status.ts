import { HandlerContext, requireToken, fetchUpstream, respond } from './types.ts'

export async function handleStatus(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err

  console.log('Checking status with token (first 10 chars):', ctx.instanceToken!.substring(0, 10))

  const { data, status } = await fetchUpstream(`${ctx.uazapiUrl}/instance/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
  })

  console.log('Status response status:', status)
  return respond(data, status)
}
