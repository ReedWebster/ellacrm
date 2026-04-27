// Receives Google Calendar push notifications. Header-only POST — body is empty.
// Lookup channel_id → calendar_watches row → user + calendar to sync incrementally.

import { corsHeaders } from '../_shared/cors.ts'
import { adminClient, getValidAccessToken, googleToTimeBlock, type GoogleEvent } from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const channelId = req.headers.get('x-goog-channel-id')
  const resourceState = req.headers.get('x-goog-resource-state')
  if (!channelId) return new Response('missing channel id', { status: 400 })
  // 'sync' = initial confirmation ping; nothing to do
  if (resourceState === 'sync') return new Response('ok')

  const supabase = adminClient()
  const { data: watch } = await supabase
    .from('calendar_watches')
    .select('user_id, calendar_external_id')
    .eq('channel_id', channelId)
    .maybeSingle()
  if (!watch) return new Response('unknown channel', { status: 404 })

  const { data: integration } = await supabase
    .from('calendar_integrations')
    .select('id, sync_tokens')
    .eq('user_id', watch.user_id)
    .eq('provider', 'google')
    .maybeSingle()
  if (!integration) return new Response('no integration', { status: 404 })

  try {
    const { accessToken } = await getValidAccessToken(supabase, watch.user_id)

    // Lookup the calendar's color so synced events get the right color
    const { data: sub } = await supabase
      .from('calendar_subscriptions')
      .select('color')
      .eq('user_id', watch.user_id)
      .eq('external_id', watch.calendar_external_id)
      .maybeSingle()

    const tokens = (integration.sync_tokens as Record<string, string>) ?? {}
    const calendarId = watch.calendar_external_id
    const params = new URLSearchParams()
    if (tokens[calendarId]) {
      params.set('syncToken', tokens[calendarId])
    } else {
      const past = new Date(Date.now() - 7 * 86400_000).toISOString()
      params.set('timeMin', past)
      params.set('singleEvents', 'true')
    }
    params.set('maxResults', '250')

    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!r.ok) return new Response(`google ${r.status}`, { status: 502 })
    const data = await r.json() as { items: GoogleEvent[]; nextSyncToken?: string }

    for (const ev of data.items ?? []) {
      if (ev.status === 'cancelled') {
        await supabase.from('time_blocks').delete().eq('external_id', ev.id)
        continue
      }
      const block = googleToTimeBlock(ev, watch.user_id, calendarId, sub?.color)
      if (!block) continue
      await supabase.from('time_blocks').upsert(block, { onConflict: 'external_id' })
    }

    if (data.nextSyncToken) {
      await supabase
        .from('calendar_integrations')
        .update({
          sync_tokens: { ...tokens, [calendarId]: data.nextSyncToken },
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', integration.id)
    }

    return new Response('ok')
  } catch (e) {
    console.error(e)
    return new Response(String(e), { status: 500 })
  }
})
