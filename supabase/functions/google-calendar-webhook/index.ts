// Receives Google Calendar push notifications. Header-only POST — body is empty.
// We resolve the user from the channel id (we set it to the user_id when calling watch),
// then trigger an incremental sync.

import { corsHeaders } from '../_shared/cors.ts'
import { adminClient, getValidAccessToken, googleToTimeBlock, type GoogleEvent } from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Google sends X-Goog-Channel-ID, X-Goog-Resource-State, X-Goog-Resource-ID
  const channelId    = req.headers.get('x-goog-channel-id')
  const resourceState = req.headers.get('x-goog-resource-state')
  if (!channelId) return new Response('missing channel id', { status: 400 })

  // 'sync' = initial confirmation ping; nothing to do
  if (resourceState === 'sync') return new Response('ok')

  const supabase = adminClient()
  const { data: integration } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('watch_channel_id', channelId)
    .maybeSingle()
  if (!integration) return new Response('no integration', { status: 404 })

  try {
    const { row, accessToken } = await getValidAccessToken(supabase, integration.user_id)
    const params = new URLSearchParams()
    if (row.sync_token) params.set('syncToken', row.sync_token)
    else {
      const past = new Date(Date.now() - 7 * 86400_000).toISOString()
      params.set('timeMin', past)
      params.set('singleEvents', 'true')
    }
    params.set('maxResults', '250')

    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!r.ok) return new Response(`google ${r.status}`, { status: 502 })
    const data = await r.json() as { items: GoogleEvent[]; nextSyncToken?: string }

    for (const ev of data.items ?? []) {
      if (ev.status === 'cancelled') {
        await supabase.from('time_blocks').delete().eq('external_id', ev.id)
        continue
      }
      // Webhook doesn't tell us which calendar; keep existing mapping if present.
      const block = googleToTimeBlock(ev, integration.user_id, 'primary')
      if (!block) continue
      await supabase.from('time_blocks').upsert(block, { onConflict: 'external_id' })
    }

    if (data.nextSyncToken) {
      await supabase
        .from('calendar_integrations')
        .update({ sync_token: data.nextSyncToken, last_synced_at: new Date().toISOString() })
        .eq('id', integration.id)
    }

    return new Response('ok')
  } catch (e) {
    console.error(e)
    return new Response(String(e), { status: 500 })
  }
})
