import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  listSubscriptions,
  updateSubscriptionVisibility,
  updateSubscriptionColor,
  renameSubscription,
  type CalendarSubscription,
} from '@/lib/calendarSync'

const COLOR_PRESETS = [
  '#de6690', '#e84a72', '#c46e93', '#9b7edb', '#5ba4cf',
  '#4285F4', '#6abf8e', '#0e9f6e', '#f0a56a', '#f59e0b',
  '#ef4444', '#a83d62', '#7d5e72', '#3f3a44',
]

interface Props {
  onChange?: (subs: CalendarSubscription[]) => void
}

export function CalendarSidebar({ onChange }: Props) {
  const [subs, setSubs] = useState<CalendarSubscription[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [colorPicker, setColorPicker] = useState<string | null>(null)

  async function load() {
    const data = await listSubscriptions()
    setSubs(data)
    onChange?.(data)
  }

  useEffect(() => {
    load()
    // Realtime: refresh on any subscription change (sync, toggle from another tab, etc.)
    const channel = supabase
      .channel('rt-calendar_subscriptions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_subscriptions' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function toggle(sub: CalendarSubscription) {
    // Optimistic
    setSubs(prev => {
      const next = prev.map(s => s.id === sub.id ? { ...s, visible: !s.visible } : s)
      onChange?.(next)
      return next
    })
    await updateSubscriptionVisibility(sub.id, !sub.visible)
  }

  async function setColor(sub: CalendarSubscription, color: string) {
    setSubs(prev => {
      const next = prev.map(s => s.id === sub.id ? { ...s, color } : s)
      onChange?.(next)
      return next
    })
    setColorPicker(null)
    await updateSubscriptionColor(sub.id, color)
  }

  async function commitRename(sub: CalendarSubscription) {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== sub.name) {
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, name: trimmed } : s))
      await renameSubscription(sub.id, trimmed)
    }
    setEditing(null); setEditName('')
  }

  if (subs.length === 0) return null

  return (
    <aside className="w-[220px] flex-shrink-0 hidden lg:block">
      <div className="bg-white dark:bg-ink-800 rounded-2xl border border-linen-200 dark:border-ink-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-linen-200 dark:border-ink-700">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-linen-400 dark:text-ink-400">
            Calendars
          </p>
        </div>
        <ul className="p-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
          {subs.map(sub => (
            <li key={sub.id} className="group">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-linen-100 dark:hover:bg-ink-700">
                {/* Color dot — toggles visibility on click */}
                <button
                  onClick={() => toggle(sub)}
                  className="relative flex-shrink-0 w-3.5 h-3.5 rounded-[4px] transition-all"
                  style={{
                    backgroundColor: sub.visible ? sub.color : 'transparent',
                    borderColor: sub.color,
                    borderWidth: '1.5px',
                    borderStyle: 'solid',
                  }}
                  aria-label={sub.visible ? 'Hide calendar' : 'Show calendar'}
                  title={sub.visible ? 'Hide events from this calendar' : 'Show events from this calendar'}
                />

                {/* Color picker swatch — appears under the dot */}
                {colorPicker === sub.id && (
                  <div className="absolute z-10 mt-1 ml-0 bg-white dark:bg-ink-800 border border-linen-200 dark:border-ink-700 rounded-xl shadow-modal p-2 grid grid-cols-7 gap-1.5">
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(sub, c)}
                        className="w-5 h-5 rounded-md hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}

                {/* Name (editable on click of pencil) */}
                {editing === sub.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => commitRename(sub)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(sub)
                      if (e.key === 'Escape') { setEditing(null); setEditName('') }
                    }}
                    className="flex-1 min-w-0 bg-transparent text-[13px] text-plum-800 dark:text-ink-100 outline-none border-b border-blush-400"
                  />
                ) : (
                  <span
                    className={`flex-1 min-w-0 truncate text-[13px] ${
                      sub.visible
                        ? 'text-plum-800 dark:text-ink-100'
                        : 'text-linen-400 dark:text-ink-400 line-through'
                    }`}
                    title={sub.name}
                  >
                    {sub.name}
                  </span>
                )}

                {/* Inline action buttons (visible on hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {editing !== sub.id && (
                    <>
                      <button
                        onClick={() => setColorPicker(p => p === sub.id ? null : sub.id)}
                        className="p-1 rounded text-linen-500 dark:text-ink-300 hover:text-plum-800 dark:hover:text-ink-100"
                        title="Change color"
                      >
                        <span className="block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                      </button>
                      <button
                        onClick={() => { setEditing(sub.id); setEditName(sub.name) }}
                        className="p-1 rounded text-linen-500 dark:text-ink-300 hover:text-plum-800 dark:hover:text-ink-100"
                        title="Rename"
                      >
                        <Pencil size={11} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
