import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, RefreshCw, Unplug } from 'lucide-react'
import {
  disconnectGoogle,
  isGoogleConnected,
  startGoogleConnect,
  syncFromGoogle,
} from '@/lib/calendarSync'

const CALLBACK_PATH = '/auth/google/callback'
// The OAuth callback is hosted on the Supabase Edge Function — point Google there.
function callbackUrl(): string {
  const fnsBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`
  return fnsBase
}

export function GoogleConnectCard() {
  const [state, setState] = useState<{ connected: boolean; email?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function refresh() {
    setState(await isGoogleConnected())
  }

  useEffect(() => { refresh() }, [])

  async function connect() {
    setBusy(true); setMsg(null)
    try {
      const url = await startGoogleConnect(callbackUrl())
      window.location.href = url
    } catch (e) {
      setMsg(String(e))
      setBusy(false)
    }
  }

  async function disconnect() {
    setBusy(true); setMsg(null)
    await disconnectGoogle()
    await refresh()
    setBusy(false)
  }

  async function manualSync() {
    setBusy(true); setMsg(null)
    const r = await syncFromGoogle()
    setMsg(r ? `Synced ${r.upserts} events${r.deletes ? `, removed ${r.deletes}` : ''}.` : 'Sync failed.')
    setBusy(false)
  }

  if (state === null) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="skeleton h-4 w-40 mb-2" />
        <div className="skeleton h-3 w-64" />
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-linen-100 dark:bg-ink-700">
          {/* Google G mark */}
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.67-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-plum-800 dark:text-ink-100 text-sm">Google Calendar</h3>
          {state.connected ? (
            <p className="text-xs text-linen-500 dark:text-ink-300 mt-0.5 flex items-center gap-1.5 truncate">
              <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
              Connected as {state.email}
            </p>
          ) : (
            <p className="text-xs text-linen-500 dark:text-ink-300 mt-0.5">
              Two-way sync events with your Google Calendar.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {state.connected ? (
          <>
            <button
              onClick={manualSync}
              disabled={busy}
              className="btn-ghost flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
              Sync now
            </button>
            <button
              onClick={disconnect}
              disabled={busy}
              className="btn-ghost flex items-center gap-1.5 disabled:opacity-50 text-rose-500"
            >
              <Unplug size={13} />
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={connect}
            disabled={busy}
            className="btn-primary disabled:opacity-50"
          >
            Connect Google Calendar
          </button>
        )}
      </div>

      {msg && (
        <p className="mt-2 text-xs text-linen-500 dark:text-ink-300 flex items-center gap-1.5">
          <AlertCircle size={12} /> {msg}
        </p>
      )}
    </div>
  )
}

export { CALLBACK_PATH }
