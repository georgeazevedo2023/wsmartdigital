import { HandlerContext, requireToken, fetchUpstream, respond } from './types.ts'

export async function handleSendChat(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err
  if (!ctx.body.jid || !ctx.body.message) {
    return respond({ error: 'Token, jid and message required' }, 400)
  }

  console.log('Sending chat to:', ctx.body.jid)

  const { data, status } = await fetchUpstream(`${ctx.uazapiUrl}/send/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token: (ctx.body.instanceToken as string) || ctx.instanceToken!,
    },
    body: JSON.stringify({ number: ctx.body.jid, text: String(ctx.body.message).trim() }),
  })

  return respond(data, status)
}
