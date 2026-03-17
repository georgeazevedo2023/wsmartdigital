import { HandlerContext, respond, requireToken, fetchUpstream } from './types.ts'

export async function handleConnect(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err

  console.log('Connecting instance with token (first 10 chars):', ctx.instanceToken!.substring(0, 10))

  const { data, status } = await fetchUpstream(`${ctx.uazapiUrl}/instance/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
    body: JSON.stringify({}),
  })

  console.log('Connect response status:', status)
  return respond(data, status)
}
