import { HandlerContext, requireToken, fetchUpstream, respond } from './types.ts'

export async function handleSendMessage(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err
  if (!ctx.groupjid || !ctx.body.message) {
    return respond({ error: 'Token, groupjid and message required' }, 400)
  }

  const message = String(ctx.body.message).trim()
  if (message.length === 0) return respond({ error: 'Message cannot be empty' }, 400)
  if (message.length > 4096) return respond({ error: 'Message too long (max 4096 characters)' }, 400)

  console.log('Sending message to group:', ctx.groupjid)

  const { data, status } = await fetchUpstream(`${ctx.uazapiUrl}/send/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
    body: JSON.stringify({ number: ctx.groupjid, text: message }),
  })

  console.log('Send response status:', status)
  return respond(data, status)
}
