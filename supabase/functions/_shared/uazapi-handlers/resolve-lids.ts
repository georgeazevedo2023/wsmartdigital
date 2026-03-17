import { HandlerContext, requireToken, respond } from './types.ts'

export async function handleResolveLids(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err

  const groupJids: string[] = (ctx.body.groupJids as string[]) || []
  if (groupJids.length === 0) return respond({ error: 'groupJids array required' }, 400)

  console.log('Enriching participants from', groupJids.length, 'groups via /group/info')

  const groupParticipants: Record<string, Array<{
    jid: string; phone: string; name: string; isAdmin: boolean; isSuperAdmin: boolean; isLid: boolean
  }>> = {}

  for (const gjid of groupJids) {
    try {
      const infoResp = await fetch(`${ctx.uazapiUrl}/group/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
        body: JSON.stringify({ groupjid: gjid }),
      })

      if (!infoResp.ok) { console.log('group/info failed for', gjid, infoResp.status); continue }

      const infoData = await infoResp.json()
      const participants = infoData?.Participants || infoData?.participants || []

      groupParticipants[gjid] = (participants as Array<Record<string, unknown>>).map(p => {
        const rawPhone = String(p.PhoneNumber || p.phoneNumber || '')
        const cleanPhone = rawPhone.replace(/\D/g, '')
        const hasValidPhone = cleanPhone.length >= 10 && !rawPhone.includes('·')
        return {
          jid: String(p.JID || p.jid || ''),
          phone: hasValidPhone ? cleanPhone : '',
          name: String(p.PushName || p.pushName || p.DisplayName || p.Name || p.name || ''),
          isAdmin: Boolean(p.IsAdmin || p.isAdmin),
          isSuperAdmin: Boolean(p.IsSuperAdmin || p.isSuperAdmin),
          isLid: !hasValidPhone,
        }
      })

      console.log('Group', gjid, ':', groupParticipants[gjid].length, 'participants')
    } catch (e) {
      console.error('Error fetching group/info for', gjid, e)
    }
  }

  return respond({ groupParticipants }, 200)
}
