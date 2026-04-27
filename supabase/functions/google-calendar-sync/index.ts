// Pull events from Google Calendar into time_blocks.
// Uses sync_token for incremental updates; falls back to full sync when missing/expired.
// Invokable by:
//   - The user (Authorization: Bearer <user JWT>) — syncs that user's calendar.
//   - pg_cron / scheduled — passes ?user_id=<uuid> + service-role auth.

import { corsHeaders } from '../_shared/cors.ts'
import {
  adminClient,
  getValidAccessToken,
  googleToTimeBlock,
  userFromAuthHeader,
  type GoogleEvent,
} from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const supabase = adminClient()

  // Resolve user: prefer JWT, fall back to ?user_id=
  let userId: string | null = null
  const user = await userFromAuthHeader(req.headers.get('Authorization'))
  if (user) userId = user.id
  else userId = url.searchParams.get('user_id')

  if (!userId) {
    return json({ error: 'unauthorized' }, 401)
  }

  try {
    const { row, accessToken } = await getValidAccessToken(supabase, userId)
    const result = await runSync(supabase, userId, row, accessToken)
    return json(result)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

async function runSync(
  supabase: ReturnType<typeof adminClient>,
  userId: string,
  row: any,
  accessToken: string,
) {
  let pageToken: string | undefined
  let syncToken: string | undefined = row.sync_token
  let nextSyncToken: string | undefined
  let upserts = 0
  let deletes = 0
  let usedFullSync = false

  // Loop through pages
  while (true) {
    const params = new URLSearchParams()
    if (syncToken) {
      params.set('syncToken', syncToken)
    } else {
      // Full sync window — last 30 days through 365 days ahead
      const past = new Date(Date.now() - 30 * 86400_000).toISOString()
      const future = new Date(Date.now() + 365 * 86400_000).toISOString()
      params.set('timeMin', past)
      params.set('timeMax', future)
      params.set('singleEvents', 'true')
      params.set('orderBy', 'startTime')
      usedFullSync = true
    }
    if (pageToken) params.set('pageToken', pageToken)
    params.set('maxResults', '250')

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    // 410 Gone = sync_token expired. Restart with full sync.
    if (res.status === 410 && syncToken) {
      syncToken = undefined
      pageToken = undefined
      continue
    }
    if (!res.ok) throw new Error(`Google list events failed: ${res.status} ${await res.text()}`)
    const data = await res.json() as {
      items: GoogleEvent[]
      nextPageToken?: string
      nextSyncToken?: string
    }

    for (const ev of data.items ?? []) {
      // Cancelled events come through as deletions in incremental sync
      if (ev.status === 'cancelled') {
        const { error, count } = await supabase
          .from('time_blocks')
          .delete({ count: 'exact' })
          .eq('external_id', ev.id)
        if (!error && count) deletes += count
        continue
      }
      const row = googleToTimeBlock(ev, userId)
      if (!row) continue
      // Upsert keyed on external_id
      const { error } = await supabase
        .from('time_blocks')
        .upsert(row, { onConflict: 'external_id' })
      if (!error) upserts += 1
    }

    if (data.nextPageToken) {
      pageToken = data.nextPageToken
      continue
    }
    nextSyncToken = data.nextSyncToken
    break
  }

  // Persist new sync token + last_synced_at
  await supabase
    .from('calendar_integrations')
    .update({
      sync_token: nextSyncToken ?? row.sync_token,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  return { ok: true, upserts, deletes, full_sync: usedFullSync }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
