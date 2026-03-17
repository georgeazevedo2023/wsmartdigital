import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const supabase = createServiceClient()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString()

    console.log('Cleaning up media older than:', cutoff)

    const buckets = ['audio-messages', 'helpdesk-media']
    let totalDeleted = 0

    for (const bucket of buckets) {
      const { data: folders, error: listErr } = await supabase.storage
        .from(bucket)
        .list('', { limit: 1000 })

      if (listErr) {
        console.error(`Error listing ${bucket}:`, listErr)
        continue
      }

      for (const folder of folders || []) {
        if (!folder.name) continue

        const { data: files, error: filesErr } = await supabase.storage
          .from(bucket)
          .list(folder.name, { limit: 1000 })

        if (filesErr || !files) continue

        const oldFiles = files.filter(f => {
          if (!f.created_at) return false
          return new Date(f.created_at) < thirtyDaysAgo
        })

        if (oldFiles.length > 0) {
          const paths = oldFiles.map(f => `${folder.name}/${f.name}`)
          const { error: delErr } = await supabase.storage
            .from(bucket)
            .remove(paths)

          if (delErr) {
            console.error(`Error deleting from ${bucket}:`, delErr)
          } else {
            totalDeleted += paths.length
            console.log(`Deleted ${paths.length} files from ${bucket}/${folder.name}`)
          }
        }
      }
    }

    console.log('Cleanup complete. Total files deleted:', totalDeleted)
    return jsonResponse({ ok: true, deleted: totalDeleted })
  } catch (error) {
    console.error('Cleanup error:', error)
    return errorResponse('Internal server error', 500)
  }
})
