import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Subscribes to Supabase Realtime for a given table.
 * Calls onRefresh whenever any row changes (INSERT, UPDATE, DELETE).
 */
export function useRealtimeSync(table: string, onRefresh: () => void) {
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        refreshRef.current()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table])
}
