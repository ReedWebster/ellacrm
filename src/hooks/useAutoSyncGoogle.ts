import { useEffect, useRef } from 'react'
import { isGoogleConnected, syncFromGoogle } from '@/lib/calendarSync'

const SYNC_INTERVAL_MS = 5 * 60 * 1000

// Pulls fresh events from Google on app load, on tab focus, and every 5 min while open.
// Cheap when nothing has changed (incremental sync_token returns 0 events).
export function useAutoSyncGoogle(enabled: boolean) {
  const inFlightRef = useRef(false)
  const lastSyncRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function trySync(reason: string) {
      if (inFlightRef.current) return
      // Throttle: skip if last successful sync was <30s ago
      if (Date.now() - lastSyncRef.current < 30_000) return
      const status = await isGoogleConnected()
      if (cancelled || !status.connected) return
      inFlightRef.current = true
      try {
        const result = await syncFromGoogle()
        if (result.ok && import.meta.env.DEV) {
          console.debug(`[google-sync:${reason}] +${result.upserts} -${result.deletes}`)
        }
        lastSyncRef.current = Date.now()
      } finally {
        inFlightRef.current = false
      }
    }

    // 1) Initial sync on mount
    trySync('mount')

    // 2) Tab focus
    function onVisibility() {
      if (document.visibilityState === 'visible') trySync('focus')
    }
    document.addEventListener('visibilitychange', onVisibility)

    // 3) Periodic
    const interval = window.setInterval(() => trySync('interval'), SYNC_INTERVAL_MS)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [enabled])
}
