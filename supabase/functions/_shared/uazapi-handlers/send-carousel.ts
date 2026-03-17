import { HandlerContext, requireToken, respond, isValidMediaUrl } from './types.ts'

const isUuidLike = (str: string | undefined | null): boolean => {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function handleSendCarousel(ctx: HandlerContext): Promise<Response> {
  const err = requireToken(ctx)
  if (err) return err
  if (!ctx.groupjid || !ctx.body.carousel) {
    return respond({ error: 'Token, groupjid and carousel required' }, 400)
  }

  const carousel = ctx.body.carousel as Array<{
    text: string; image: string;
    buttons: Array<{ id?: string; text?: string; label?: string; type: string; url?: string; phone?: string }>
  }>

  // Validate carousel image URLs
  if (carousel.some(card => card.image && !isValidMediaUrl(card.image))) {
    return respond({ error: 'Invalid carousel image URL' }, 400)
  }

  const isGroup = ctx.groupjid.endsWith('@g.us')
  let normalizedDest = ctx.groupjid
  if (!ctx.groupjid.includes('@') && !isGroup) {
    normalizedDest = `${ctx.groupjid}@s.whatsapp.net`
  }

  // Process cards
  const processedCards = carousel.map((card, idx) => {
    let imageValue = card.image
    if (card.image?.startsWith('data:')) imageValue = card.image.split(',')[1] || card.image

    const processedButtons = card.buttons?.map(btn => {
      const buttonText = btn.text ?? btn.label ?? ''
      let buttonId: string
      switch (btn.type) {
        case 'URL': buttonId = btn.url ?? btn.id ?? ''; break
        case 'CALL': buttonId = btn.phone ?? btn.id ?? ''; break
        case 'COPY': buttonId = btn.id ?? buttonText; break
        case 'REPLY': default:
          buttonId = isUuidLike(btn.id) ? buttonText : (btn.id ?? buttonText); break
      }
      return { id: buttonId, text: buttonText, type: btn.type }
    }) || []

    console.log(`Card ${idx + 1} buttons:`, JSON.stringify(processedButtons))
    return { text: card.text, image: imageValue, buttons: processedButtons }
  })

  const messageText = String(ctx.body.message ?? '').trim()
  const carouselEndpoint = `${ctx.uazapiUrl}/send/carousel`

  // Build payload candidates based on destination type
  const payloadCandidates: Array<Record<string, unknown>> = isGroup
    ? [
        { groupjid: ctx.groupjid, message: messageText, carousel: processedCards },
        { chatId: ctx.groupjid, message: messageText, carousel: processedCards },
        { phone: ctx.groupjid, message: messageText, carousel: processedCards },
        { number: ctx.groupjid, text: messageText, carousel: processedCards },
      ]
    : [
        { phone: normalizedDest, message: messageText, carousel: processedCards },
        { number: normalizedDest, text: messageText, carousel: processedCards },
        { phone: ctx.groupjid, message: messageText, carousel: processedCards },
        { number: ctx.groupjid, text: messageText, carousel: processedCards },
      ]

  console.log('Sending carousel to:', carouselEndpoint, 'type:', isGroup ? 'GROUP' : 'CONTACT')

  let lastStatus = 500
  let lastRawText = ''

  for (let attempt = 0; attempt < payloadCandidates.length; attempt++) {
    const candidate = payloadCandidates[attempt]
    console.log(`Carousel attempt #${attempt + 1} keys:`, Object.keys(candidate).join(', '))

    const resp = await fetch(carouselEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: ctx.instanceToken! },
      body: JSON.stringify(candidate),
    })

    lastStatus = resp.status
    lastRawText = await resp.text()
    console.log(`Carousel attempt #${attempt + 1} status:`, lastStatus)

    if (resp.ok) { console.log(`Carousel SUCCESS attempt #${attempt + 1}`); break }
    const lowered = lastRawText.toLowerCase()
    if (!lowered.includes('missing')) break
  }

  let carouselData: unknown
  try { carouselData = JSON.parse(lastRawText) } catch { carouselData = { raw: lastRawText } }
  return respond(carouselData, lastStatus)
}
