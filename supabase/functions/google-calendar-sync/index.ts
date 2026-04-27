// Pull events from ALL Google Calendars the user has access to into time_blocks.
// Per-calendar incremental sync_tokens stored in calendar_integrations.sync_tokens (jsonb).

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

  let userId: string | null = null
  const user = await userFromAuthHeader(req.headers.get('Authorization'))
  if (user) userId = user.id
  else userId = url.searchParams.get('user_id')

  if (!userId) return json({ error: 'unauthorized' }, 401)

  try {
    const { row, accessToken } = await getValidAccessToken(supabase, userId)
    // Diagnostic: ask Google what scopes this access_token actually has
    const tokenInfo = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`)
      .then(r => r.ok ? r.json() : { error: r.status }) as Record<string, unknown>
    const result = await runSync(supabase, userId, row, accessToken)
    return json({ ...result, granted_scopes: tokenInfo.scope ?? tokenInfo, account_email: row.google_email })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

type CalendarListEntry = {
  id: string
  summary: string
  primary?: boolean
  accessRole?: string
  selected?: boolean
}

async function listCalendars(accessToken: string): Promise<{ items: CalendarListEntry[]; warning?: string }> {
  const r = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!r.ok) {
    const body = await r.text()
    if (r.status === 403) {
      return { items: [{ id: 'primary', summary: 'primary' }], warning: `calendarList 403 (scope missing?): ${body}` }
    }
    throw new Error(`calendarList failed: ${r.status} ${body}`)
  }
  const data = await r.json() as { items: CalendarListEntry[] }
  return { items: data.items ?? [] }
}

async function runSync(
  supabase: ReturnType<typeof adminClient>,
  userId: string,
  row: any,
  accessToken: string,
) {
  const { items: calendars, warning } = await listCalendars(accessToken)
  const syncTokens: Record<string, string> = { ...(row.sync_tokens ?? {}) }
  const perCalendar: Record<string, { upserts: number; deletes: number; full: boolean; error?: string }> = {}
  let totalUpserts = 0
  let totalDeletes = 0

  for (const cal of calendars) {
    try {
      const result = await syncOneCalendar(supabase, userId, accessToken, cal.id, syncTokens[cal.id])
      perCalendar[cal.id] = result
      totalUpserts += result.upserts
      totalDeletes += result.deletes
      if (result.nextSyncToken) syncTokens[cal.id] = result.nextSyncToken
    } catch (e) {
      perCalendar[cal.id] = { upserts: 0, deletes: 0, full: false, error: String(e) }
    }
  }

  await supabase
    .from('calendar_integrations')
    .update({
      sync_tokens: syncTokens,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  return {
    ok: true,
    upserts: totalUpserts,
    deletes: totalDeletes,
    full_sync: Object.values(perCalendar).some(c => c.full),
    calendars: calendars.length,
    per_calendar: perCalendar,
    calendar_list_warning: warning,
  }
}

async function syncOneCalendar(
  supabase: ReturnType<typeof adminClient>,
  userId: string,
  accessToken: string,
  calendarId: string,
  storedSyncToken: string | undefined,
) {
  let pageToken: string | undefined
  let syncToken = storedSyncToken
  let nextSyncToken: string | undefined
  let upserts = 0
  let deletes = 0
  let usedFullSync = false

  while (true) {
    const params = new URLSearchParams()
    if (syncToken) {
      params.set('syncToken', syncToken)
    } else {
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
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (res.status === 410 && syncToken) {
      syncToken = undefined
      pageToken = undefined
      continue
    }
    if (!res.ok) throw new Error(`list events ${res.status}: ${await res.text()}`)
    const data = await res.json() as {
      items: GoogleEvent[]
      nextPageToken?: string
      nextSyncToken?: string
    }

    for (const ev of data.items ?? []) {
      if (ev.status === 'cancelled') {
        const { count } = await supabase
          .from('time_blocks')
          .delete({ count: 'exact' })
          .eq('external_id', ev.id)
        if (count) deletes += count
        continue
      }
      const block = googleToTimeBlock(ev, userId)
      if (!block) continue
      const { error } = await supabase
        .from('time_blocks')
        .upsert(block, { onConflict: 'external_id' })
      if (!error) upserts += 1
    }

    if (data.nextPageToken) {
      pageToken = data.nextPageToken
      continue
    }
    nextSyncToken = data.nextSyncToken
    break
  }

  return { upserts, deletes, full: usedFullSync, nextSyncToken }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
