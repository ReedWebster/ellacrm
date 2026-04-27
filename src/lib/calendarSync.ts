import { supabase } from './supabase'
import type { TimeBlock } from './types'

export interface CalendarSubscription {
  id: string
  external_id: string
  external_provider: string
  name: string
  color: string
  visible: boolean
  is_primary: boolean
  access_role?: string
}

export async function listSubscriptions(): Promise<CalendarSubscription[]> {
  const { data } = await supabase
    .from('calendar_subscriptions')
    .select('id, external_id, external_provider, name, color, visible, is_primary, access_role')
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true })
  return (data as CalendarSubscription[]) ?? []
}

export async function updateSubscriptionVisibility(id: string, visible: boolean): Promise<void> {
  await supabase.from('calendar_subscriptions').update({ visible }).eq('id', id)
}

export async function updateSubscriptionColor(id: string, color: string): Promise<void> {
  await supabase.from('calendar_subscriptions').update({ color }).eq('id', id)
}

export async function renameSubscription(id: string, name: string): Promise<void> {
  await supabase.from('calendar_subscriptions').update({ name }).eq('id', id)
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function isGoogleConnected(): Promise<{ connected: boolean; email?: string }> {
  const { data } = await supabase
    .from('calendar_integrations')
    .select('google_email')
    .eq('provider', 'google')
    .maybeSingle()
  return data ? { connected: true, email: data.google_email } : { connected: false }
}

export async function startGoogleConnect(redirectUri: string): Promise<string> {
  const headers = await authHeader()
  const r = await fetch(
    `${FUNCTIONS_URL}/google-oauth-start?redirect_uri=${encodeURIComponent(redirectUri)}`,
    { headers },
  )
  if (!r.ok) throw new Error(await r.text())
  const { url } = await r.json()
  return url
}

export async function disconnectGoogle(): Promise<void> {
  await supabase.from('calendar_integrations').delete().eq('provider', 'google')
}

export type SyncResult =
  | {
      ok: true
      upserts: number
      deletes: number
      full_sync: boolean
      calendars?: number
      per_calendar?: Record<string, Record<string, unknown>>
      granted_scopes?: string | Record<string, unknown>
      account_email?: string
      calendar_list_warning?: string
    }
  | { ok: false; status: number; error: string }

export async function backfillToGoogle(): Promise<{ ok: boolean; pushed: number; failed?: number } | null> {
  const headers = await authHeader()
  const r = await fetch(`${FUNCTIONS_URL}/google-calendar-backfill`, { method: 'POST', headers })
  if (!r.ok) return null
  return r.json()
}

export async function syncFromGoogle(): Promise<SyncResult> {
  const headers = await authHeader()
  const r = await fetch(`${FUNCTIONS_URL}/google-calendar-sync`, { method: 'POST', headers })
  const text = await r.text()
  if (!r.ok) return { ok: false, status: r.status, error: text || r.statusText }
  try {
    const data = JSON.parse(text)
    return {
      ok: true,
      upserts: data.upserts ?? 0,
      deletes: data.deletes ?? 0,
      full_sync: !!data.full_sync,
      calendars: data.calendars,
      per_calendar: data.per_calendar,
      granted_scopes: data.granted_scopes,
      account_email: data.account_email,
      calendar_list_warning: data.calendar_list_warning,
    }
  } catch {
    return { ok: false, status: r.status, error: `non-JSON response: ${text.slice(0, 200)}` }
  }
}

type PushAction =
  | { action: 'create'; time_block: TimeBlock; recurrence?: string[] }
  | { action: 'update'; external_id: string; time_block: TimeBlock; recurrence?: string[] }
  | { action: 'delete'; external_id: string }

// Translate Bloom's repeat options into Google RRULE strings.
// `daily | weekly | weekdays | weekends` plus an optional UNTIL date.
export function repeatFreqToRRule(freq: string, untilDate?: string): string | null {
  let rule = ''
  switch (freq) {
    case 'daily':    rule = 'FREQ=DAILY'; break
    case 'weekly':   rule = 'FREQ=WEEKLY'; break
    case 'weekdays': rule = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'; break
    case 'weekends': rule = 'FREQ=WEEKLY;BYDAY=SA,SU'; break
    default: return null
  }
  if (untilDate) {
    // RRULE UNTIL must be UTC basic format YYYYMMDDTHHMMSSZ
    const dt = new Date(`${untilDate}T23:59:59Z`)
    const ymd = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    rule += `;UNTIL=${ymd}`
  }
  return `RRULE:${rule}`
}

export async function pushToGoogle(payload: PushAction): Promise<void> {
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json' }
  // Fire-and-forget — local writes already succeeded; sync errors shouldn't block UI.
  try {
    await fetch(`${FUNCTIONS_URL}/google-calendar-push`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.warn('Google push failed (will reconcile on next sync):', e)
  }
}
