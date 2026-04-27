// Push a local time_block change to Google Calendar.
// Body: { action: 'create'|'update'|'delete', time_block: {...}, external_id?: string }

import { corsHeaders } from '../_shared/cors.ts'
import {
  adminClient,
  getValidAccessToken,
  timeBlockToGoogle,
  userFromAuthHeader,
} from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const user = await userFromAuthHeader(req.headers.get('Authorization'))
  if (!user) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => null) as null | {
    action: 'create' | 'update' | 'delete'
    time_block?: any
    external_id?: string
  }
  if (!body?.action) return json({ error: 'missing action' }, 400)

  const supabase = adminClient()

  // If user hasn't connected Google, no-op gracefully so the app's local write still wins.
  const { data: integration } = await supabase
    .from('calendar_integrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle()
  if (!integration) return json({ ok: true, skipped: 'no_integration' })

  try {
    const { accessToken } = await getValidAccessToken(supabase, user.id)
    const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    if (body.action === 'create') {
      if (!body.time_block) return json({ error: 'missing time_block' }, 400)
      const r = await fetch(base, { method: 'POST', headers, body: JSON.stringify(timeBlockToGoogle(body.time_block)) })
      if (!r.ok) return json({ error: `google ${r.status}: ${await r.text()}` }, 502)
      const ev = await r.json()
      // Patch the local row with the returned external id/etag
      await supabase
        .from('time_blocks')
        .update({
          external_id: ev.id,
          external_etag: ev.etag,
          external_provider: 'google',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', body.time_block.id)
      return json({ ok: true, external_id: ev.id })
    }

    if (body.action === 'update') {
      if (!body.external_id || !body.time_block) return json({ error: 'missing external_id or time_block' }, 400)
      const r = await fetch(`${base}/${body.external_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(timeBlockToGoogle(body.time_block)),
      })
      if (!r.ok) return json({ error: `google ${r.status}: ${await r.text()}` }, 502)
      const ev = await r.json()
      await supabase
        .from('time_blocks')
        .update({ external_etag: ev.etag, last_synced_at: new Date().toISOString() })
        .eq('id', body.time_block.id)
      return json({ ok: true })
    }

    if (body.action === 'delete') {
      if (!body.external_id) return json({ error: 'missing external_id' }, 400)
      const r = await fetch(`${base}/${body.external_id}`, { method: 'DELETE', headers })
      // 410 = already gone, treat as success
      if (!r.ok && r.status !== 410) return json({ error: `google ${r.status}: ${await r.text()}` }, 502)
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
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
