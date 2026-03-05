import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Clock, Repeat } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { TimeBlock } from '@/lib/types'

type CalMode = 'month' | 'week' | 'day'

const CATEGORIES = [
  { label: 'Work',     color: '#e8829a' },
  { label: 'Personal', color: '#b05070' },
  { label: 'Health',   color: '#6abf8e' },
  { label: 'Creative', color: '#f4afc0' },
  { label: 'Learning', color: '#f0a56a' },
  { label: 'Social',   color: '#9b7edb' },
]

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6 AM – 11 PM
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function startOfWeek(d: Date) {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }
function isSameMonth(a: Date, b: Date) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}
function dateStr(d: Date) { return d.toISOString().split('T')[0] }
function formatHour(h: number) {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:00 ${ampm}`
}
function buildMonthGrid(date: Date): Date[] {
  const s = startOfMonth(date)
  const gridStart = addDays(s, -s.getDay())
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

// ─── Default form ─────────────────────────────────────────────────────────────
interface BlockFormData {
  title: string; category: string; date: string
  startHour: number; endHour: number; repeatUntil: string
}
const defaultForm: BlockFormData = {
  title: '', category: 'Work',
  date: new Date().toISOString().split('T')[0],
  startHour: 9, endHour: 10,
  repeatUntil: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CalendarView() {
  const [mode, setMode] = useState<CalMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<BlockFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  const today = new Date(); today.setHours(0,0,0,0)

  const loadBlocks = useCallback(async () => {
    try {
      let from: string, to: string
      if (mode === 'month') {
        from = addDays(startOfMonth(currentDate), -7).toISOString()
        to   = addDays(endOfMonth(currentDate), 7).toISOString()
      } else if (mode === 'week') {
        const ws = startOfWeek(currentDate)
        from = ws.toISOString(); to = addDays(ws, 7).toISOString()
      } else {
        const ds = new Date(currentDate); ds.setHours(0,0,0,0)
        from = ds.toISOString(); to = addDays(ds, 1).toISOString()
      }
      const { data } = await supabase
        .from('time_blocks').select('*')
        .gte('start_time', from).lt('start_time', to).order('start_time')
      setBlocks((data as TimeBlock[]) || [])
    } catch (_) {}
  }, [mode, currentDate])

  useEffect(() => { loadBlocks() }, [loadBlocks])
  useRealtimeSync('time_blocks', loadBlocks)

  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (mode === 'month') d.setMonth(d.getMonth() + dir)
    else if (mode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }

  const getTitle = () => {
    if (mode === 'month') return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (mode === 'week') {
      const ws = startOfWeek(currentDate), we = addDays(ws, 6)
      if (ws.getMonth() === we.getMonth())
        return `${ws.toLocaleDateString('en-US', { month: 'long' })} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`
      return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  async function saveBlock() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const startTime = new Date(`${form.date}T${String(form.startHour).padStart(2,'0')}:00:00`).toISOString()
      const endTime   = new Date(`${form.date}T${String(form.endHour).padStart(2,'0')}:00:00`).toISOString()
      const cat = CATEGORIES.find(c => c.label === form.category)
      await supabase.from('time_blocks').insert({
        title: form.title, category: form.category,
        start_time: startTime, end_time: endTime,
        color: cat?.color || '#e8829a',
        repeat_until: form.repeatUntil || null,
      })
      await loadBlocks()
      setShowForm(false); setForm(defaultForm)
    } catch (_) {}
    setSaving(false)
  }

  async function deleteBlock(id: string) {
    await supabase.from('time_blocks').delete().eq('id', id)
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  const blocksForDay = (day: Date) => blocks.filter(b => isSameDay(new Date(b.start_time), day))

  // ── Month View ──────────────────────────────────────────────────────────────
  const renderMonth = () => {
    const grid = buildMonthGrid(currentDate)
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-blush-100 dark:border-mauve-700 flex-shrink-0">
          {DAY_LABELS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-mauve-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>
        {/* Grid */}
        <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
          {grid.map((day, i) => {
            const isToday = isSameDay(day, today)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const dayBlocks = blocksForDay(day)
            return (
              <div
                key={i}
                className={`
                  border-b border-r border-blush-100 dark:border-mauve-700
                  p-1 cursor-pointer transition-colors overflow-hidden
                  hover:bg-blush-50/60 dark:hover:bg-mauve-700/30
                  ${!isCurrentMonth ? 'bg-blush-50/30 dark:bg-mauve-900/20' : ''}
                `}
                onClick={() => { setCurrentDate(day); setMode('day') }}
              >
                {/* Day number */}
                <div className="flex justify-center mb-0.5">
                  <span className={`
                    w-7 h-7 text-sm font-medium flex items-center justify-center rounded-full select-none
                    ${isToday ? 'bg-blush-500 text-white font-semibold' : ''}
                    ${!isToday && isCurrentMonth ? 'text-plum-800 dark:text-mauve-100' : ''}
                    ${!isToday && !isCurrentMonth ? 'text-mauve-300 dark:text-mauve-600' : ''}
                  `}>
                    {day.getDate()}
                  </span>
                </div>
                {/* Event pills */}
                <div className="space-y-0.5">
                  {dayBlocks.slice(0, 3).map(b => (
                    <div
                      key={b.id}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-white text-[10px] leading-tight truncate"
                      style={{ backgroundColor: b.color }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="truncate font-medium">{b.title}</span>
                    </div>
                  ))}
                  {dayBlocks.length > 3 && (
                    <p className="text-[10px] text-mauve-400 pl-1.5 font-medium">+{dayBlocks.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Week / Day time grid ────────────────────────────────────────────────────
  const renderTimeGrid = (days: Date[]) => {
    const now = new Date()
    const nowTop = ((now.getHours() - 6) * 60 + now.getMinutes())
    const isCurrentPeriod = days.some(d => isSameDay(d, today))
    const colCount = days.length

    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Day headers */}
        <div
          className="flex-shrink-0 border-b border-blush-100 dark:border-mauve-700"
          style={{ display: 'grid', gridTemplateColumns: `56px repeat(${colCount}, 1fr)` }}
        >
          <div />
          {days.map((day, i) => {
            const isToday = isSameDay(day, today)
            return (
              <div key={i} className="py-3 text-center border-l border-blush-100 dark:border-mauve-700">
                <p className="text-[11px] text-mauve-400 uppercase font-semibold tracking-wider">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <div
                  className={`
                    text-xl font-light w-10 h-10 mx-auto mt-1 flex items-center justify-center rounded-full cursor-pointer transition-colors
                    ${isToday ? 'bg-blush-500 text-white font-semibold' : 'text-plum-800 dark:text-mauve-100 hover:bg-blush-50 dark:hover:bg-mauve-700'}
                  `}
                  onClick={() => { setCurrentDate(day); setMode('day') }}
                >
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Scrollable time grid */}
        <div className="flex-1 overflow-y-auto">
          <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${colCount}, 1fr)`, height: `${HOURS.length * 60}px`, position: 'relative' }}>
            {/* Hour labels */}
            <div>
              {HOURS.map(h => (
                <div key={h} className="flex items-start justify-end pr-3 pt-1" style={{ height: '60px' }}>
                  <span className="text-[11px] text-mauve-400 select-none whitespace-nowrap">{formatHour(h)}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, di) => {
              const isToday = isSameDay(day, today)
              const dayBlocks = blocksForDay(day)
              return (
                <div
                  key={di}
                  className={`relative border-l border-blush-100 dark:border-mauve-700 ${isToday ? 'bg-blush-50/30 dark:bg-blush-900/10' : ''}`}
                  style={{ height: `${HOURS.length * 60}px` }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const h = Math.min(Math.max(Math.floor((e.clientY - rect.top) / 60) + 6, 6), 21)
                    setForm({ ...defaultForm, date: dateStr(day), startHour: h, endHour: Math.min(h + 1, 22) })
                    setShowForm(true)
                  }}
                >
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div key={h} className="absolute w-full border-t border-blush-100 dark:border-mauve-700/50" style={{ top: `${(h-6)*60}px` }} />
                  ))}
                  {/* Half-hour dashes */}
                  {HOURS.map(h => (
                    <div key={`d${h}`} className="absolute w-full border-t border-dashed border-blush-50 dark:border-mauve-700/25" style={{ top: `${(h-6)*60+30}px` }} />
                  ))}

                  {/* Current time indicator */}
                  {isToday && isCurrentPeriod && nowTop >= 0 && nowTop <= HOURS.length * 60 && (
                    <div className="absolute w-full z-20 pointer-events-none flex items-center" style={{ top: `${nowTop}px` }}>
                      <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm flex-shrink-0" style={{ marginLeft: '-6px' }} />
                      <div className="flex-1 h-px bg-rose-500 shadow-sm" />
                    </div>
                  )}

                  {/* Events */}
                  {dayBlocks.map(block => {
                    const startH = new Date(block.start_time).getHours()
                    const startM = new Date(block.start_time).getMinutes()
                    const endH   = new Date(block.end_time).getHours()
                    const endM   = new Date(block.end_time).getMinutes()
                    const top    = (startH - 6) * 60 + startM
                    const height = Math.max((endH - startH) * 60 + (endM - startM), 24)
                    return (
                      <div
                        key={block.id}
                        className="absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-white overflow-hidden cursor-pointer group shadow-sm"
                        style={{ top: `${top}px`, height: `${height}px`, backgroundColor: block.color, zIndex: 5 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <p className="text-xs font-semibold leading-tight truncate">{block.title}</p>
                        {height > 30 && (
                          <p className="text-[10px] opacity-80">
                            {new Date(block.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); deleteBlock(block.id) }}
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-black/20 rounded p-0.5 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderWeek = () => {
    const ws = startOfWeek(currentDate)
    return renderTimeGrid(Array.from({ length: 7 }, (_, i) => addDays(ws, i)))
  }

  const renderDay = () => {
    const d = new Date(currentDate); d.setHours(0,0,0,0)
    return renderTimeGrid([d])
  }

  // ── Shell ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blush-200 dark:border-mauve-600 text-mauve-500 hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors"
        >
          Today
        </button>
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-blush-100 dark:hover:bg-mauve-700 text-mauve-400 transition-colors">
            <ChevronLeft size={17} />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-blush-100 dark:hover:bg-mauve-700 text-mauve-400 transition-colors">
            <ChevronRight size={17} />
          </button>
        </div>

        <h2 className="font-semibold text-lg text-plum-800 dark:text-mauve-100 flex-1 ml-1">{getTitle()}</h2>

        {/* Mode switcher — Apple-style segmented control */}
        <div className="flex rounded-lg overflow-hidden border border-blush-200 dark:border-mauve-600 text-xs font-medium bg-white dark:bg-mauve-800">
          {(['month', 'week', 'day'] as CalMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                mode === m
                  ? 'bg-blush-500 text-white'
                  : 'text-mauve-400 hover:bg-blush-50 dark:hover:bg-mauve-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setForm(defaultForm); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blush-500 hover:bg-blush-600 text-white rounded-lg text-xs font-medium transition-colors ml-1"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* ── Calendar body ── */}
      <div className="flex-1 min-h-0 bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden flex flex-col">
        {mode === 'month' && renderMonth()}
        {mode === 'week'  && renderWeek()}
        {mode === 'day'   && renderDay()}
      </div>

      {/* ── Add Event modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-mauve-800 rounded-3xl shadow-xl w-full max-w-md border border-blush-100 dark:border-mauve-700">
            <div className="flex items-center justify-between p-6 border-b border-blush-100 dark:border-mauve-700">
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100">New Event</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Title *</label>
                <input className="input-field" placeholder="Event name…" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Category</label>
                  <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Date</label>
                  <input type="date" className="input-field" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label"><Clock size={11} className="inline mr-1" />Start</label>
                  <select className="input-field" value={form.startHour} onChange={e => setForm(f => ({ ...f, startHour: +e.target.value }))}>
                    {HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">End</label>
                  <select className="input-field" value={form.endHour} onChange={e => setForm(f => ({ ...f, endHour: +e.target.value }))}>
                    {HOURS.filter(h => h > form.startHour).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label"><Repeat size={11} className="inline mr-1" />Repeat Until</label>
                <input type="date" className="input-field" value={form.repeatUntil} onChange={e => setForm(f => ({ ...f, repeatUntil: e.target.value }))} />
                <p className="text-xs text-mauve-400 mt-1">Leave set to repeat through end of year</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-blush-200 dark:border-mauve-600 text-mauve-400 text-sm font-medium">Cancel</button>
              <button onClick={saveBlock} disabled={saving || !form.title.trim()} className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-sm font-medium">
                {saving ? 'Saving…' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
