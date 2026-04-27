import { supabase } from './supabase'
import type { TimeBlock } from './types'

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

export async function syncFromGoogle(): Promise<{ upserts: number; deletes: number; full_sync: boolean } | null> {
  const headers = await authHeader()
  const r = await fetch(`${FUNCTIONS_URL}/google-calendar-sync`, { method: 'POST', headers })
  if (!r.ok) return null
  return r.json()
}

type PushAction =
  | { action: 'create'; time_block: TimeBlock }
  | { action: 'update'; external_id: string; time_block: TimeBlock }
  | { action: 'delete'; external_id: string }

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
