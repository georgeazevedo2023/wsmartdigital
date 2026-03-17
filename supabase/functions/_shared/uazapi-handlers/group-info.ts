import { HandlerContext, requireToken, fetchUpstream, respond } from './types.ts'

export async function handleGroupInfo(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err
  if (!ctx.groupjid) return respond({ error: 'Instance token and group JID required' }, 400)

  const { data, status } = await fetchUpstream(`${ctx.uazapiUrl}/group/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
    body: JSON.stringify({ groupjid: ctx.groupjid }),
  })

  return respond(data, status)
}
