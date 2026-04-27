// Push local SWAGR events that have no external_id up to Google.
// Used right after OAuth connect so pre-existing events appear on Google too.
// Skips repeating-series occurrences (those are RRULE-translated separately).

import { corsHeaders } from '../_shared/cors.ts'
import {
  adminClient,
  getValidAccessToken,
  timeBlockToGoogle,
  userFromAuthHeader,
} from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await userFromAuthHeader(req.headers.get('Authorization'))
  if (!user) return json({ error: 'unauthorized' }, 401)

  const supabase = adminClient()

  // Confirm integration exists
  const { data: integration } = await supabase
    .from('calendar_integrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle()
  if (!integration) return json({ error: 'no_integration' }, 400)

  try {
    const { accessToken } = await getValidAccessToken(supabase, user.id)

    // Find all unsync'd local events for this user.
    // Skip rows that are part of a recurring series (repeat_id is set) — those need
    // RRULE translation, not 1:1 push, to avoid pushing 365 separate events for "daily".
    const { data: rows, error } = await supabase
      .from('time_blocks')
      .select('id, title, category, start_time, end_time, repeat_id')
      .is('external_id', null)
      .is('repeat_id', null)
      .or(`user_id.eq.${user.id},user_id.is.null`)
    if (error) throw error
    if (!rows || rows.length === 0) return json({ ok: true, pushed: 0 })

    const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    let pushed = 0
    let failed = 0
    for (const row of rows) {
      try {
        const r = await fetch(base, {
          method: 'POST',
          headers,
          body: JSON.stringify(timeBlockToGoogle(row)),
        })
        if (!r.ok) { failed += 1; continue }
        const ev = await r.json()
        await supabase
          .from('time_blocks')
          .update({
            external_id: ev.id,
            external_etag: ev.etag,
            external_provider: 'google',
            calendar_external_id: 'primary',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', row.id)
        pushed += 1
      } catch {
        failed += 1
      }
    }

    return json({ ok: true, pushed, failed, scanned: rows.length })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
