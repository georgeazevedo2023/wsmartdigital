import { HandlerContext, requireToken, respond } from './types.ts'

export async function handleGroups(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err

  console.log('Fetching groups with token (first 10 chars):', ctx.instanceToken!.substring(0, 10))

  const resp = await fetch(`${ctx.uazapiUrl}/group/list?noparticipants=false`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
  })

  console.log('Groups response status:', resp.status)
  const groupsData = await resp.json()

  let normalizedGroups: unknown[]
  if (Array.isArray(groupsData)) {
    normalizedGroups = groupsData
  } else if (groupsData?.groups && Array.isArray(groupsData.groups)) {
    normalizedGroups = groupsData.groups
  } else if (groupsData?.data && Array.isArray(groupsData.data)) {
    normalizedGroups = groupsData.data
  } else {
    console.log('Unexpected groups format:', JSON.stringify(groupsData).substring(0, 200))
    normalizedGroups = []
  }

  return respond(normalizedGroups, 200)
}
