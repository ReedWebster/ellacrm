// Google redirects here with ?code=...&state=...
// We exchange the code, store tokens, then redirect the user back to the app.

import {
  adminClient,
  APP_URL,
  emailFromIdToken,
  exchangeCode,
} from '../_shared/google.ts'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) return redirect(`${APP_URL}/?google_error=${encodeURIComponent(error)}`)
  if (!code || !stateRaw) return redirect(`${APP_URL}/?google_error=missing_code_or_state`)

  let userId: string
  try {
    const decoded = JSON.parse(atob(stateRaw))
    userId = decoded.user_id
    if (!userId) throw new Error('no user_id in state')
  } catch {
    return redirect(`${APP_URL}/?google_error=invalid_state`)
  }

  // Redirect URI MUST match the one used in start; reconstruct it from this function's URL.
  const redirectUri = `${url.origin}${url.pathname}`

  let tokens
  try {
    tokens = await exchangeCode(code, redirectUri)
  } catch (e) {
    return redirect(`${APP_URL}/?google_error=${encodeURIComponent(String(e))}`)
  }

  const email = tokens.id_token ? emailFromIdToken(tokens.id_token) : null
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const supabase = adminClient()
  const { error: upsertErr } = await supabase
    .from('calendar_integrations')
    .upsert({
      user_id: userId,
      provider: 'google',
      google_email: email ?? 'unknown',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      token_expires_at: expiresAt,
    }, { onConflict: 'user_id,provider' })

  if (upsertErr) {
    return redirect(`${APP_URL}/?google_error=${encodeURIComponent(upsertErr.message)}`)
  }

  return redirect(`${APP_URL}/?google_connected=1`)
})

function redirect(to: string) {
  return new Response(null, { status: 302, headers: { Location: to } })
}
