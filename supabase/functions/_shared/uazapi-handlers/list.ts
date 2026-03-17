import { HandlerContext, fetchUpstream, respond } from './types.ts'

export async function handleList(ctx: HandlerContext): Promise<Response> {
  console.log('Fetching instances from:', `${ctx.uazapiUrl}/instance/all`)

  const { data, status } = await fetchUpstream(`${ctx.uazapiUrl}/instance/all`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      admintoken: ctx.adminToken,
      token: ctx.adminToken,
    },
  })

  console.log('UAZAPI response status:', status)
  return respond(data, status)
}
