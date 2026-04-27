import { useEffect, useRef, useState } from 'react'
import { RefreshCw, MoreVertical, Unplug } from 'lucide-react'
import {
  disconnectGoogle,
  isGoogleConnected,
  startGoogleConnect,
  syncFromGoogle,
} from '@/lib/calendarSync'

function callbackUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`
}

export function GoogleSyncButton() {
  const [state, setState] = useState<{ connected: boolean; email?: string } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  async function refresh() { setState(await isGoogleConnected()) }
  useEffect(() => { refresh() }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function connect() {
    try {
      const url = await startGoogleConnect(callbackUrl())
      window.location.href = url
    } catch (e) {
      setToast(String(e))
      setTimeout(() => setToast(null), 4000)
    }
  }

  async function sync() {
    setSyncing(true); setToast(null)
    const r = await syncFromGoogle()
    setSyncing(false)
    if (r.ok) {
      setToast(`+${r.upserts}${r.deletes ? ` -${r.deletes}` : ''}`)
    } else {
      setToast('Sync failed')
    }
    setTimeout(() => setToast(null), 2500)
  }

  async function disconnect() {
    setMenuOpen(false)
    await disconnectGoogle()
    await refresh()
  }

  if (state === null) {
    return <div className="w-7 h-7" /> // placeholder while loading
  }

  if (!state.connected) {
    return (
      <button
        onClick={connect}
        className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-linen-300 dark:border-ink-600 text-linen-600 dark:text-ink-200 hover:bg-linen-100 dark:hover:bg-ink-700 transition-colors flex items-center gap-1.5"
        title="Connect Google Calendar"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.67-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        Connect Google
      </button>
    )
  }

  return (
    <div className="relative flex items-center gap-1" ref={menuRef}>
      {toast && (
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mr-1 animate-view-in">
          {toast}
        </span>
      )}
      <button
        onClick={sync}
        disabled={syncing}
        title={`Sync ${state.email ?? 'Google Calendar'}`}
        className="p-1.5 rounded-lg text-linen-500 dark:text-ink-300 hover:text-plum-800 dark:hover:text-ink-100 hover:bg-linen-100 dark:hover:bg-ink-700 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} strokeWidth={1.8} />
      </button>
      <button
        onClick={() => setMenuOpen(s => !s)}
        className="p-1.5 rounded-lg text-linen-500 dark:text-ink-300 hover:text-plum-800 dark:hover:text-ink-100 hover:bg-linen-100 dark:hover:bg-ink-700 transition-colors"
        title="Calendar settings"
      >
        <MoreVertical size={15} strokeWidth={1.8} />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-9 w-56 bg-white dark:bg-ink-800 rounded-xl shadow-modal border border-linen-200 dark:border-ink-700 overflow-hidden z-50 animate-menu-in">
          <div className="px-3 py-2 border-b border-linen-200 dark:border-ink-700">
            <p className="text-[11px] text-linen-400 dark:text-ink-400 uppercase tracking-wider font-medium">Connected as</p>
            <p className="text-[12px] text-plum-800 dark:text-ink-100 truncate">{state.email}</p>
          </div>
          <button
            onClick={disconnect}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <Unplug size={13} /> Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
