// Shared Google OAuth + Calendar API helpers for Edge Functions.
// Uses service-role Supabase client to read/update calendar_integrations.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')!
export const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
export const APP_URL              = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
export const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
export const SERVICE_ROLE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Canonical redirect URI used by both start (auth code request) and callback (token exchange).
// MUST match what's registered in Google Cloud Console exactly.
export const CALLBACK_URI = `${SUPABASE_URL}/functions/v1/google-oauth-callback`

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
].join(' ')

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Build Google's consent-screen URL.
export function buildAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// Exchange the auth code for tokens.
export async function exchangeCode(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!r.ok) throw new Error(`Google token exchange failed: ${await r.text()}`)
  return r.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    id_token?: string
    scope: string
    token_type: string
  }>
}

// Refresh an expired access token.
export async function refreshAccessToken(refresh_token: string) {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token,
    grant_type: 'refresh_token',
  })
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!r.ok) throw new Error(`Google token refresh failed: ${await r.text()}`)
  return r.json() as Promise<{ access_token: string; expires_in: number }>
}

// Decode JWT id_token to grab the email (no signature verification — Google issued it).
export function emailFromIdToken(idToken: string): string | null {
  try {
    const [, payload] = idToken.split('.')
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded.email ?? null
  } catch { return null }
}

// Get a valid access token for a user, refreshing if needed.
export async function getValidAccessToken(supabase: SupabaseClient, userId: string) {
  const { data: row, error } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single()
  if (error || !row) throw new Error('No Google integration for user')

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0
  const now = Date.now()
  if (row.access_token && expiresAt - now > 60_000) return { row, accessToken: row.access_token as string }

  const fresh = await refreshAccessToken(row.refresh_token)
  const newExpiry = new Date(now + fresh.expires_in * 1000).toISOString()
  await supabase
    .from('calendar_integrations')
    .update({ access_token: fresh.access_token, token_expires_at: newExpiry })
    .eq('id', row.id)
  return { row: { ...row, access_token: fresh.access_token, token_expires_at: newExpiry }, accessToken: fresh.access_token }
}

// Resolve the caller's user from the Authorization bearer token.
export async function userFromAuthHeader(authHeader: string | null) {
  if (!authHeader) return null
  const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

// Map a Google event ↔ a time_blocks row.
export type GoogleEvent = {
  id: string
  status?: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?:   { dateTime?: string; date?: string; timeZone?: string }
  etag?: string
  colorId?: string
  recurrence?: string[]
}

export function googleToTimeBlock(ev: GoogleEvent, userId: string) {
  // All-day events use `date`; timed use `dateTime`. Coerce to ISO timestamps.
  const start = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null)
  const end   = ev.end?.dateTime   ?? (ev.end?.date   ? `${ev.end.date}T23:59:59Z`   : null)
  if (!start || !end) return null
  return {
    user_id:           userId,
    title:             ev.summary || '(untitled)',
    category:          'Google',
    start_time:        start,
    end_time:          end,
    color:             '#4285F4', // Google blue; could map colorId
    external_id:       ev.id,
    external_etag:     ev.etag ?? null,
    external_provider: 'google',
    last_synced_at:    new Date().toISOString(),
  }
}

export function timeBlockToGoogle(tb: {
  title: string
  start_time: string
  end_time: string
  category?: string
}) {
  return {
    summary: tb.title,
    description: tb.category ? `Bloom: ${tb.category}` : undefined,
    start: { dateTime: new Date(tb.start_time).toISOString() },
    end:   { dateTime: new Date(tb.end_time).toISOString() },
  }
}
