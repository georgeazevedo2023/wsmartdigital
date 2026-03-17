import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { extractAuth, createUserClient, validateUser, isServiceToken, createServiceClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const auth = extractAuth(req)
    if (!auth) return errorResponse('Unauthorized', 401)

    // Accept service role key (from webhook) or valid JWT
    if (!isServiceToken(auth.token)) {
      const userSupabase = createUserClient(auth.authHeader)
      const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(auth.token)
      if (claimsError || !claimsData?.claims) return errorResponse('Unauthorized', 401)
    }

    const { messageId, audioUrl, conversationId } = await req.json()
    if (!messageId || !audioUrl) return errorResponse('messageId and audioUrl required', 400)

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured')
      return errorResponse('GROQ_API_KEY not configured', 500)
    }

    console.log('Transcribing audio for message:', messageId, 'url:', audioUrl.substring(0, 80))

    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      console.error('Failed to download audio:', audioResponse.status)
      return errorResponse('Failed to download audio', 500)
    }

    const audioBlob = await audioResponse.blob()
    console.log('Audio downloaded, size:', audioBlob.size, 'type:', audioBlob.type)

    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.mp3')
    formData.append('model', 'whisper-large-v3')
    formData.append('temperature', '0')
    formData.append('language', 'pt')
    formData.append('response_format', 'verbose_json')
    formData.append('prompt', 'Conversa o áudio em texto de forma clara e precisa.')

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: formData,
    })

    if (!groqResponse.ok) {
      const errText = await groqResponse.text()
      console.error('Groq API error:', groqResponse.status, errText)
      return errorResponse('Groq transcription failed', 500)
    }

    const result = await groqResponse.json()
    const transcription = result.text || ''
    console.log('Transcription result:', transcription.substring(0, 100))

    const supabase = createServiceClient()

    const { error: updateError } = await supabase
      .from('conversation_messages')
      .update({ transcription })
      .eq('id', messageId)

    if (updateError) {
      console.error('Failed to update transcription:', updateError)
      return errorResponse('Failed to save transcription', 500)
    }

    console.log('Transcription saved for message:', messageId)

    if (conversationId) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
      const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
      await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            topic: 'helpdesk-realtime',
            event: 'transcription-updated',
            payload: { messageId, conversationId, transcription },
          }],
        }),
      }).then(r => console.log('Transcription broadcast status:', r.status))
        .catch(err => console.error('Transcription broadcast failed:', err))
    }

    return jsonResponse({ ok: true, transcription })
  } catch (error) {
    console.error('Transcription error:', error)
    return errorResponse('Internal server error', 500)
  }
})
