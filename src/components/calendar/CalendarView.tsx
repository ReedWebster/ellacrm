import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Clock, Repeat } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { TimeBlock } from '@/lib/types'

type CalMode = 'month' | 'week' | 'day'

const CATEGORIES = [
  { label: 'Work',     color: '#de6690' },
  { label: 'School',   color: '#9b7edb' },
  { label: 'Health',   color: '#6abf8e' },
  { label: 'Personal', color: '#e980a4' },
  { label: 'Study',    color: '#f0a56a' },
  { label: 'Language', color: '#5ba4cf' },
  { label: 'Writing',  color: '#b05070' },
  { label: 'Social',   color: '#f2abc4' },
]

const HOURS       = Array.from({ length: 24 }, (_, i) => i) // 0–23
const CELL_H      = 56   // px per hour — matches Apple Calendar density
const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }
function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }
function isSameMonth(a: Date, b: Date) { return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() }
function dateStr(d: Date) { return d.toISOString().split('T')[0] }
function pad(n: number) { return String(n).padStart(2, '0') }

/** Apple Calendar-style time label: "12 AM", "1", "2", ..., "12 PM", "1", ... */
function hourLabel(h: number): string {
  if (h === 0)  return '12 AM'
  if (h === 12) return '12 PM'
  return String(h < 12 ? h : h - 12)
}

function formatTime(h: number, m: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const dh   = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${dh}:${pad(m)} ${ampm}`
}

/** Convert pixel offset from column top → minutes from midnight, snapped to 15 min */
function pxToMin(py: number): number {
  const raw = Math.round(py / CELL_H * 60 / 15) * 15
  return Math.max(0, Math.min(raw, 23 * 60 + 45))
}

function buildMonthGrid(date: Date): Date[] {
  const s = startOfMonth(date)
  return Array.from({ length: 42 }, (_, i) => addDays(addDays(s, -s.getDay()), i))
}

// 15-min time slots 12 AM – 11:45 PM
const TIME_SLOTS = (() => {
  const slots: { value: number; label: string }[] = []
  for (let m = 0; m <= 23 * 60 + 45; m += 15) {
    slots.push({ value: m, label: formatTime(Math.floor(m / 60), m % 60) })
  }
  return slots
})()

// ─── Form ─────────────────────────────────────────────────────────────────────
interface BlockForm {
  title: string; category: string; date: string
  startHour: number; startMin: number; endHour: number; endMin: number
  repeatUntil: string
}
const eoyDate    = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
const defaultForm: BlockForm = {
  title: '', category: 'Work', date: dateStr(new Date()),
  startHour: 9, startMin: 0, endHour: 10, endMin: 0, repeatUntil: eoyDate,
}

// ─── Drag ─────────────────────────────────────────────────────────────────────
interface DragRef     { date: Date; colEl: HTMLElement; anchorMin: number }
interface DragPreview { date: Date; startMin: number; endMin: number }

// ─── Component ────────────────────────────────────────────────────────────────
export default function CalendarView() {
  const [mode, setMode]               = useState<CalMode>(() => window.innerWidth < 768 ? 'day' : 'week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [blocks, setBlocks]           = useState<TimeBlock[]>([])
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState<BlockForm>(defaultForm)
  const [saving, setSaving]           = useState(false)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)

  const dragRef        = useRef<DragRef | null>(null)
  const dragPreviewRef = useRef<DragPreview | null>(null)
  const scrollRef      = useRef<HTMLDivElement>(null)

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // ── Auto-scroll to current time in week/day ────────────────────────────────
  useEffect(() => {
    if ((mode === 'week' || mode === 'day') && scrollRef.current) {
      const now  = new Date()
      const top  = Math.max(0, (now.getHours() - 1.5) * CELL_H)
      scrollRef.current.scrollTop = top
    }
  }, [mode])

  // ── Data ──────────────────────────────────────────────────────────────────
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
        const ds = new Date(currentDate); ds.setHours(0, 0, 0, 0)
        from = ds.toISOString(); to = addDays(ds, 1).toISOString()
      }
      const { data } = await supabase.from('time_blocks').select('*')
        .gte('start_time', from).lt('start_time', to).order('start_time')
      setBlocks((data as TimeBlock[]) || [])
    } catch (_) {}
  }, [mode, currentDate])

  useEffect(() => { loadBlocks() }, [loadBlocks])
  useRealtimeSync('time_blocks', loadBlocks)

  // ── Global drag ────────────────────────────────────────────────────────────
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return
      const { colEl, date, anchorMin } = dragRef.current
      const rect   = colEl.getBoundingClientRect()
      const curMin = pxToMin(e.clientY - rect.top)
      const s      = Math.min(anchorMin, curMin)
      const en     = Math.max(anchorMin, curMin) + 15
      const preview: DragPreview = { date, startMin: s, endMin: Math.min(en, 23 * 60 + 45) }
      dragPreviewRef.current = preview
      setDragPreview(preview)
    }
    function onUp() {
      if (!dragRef.current) return
      const preview = dragPreviewRef.current
      dragRef.current      = null
      dragPreviewRef.current = null
      setDragPreview(null)
      if (preview && preview.endMin > preview.startMin) {
        setForm({
          ...defaultForm,
          date:      dateStr(preview.date),
          startHour: Math.floor(preview.startMin / 60),
          startMin:  preview.startMin % 60,
          endHour:   Math.floor(preview.endMin / 60),
          endMin:    preview.endMin % 60,
        })
        setShowForm(true)
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [])

  // ── Navigate ───────────────────────────────────────────────────────────────
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

  // ── Save ───────────────────────────────────────────────────────────────────
  async function saveBlock() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const startTime = new Date(`${form.date}T${pad(form.startHour)}:${pad(form.startMin)}:00`).toISOString()
      const endTime   = new Date(`${form.date}T${pad(form.endHour)}:${pad(form.endMin)}:00`).toISOString()
      const cat = CATEGORIES.find(c => c.label === form.category)
      await supabase.from('time_blocks').insert({
        title: form.title, category: form.category,
        start_time: startTime, end_time: endTime,
        color: cat?.color || '#de6690',
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

  // ── Month View ────────────────────────────────────────────────────────────
  const renderMonth = () => {
    const grid = buildMonthGrid(currentDate)
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-black/[0.06] dark:border-white/[0.05]">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-[11px] font-medium tracking-wide select-none
                ${i === 0 || i === 6 ? 'text-mauve-400' : 'text-mauve-400'}`}
            >
              {d.toUpperCase()}
            </div>
          ))}
        </div>
        {/* Grid cells */}
        <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
          {grid.map((day, i) => {
            const isToday        = isSameDay(day, today)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isWeekend      = day.getDay() === 0 || day.getDay() === 6
            const dayBlocks      = blocksForDay(day)
            return (
              <div
                key={i}
                onClick={() => { setCurrentDate(day); setMode('day') }}
                className={`
                  relative border-b border-r border-black/[0.05] dark:border-white/[0.04]
                  cursor-pointer overflow-hidden transition-colors
                  hover:bg-blush-50/60 dark:hover:bg-white/[0.02]
                  ${isWeekend && isCurrentMonth ? 'bg-black/[0.012] dark:bg-white/[0.015]' : ''}
                  ${!isCurrentMonth ? 'bg-transparent' : ''}
                `}
              >
                {/* Day number — top right, Apple-style */}
                <div className="flex justify-center pt-1 pb-0.5">
                  <span className={`
                    w-7 h-7 flex items-center justify-center rounded-full text-[13px] select-none transition-colors
                    ${isToday
                      ? 'bg-blush-500 text-white font-semibold'
                      : isCurrentMonth
                        ? 'text-plum-800 dark:text-mauve-100 font-normal'
                        : 'text-mauve-300 dark:text-mauve-600 font-normal'}
                  `}>
                    {day.getDate()}
                  </span>
                </div>
                {/* Events */}
                <div className="px-1 space-y-0.5 pb-1">
                  {dayBlocks.slice(0, 3).map(b => (
                    <div
                      key={b.id}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-white text-[11px] leading-tight truncate"
                      style={{ backgroundColor: b.color }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="truncate font-medium">{b.title}</span>
                    </div>
                  ))}
                  {dayBlocks.length > 3 && (
                    <p className="text-[10px] text-mauve-400 pl-1.5">+{dayBlocks.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Time grid (shared week/day) ────────────────────────────────────────────
  const renderTimeGrid = (days: Date[]) => {
    const now        = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const nowTop     = nowMinutes / 60 * CELL_H
    const isCurrentPeriod = days.some(d => isSameDay(d, today))
    const colCount   = days.length

    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* ── Column headers ── */}
        <div
          className="flex-shrink-0 border-b border-black/[0.06] dark:border-white/[0.05] bg-white dark:bg-mauve-800"
          style={{ display: 'grid', gridTemplateColumns: `52px repeat(${colCount}, 1fr)` }}
        >
          {/* Time-column spacer */}
          <div className="border-r border-black/[0.05] dark:border-white/[0.04]" />
          {days.map((day, i) => {
            const isToday   = isSameDay(day, today)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            return (
              <div
                key={i}
                className={`py-2 text-center border-r border-black/[0.05] dark:border-white/[0.04] last:border-r-0
                  ${isWeekend ? 'bg-black/[0.01] dark:bg-white/[0.01]' : ''}`}
              >
                <p className={`text-[11px] font-medium tracking-wide uppercase mb-0.5
                  ${isToday ? 'text-blush-500' : 'text-mauve-400'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <div
                  className={`
                    w-9 h-9 mx-auto flex items-center justify-center rounded-full
                    text-[22px] font-light leading-none cursor-pointer transition-colors
                    ${isToday
                      ? 'bg-blush-500 text-white font-semibold text-[18px]'
                      : 'text-plum-800 dark:text-mauve-100 hover:bg-blush-50 dark:hover:bg-mauve-700'}
                  `}
                  onClick={() => { setCurrentDate(day); setMode('day') }}
                >
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── All-day row ── */}
        <div
          className="flex-shrink-0 border-b border-black/[0.06] dark:border-white/[0.05] bg-white dark:bg-mauve-800"
          style={{ display: 'grid', gridTemplateColumns: `52px repeat(${colCount}, 1fr)` }}
        >
          <div className="border-r border-black/[0.05] dark:border-white/[0.04] flex items-center justify-end pr-2 py-1">
            <span className="text-[9px] text-mauve-400 uppercase tracking-wide select-none">all-day</span>
          </div>
          {days.map((_, i) => (
            <div key={i} className="min-h-[22px] border-r border-black/[0.05] dark:border-white/[0.04] last:border-r-0" />
          ))}
        </div>

        {/* ── Scrollable time grid ── */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div
            className={dragPreview ? 'select-none' : ''}
            style={{ display: 'grid', gridTemplateColumns: `52px repeat(${colCount}, 1fr)`, height: `${HOURS.length * CELL_H}px`, position: 'relative' }}
          >
            {/* Hour labels */}
            <div className="border-r border-black/[0.05] dark:border-white/[0.04]">
              {HOURS.map(h => (
                <div key={h} className="flex items-start justify-end pr-2" style={{ height: `${CELL_H}px` }}>
                  {h > 0 && (
                    <span className="text-[11px] text-mauve-400 select-none -mt-2.5 tabular-nums">
                      {hourLabel(h)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, di) => {
              const isToday   = isSameDay(day, today)
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const dayBlocks = blocksForDay(day)
              const preview   = dragPreview && isSameDay(dragPreview.date, day) ? dragPreview : null

              return (
                <div
                  key={di}
                  className={`relative border-r border-black/[0.05] dark:border-white/[0.04] last:border-r-0 cursor-crosshair select-none
                    ${isToday   ? 'bg-blush-50/30 dark:bg-blush-900/10' : ''}
                    ${isWeekend && !isToday ? 'bg-black/[0.012] dark:bg-white/[0.01]' : ''}
                  `}
                  style={{ height: `${HOURS.length * CELL_H}px` }}
                  onMouseDown={e => {
                    if ((e.target as HTMLElement).closest('[data-event]')) return
                    e.preventDefault()
                    const rect      = e.currentTarget.getBoundingClientRect()
                    const anchorMin = pxToMin(e.clientY - rect.top)
                    dragRef.current = { date: day, colEl: e.currentTarget, anchorMin }
                    const p: DragPreview = { date: day, startMin: anchorMin, endMin: anchorMin + 15 }
                    dragPreviewRef.current = p
                    setDragPreview(p)
                  }}
                >
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute w-full border-t border-black/[0.06] dark:border-white/[0.04]"
                      style={{ top: `${h * CELL_H}px` }}
                    />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.map(h => (
                    <div
                      key={`h${h}`}
                      className="absolute w-full border-t border-black/[0.03] dark:border-white/[0.025]"
                      style={{ top: `${h * CELL_H + CELL_H / 2}px` }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {isToday && isCurrentPeriod && (
                    <div
                      className="absolute w-full z-20 pointer-events-none flex items-center"
                      style={{ top: `${nowTop}px` }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full bg-blush-500 flex-shrink-0 shadow-sm"
                        style={{ marginLeft: '-4px' }}
                      />
                      <div className="flex-1 h-[1.5px] bg-blush-500" />
                    </div>
                  )}

                  {/* Drag ghost */}
                  {preview && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded-lg pointer-events-none z-10 border border-blush-400"
                      style={{
                        top:    `${preview.startMin / 60 * CELL_H}px`,
                        height: `${Math.max((preview.endMin - preview.startMin) / 60 * CELL_H, 15)}px`,
                        backgroundColor: 'rgba(222, 102, 144, 0.15)',
                      }}
                    >
                      <span className="text-[10px] font-semibold text-blush-600 dark:text-blush-300 px-1.5 pt-0.5 block leading-tight">
                        {formatTime(Math.floor(preview.startMin / 60), preview.startMin % 60)}
                        {' – '}
                        {formatTime(Math.floor(preview.endMin / 60), preview.endMin % 60)}
                      </span>
                    </div>
                  )}

                  {/* Events */}
                  {dayBlocks.map(block => {
                    const st     = new Date(block.start_time)
                    const et     = new Date(block.end_time)
                    const topPx  = (st.getHours() * 60 + st.getMinutes()) / 60 * CELL_H
                    const durMin = (et.getTime() - st.getTime()) / 60000
                    const hPx    = Math.max(durMin / 60 * CELL_H, 22)
                    return (
                      <div
                        key={block.id}
                        data-event="1"
                        className="absolute left-px right-px rounded-xl overflow-hidden cursor-pointer group"
                        style={{ top: `${topPx + 1}px`, height: `${hPx - 2}px`, backgroundColor: block.color, zIndex: 5 }}
                      >
                        <div className="px-2 py-1 h-full flex flex-col justify-start">
                          <p className="text-[11px] font-semibold text-white leading-tight truncate">{block.title}</p>
                          {hPx > 30 && (
                            <p className="text-[10px] text-white/75 leading-tight mt-0.5">
                              {formatTime(st.getHours(), st.getMinutes())} – {formatTime(et.getHours(), et.getMinutes())}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); deleteBlock(block.id) }}
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-black/25 rounded-md p-0.5 transition-opacity"
                        >
                          <X size={10} className="text-white" />
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

  const renderWeek = () => renderTimeGrid(Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i)))
  const renderDay  = () => { const d = new Date(currentDate); d.setHours(0,0,0,0); return renderTimeGrid([d]) }

  // ── Shell ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)]">
      {/* Toolbar — Apple Calendar layout */}
      <div className="flex items-center gap-1.5 mb-3 flex-shrink-0 flex-wrap">
        {/* Add button */}
        <button
          onClick={() => { setForm(defaultForm); setShowForm(true) }}
          className="w-7 h-7 flex items-center justify-center bg-blush-500 hover:bg-blush-600 text-white rounded-full shadow-sm transition-colors mr-1"
          title="New event"
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>

        {/* Today */}
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-mauve-500 dark:text-mauve-400 hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors"
        >
          Today
        </button>

        {/* Prev / Next */}
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-blush-100 dark:hover:bg-mauve-700 text-mauve-400 transition-colors">
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-blush-100 dark:hover:bg-mauve-700 text-mauve-400 transition-colors">
          <ChevronRight size={16} strokeWidth={2} />
        </button>

        {/* Title */}
        <h2 className="font-semibold text-[16px] text-plum-800 dark:text-mauve-100 flex-1 ml-1 tracking-tight">
          {getTitle()}
        </h2>

        {/* Segmented control */}
        <div className="flex rounded-xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] text-[12px] font-medium bg-white dark:bg-mauve-800">
          {(['day', 'week', 'month'] as CalMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3.5 py-1.5 capitalize transition-all ${
                mode === m
                  ? 'bg-blush-500 text-white'
                  : 'text-mauve-400 hover:bg-blush-50 dark:hover:bg-mauve-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 min-h-0 bg-white dark:bg-mauve-800 rounded-2xl shadow-card border border-black/[0.05] dark:border-white/[0.05] overflow-hidden flex flex-col">
        {mode === 'month' && renderMonth()}
        {mode === 'week'  && renderWeek()}
        {mode === 'day'   && renderDay()}
      </div>

      {/* Add Event modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-mauve-800 rounded-3xl shadow-modal w-full max-w-md border border-black/[0.05] dark:border-white/[0.05]">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
              <h3 className="font-semibold text-[15px] text-plum-800 dark:text-mauve-100 tracking-tight">New Event</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400 transition-colors">
                <X size={17} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Title</label>
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
                  <label className="field-label"><Clock size={10} className="inline mr-1" />Start</label>
                  <select
                    className="input-field"
                    value={form.startHour * 60 + form.startMin}
                    onChange={e => {
                      const val    = +e.target.value
                      const endVal = form.endHour * 60 + form.endMin
                      setForm(f => ({
                        ...f,
                        startHour: Math.floor(val / 60),
                        startMin:  val % 60,
                        endHour:   endVal <= val ? Math.floor((val + 60) / 60) : f.endHour,
                        endMin:    endVal <= val ? (val + 60) % 60 : f.endMin,
                      }))
                    }}
                  >
                    {TIME_SLOTS.filter(t => t.value < 23 * 60 + 30).map(t =>
                      <option key={t.value} value={t.value}>{t.label}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="field-label">End</label>
                  <select
                    className="input-field"
                    value={form.endHour * 60 + form.endMin}
                    onChange={e => {
                      const val = +e.target.value
                      setForm(f => ({ ...f, endHour: Math.floor(val / 60), endMin: val % 60 }))
                    }}
                  >
                    {TIME_SLOTS.filter(t => t.value > form.startHour * 60 + form.startMin).map(t =>
                      <option key={t.value} value={t.value}>{t.label}</option>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label"><Repeat size={10} className="inline mr-1" />Repeat Until</label>
                <input type="date" className="input-field" value={form.repeatUntil} onChange={e => setForm(f => ({ ...f, repeatUntil: e.target.value }))} />
                <p className="text-[11px] text-mauve-400 mt-1">Repeats daily through end of year by default</p>
              </div>
            </div>
            <div className="flex gap-2.5 px-6 pb-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.1] text-mauve-400 text-[13px] font-medium hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors">Cancel</button>
              <button onClick={saveBlock} disabled={saving || !form.title.trim()} className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors shadow-sm">
                {saving ? 'Saving…' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
