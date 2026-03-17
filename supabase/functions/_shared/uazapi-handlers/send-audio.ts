import { HandlerContext, requireToken, fetchUpstream, respond } from './types.ts'

export async function handleSendAudio(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err
  if (!ctx.body.jid || !ctx.body.audio) {
    return respond({ error: 'Token, jid and audio (base64) required' }, 400)
  }

  const rawAudio = String(ctx.body.audio)
  const audioFile = rawAudio.startsWith('data:') && rawAudio.includes(',')
    ? rawAudio.split(',')[1]
    : rawAudio

  console.log('Sending audio PTT to:', ctx.body.jid)

  const { data, status } = await fetchUpstream(`${ctx.uazapiUrl}/send/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
    body: JSON.stringify({ number: ctx.body.jid, type: 'ptt', file: audioFile }),
  })

  console.log('Audio response status:', status)
  return respond(data, status)
}
