import { HandlerContext, requireToken, respond } from './types.ts'

export async function handleCheckNumbers(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err
  if (!ctx.body.phones || !Array.isArray(ctx.body.phones)) {
    return respond({ error: 'Instance token and phones array required' }, 400)
  }

  console.log('Checking', (ctx.body.phones as unknown[]).length, 'numbers')

  const resp = await fetch(`${ctx.uazapiUrl}/chat/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
    body: JSON.stringify({ numbers: ctx.body.phones }),
  })

  const rawText = await resp.text()
  let checkData: unknown
  try { checkData = JSON.parse(rawText) } catch { checkData = { raw: rawText } }

  let users: unknown[]
  if (Array.isArray(checkData)) {
    users = checkData
  } else {
    const obj = checkData as Record<string, unknown>
    users = (obj?.Users || obj?.users || obj?.data || []) as unknown[]
  }

  return respond({ users }, resp.status)
}
