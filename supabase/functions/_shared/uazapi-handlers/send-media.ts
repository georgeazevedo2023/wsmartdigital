import { HandlerContext, requireToken, fetchUpstream, respond, isValidMediaUrl } from './types.ts'

export async function handleSendMedia(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err

  const destination = ctx.groupjid || (ctx.body.jid as string)
  if (!destination || !ctx.body.mediaUrl || !ctx.body.mediaType) {
    return respond({ error: 'Token, groupjid/jid, mediaUrl and mediaType required' }, 400)
  }

  const isBase64 = String(ctx.body.mediaUrl).startsWith('data:')
  if (!isBase64 && !isValidMediaUrl(String(ctx.body.mediaUrl))) {
    return respond({ error: 'Invalid media URL' }, 400)
  }

  const fileValue = isBase64
    ? String(ctx.body.mediaUrl).split(',')[1] || String(ctx.body.mediaUrl)
    : String(ctx.body.mediaUrl)

  const mediaBody: Record<string, unknown> = {
    number: destination,
    type: ctx.body.mediaType,
    file: fileValue,
    text: ctx.body.caption || '',
  }

  if (ctx.body.mediaType === 'document' && ctx.body.filename) {
    mediaBody.docName = ctx.body.filename
  }

  console.log('Sending media type:', ctx.body.mediaType, 'isBase64:', isBase64)

  const { data, status } = await fetchUpstream(`${ctx.uazapiUrl}/send/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
    body: JSON.stringify(mediaBody),
  })

  console.log('Media response status:', status)
  return respond(data, status)
}
