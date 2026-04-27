// Returns a Google OAuth consent URL for the authenticated user to visit.
// The user_id is encoded into `state` so the callback can match it back.

import { corsHeaders } from '../_shared/cors.ts'
import { buildAuthUrl, CALLBACK_URI, userFromAuthHeader } from '../_shared/google.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await userFromAuthHeader(req.headers.get('Authorization'))
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const state = btoa(JSON.stringify({ user_id: user.id, ts: Date.now() }))
  const authUrl = buildAuthUrl(state, CALLBACK_URI)

  return new Response(JSON.stringify({ url: authUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
