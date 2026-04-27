import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Clock, Repeat, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { pushToGoogle, type CalendarSubscription } from '@/lib/calendarSync'
import { GoogleConnectCard } from './GoogleConnectCard'
import { CalendarSidebar } from './CalendarSidebar'
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

const REPEAT_OPTIONS = [
  { value: 'none',     label: 'Does not repeat' },
  { value: 'daily',    label: 'Every day' },
  { value: 'weekly',   label: 'Every week' },
  { value: 'weekdays', label: 'Every weekday (Mon–Fri)' },
  { value: 'weekends', label: 'Every weekend (Sat–Sun)' },
]

const HOURS       = Array.from({ length: 24 }, (_, i) => i)
const CELL_H      = 56
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

function pxToMin(py: number): number {
  const raw = Math.round(py / CELL_H * 60 / 15) * 15
  return Math.max(0, Math.min(raw, 23 * 60 + 45))
}

function buildMonthGrid(date: Date): Date[] {
  const s = startOfMonth(date)
  return Array.from({ length: 42 }, (_, i) => addDays(addDays(s, -s.getDay()), i))
}

const TIME_SLOTS = (() => {
  const slots: { value: number; label: string }[] = []
  for (let m = 0; m <= 23 * 60 + 45; m += 15) {
    slots.push({ value: m, label: formatTime(Math.floor(m / 60), m % 60) })
  }
  return slots
})()

/** Returns all dates for a repeat series starting at `startDate` up to `until`. */
function getRepeatDates(startDate: string, until: string, freq: string): Date[] {
  if (freq === 'none') return [new Date(startDate)]
  const start = new Date(startDate)
  const end   = new Date(until)
  const dates: Date[] = []
  let cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (
      freq === 'daily' ||
      freq === 'weekly' ||
      (freq === 'weekdays' && dow >= 1 && dow <= 5) ||
      (freq === 'weekends' && (dow === 0 || dow === 6))
    ) {
      dates.push(new Date(cur))
    }
    cur.setDate(cur.getDate() + (freq === 'weekly' ? 7 : 1))
  }
  return dates
}

// ─── Form ─────────────────────────────────────────────────────────────────────
interface BlockForm {
  title: string; category: string; date: string
  startHour: number; startMin: number; endHour: number; endMin: number
  repeatFreq: string; repeatUntil: string
}

const eoyDate = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
const defaultForm: BlockForm = {
  title: '', category: 'Work', date: dateStr(new Date()),
  startHour: 9, startMin: 0, endHour: 10, endMin: 0,
  repeatFreq: 'none', repeatUntil: eoyDate,
}

// ─── Drag (create new) ───────────────────────────────────────────────────────
interface DragRef     { date: Date; colEl: HTMLElement; anchorMin: number }
interface DragPreview { date: Date; startMin: number; endMin: number }

// ─── Drag (move existing) ────────────────────────────────────────────────────
interface MoveDragRef {
  block: TimeBlock
  durMin: number
  offsetMin: number   // click offset from event top
  originX: number     // initial clientX
  originY: number     // initial clientY
  didMove: boolean
  cols: { el: HTMLElement; date: Date }[]
}
interface MovePreview { blockId: string; date: Date; startMin: number; endMin: number }

// ─── Delete confirm modal ──────────────────────────────────────────────────────
interface DeleteConfirm { blockId: string; repeatId?: string }

// ─── Component ────────────────────────────────────────────────────────────────
export default function CalendarView() {
  const [mode, setMode]               = useState<CalMode>(() => window.innerWidth < 768 ? 'day' : 'week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [blocks, setBlocks]           = useState<TimeBlock[]>([])
  const [showForm, setShowForm]       = useState(false)
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)
  const [form, setForm]               = useState<BlockForm>(defaultForm)
  const [saving, setSaving]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [movePreview, setMovePreview] = useState<MovePreview | null>(null)

  const dragRef          = useRef<DragRef | null>(null)
  const dragPreviewRef   = useRef<DragPreview | null>(null)
  const moveDragRef      = useRef<MoveDragRef | null>(null)
  const movePreviewRef   = useRef<MovePreview | null>(null)
  const scrollRef        = useRef<HTMLDivElement>(null)
  const colRefs          = useRef<Map<string, { el: HTMLElement; date: Date }>>(new Map())
  const blocksRef        = useRef<TimeBlock[]>([])
  useEffect(() => { blocksRef.current = blocks }, [blocks])

  // Calendar subscription visibility (driven by CalendarSidebar). Hidden = events filtered out.
  const [subs, setSubs] = useState<CalendarSubscription[]>([])
  const hiddenCalendars = useMemo(
    () => new Set(subs.filter(s => !s.visible).map(s => s.external_id)),
    [subs],
  )
  const visibleBlocks = useMemo(
    () => blocks.filter(b => !b.calendar_external_id || !hiddenCalendars.has(b.calendar_external_id)),
    [blocks, hiddenCalendars],
  )

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // ── Auto-scroll to current time ────────────────────────────────────────────
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

  // ── Global drag (create + move) ────────────────────────────────────────────
  useEffect(() => {
    function onMove(e: MouseEvent) {
      // ── Move existing event ──
      if (moveDragRef.current) {
        const md = moveDragRef.current
        const dx = e.clientX - md.originX
        const dy = e.clientY - md.originY
        if (!md.didMove && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
        md.didMove = true

        // Find which column the cursor is over
        let bestCol = md.cols[0]
        for (const col of md.cols) {
          const r = col.el.getBoundingClientRect()
          if (e.clientX >= r.left && e.clientX < r.right) { bestCol = col; break }
        }
        const rect     = bestCol.el.getBoundingClientRect()
        const curMin   = pxToMin(e.clientY - rect.top - md.offsetMin)
        const startMin = Math.max(0, Math.min(curMin, 24 * 60 - md.durMin))
        const snapped  = Math.round(startMin / 15) * 15
        const mp: MovePreview = { blockId: md.block.id, date: bestCol.date, startMin: snapped, endMin: snapped + md.durMin }
        movePreviewRef.current = mp
        setMovePreview(mp)
        return
      }

      // ── Create new event drag ──
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

    async function onUp() {
      // ── Finish move ──
      if (moveDragRef.current) {
        const md = moveDragRef.current
        moveDragRef.current = null
        if (!md.didMove) {
          movePreviewRef.current = null
          setMovePreview(null)
          openEdit(md.block)
          return
        }
        const mp = movePreviewRef.current
        movePreviewRef.current = null
        setMovePreview(null)
        if (mp) {
          const newStart = new Date(`${dateStr(mp.date)}T${pad(Math.floor(mp.startMin / 60))}:${pad(mp.startMin % 60)}:00`)
          const newEnd   = new Date(`${dateStr(mp.date)}T${pad(Math.floor(mp.endMin / 60))}:${pad(mp.endMin % 60)}:00`)
          // Optimistic update
          setBlocks(prev => prev.map(b => b.id === mp.blockId ? { ...b, start_time: newStart.toISOString(), end_time: newEnd.toISOString() } : b))
          await supabase.from('time_blocks').update({
            start_time: newStart.toISOString(),
            end_time:   newEnd.toISOString(),
          }).eq('id', mp.blockId)
          // Push update to Google if this event is synced
          const original = blocksRef.current.find(b => b.id === mp.blockId)
          if (original?.external_id) {
            pushToGoogle({
              action: 'update',
              external_id: original.external_id,
              time_block: { ...original, start_time: newStart.toISOString(), end_time: newEnd.toISOString() },
            })
          }
        }
        return
      }

      // ── Finish create ──
      if (!dragRef.current) return
      const preview = dragPreviewRef.current
      dragRef.current      = null
      dragPreviewRef.current = null
      setDragPreview(null)
      if (preview && preview.endMin > preview.startMin) {
        setEditingBlock(null)
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

  // ── Open edit modal ─────────────────────────────────────────────────────────
  function openEdit(block: TimeBlock) {
    const st = new Date(block.start_time)
    const et = new Date(block.end_time)
    setEditingBlock(block)
    setForm({
      title:       block.title,
      category:    block.category,
      date:        dateStr(st),
      startHour:   st.getHours(),
      startMin:    st.getMinutes(),
      endHour:     et.getHours(),
      endMin:      et.getMinutes(),
      repeatFreq:  'none',
      repeatUntil: eoyDate,
    })
    setShowForm(true)
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function saveBlock() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const cat   = CATEGORIES.find(c => c.label === form.category)
      const color = cat?.color || '#de6690'

      if (editingBlock) {
        const startTime = new Date(`${form.date}T${pad(form.startHour)}:${pad(form.startMin)}:00`).toISOString()
        const endTime   = new Date(`${form.date}T${pad(form.endHour)}:${pad(form.endMin)}:00`).toISOString()

        if (form.repeatFreq !== 'none' && !editingBlock.repeat_id) {
          // Convert single event to repeating series
          // Update the original event first
          const repeatId = crypto.randomUUID()
          await supabase.from('time_blocks').update({
            title: form.title, category: form.category, color,
            start_time: startTime, end_time: endTime,
            repeat_id: repeatId, repeat_until: form.repeatUntil,
          }).eq('id', editingBlock.id)
          // Generate additional occurrences (skip the first date — that's the existing event)
          const dates = getRepeatDates(form.date, form.repeatUntil, form.repeatFreq)
          const extraRows = dates.slice(1).map(d => {
            const ds = dateStr(d)
            return {
              title: form.title, category: form.category, color,
              start_time: new Date(`${ds}T${pad(form.startHour)}:${pad(form.startMin)}:00`).toISOString(),
              end_time:   new Date(`${ds}T${pad(form.endHour)}:${pad(form.endMin)}:00`).toISOString(),
              repeat_until: form.repeatUntil,
              repeat_id:    repeatId,
            }
          })
          const BATCH = 500
          for (let i = 0; i < extraRows.length; i += BATCH) {
            await supabase.from('time_blocks').insert(extraRows.slice(i, i + BATCH))
          }
          // Note: recurring series aren't pushed to Google yet (see RRULE TODO).
          // If the source event was synced, delete it from Google to avoid orphan.
          if (editingBlock.external_id) {
            pushToGoogle({ action: 'delete', external_id: editingBlock.external_id })
          }
        } else {
          // Simple update (single event stays single, or editing one occurrence of a series)
          await supabase.from('time_blocks').update({
            title: form.title, category: form.category, color,
            start_time: startTime, end_time: endTime,
          }).eq('id', editingBlock.id)
          // Push to Google: update existing or create if not yet synced
          if (!editingBlock.repeat_id) {
            const updatedTimeBlock = {
              ...editingBlock,
              title: form.title, category: form.category, color,
              start_time: startTime, end_time: endTime,
            }
            if (editingBlock.external_id) {
              pushToGoogle({ action: 'update', external_id: editingBlock.external_id, time_block: updatedTimeBlock })
            } else {
              pushToGoogle({ action: 'create', time_block: updatedTimeBlock })
            }
          }
        }
      } else {
        // New event — generate occurrences
        const dates     = getRepeatDates(form.date, form.repeatUntil, form.repeatFreq)
        const repeatId  = dates.length > 1 ? crypto.randomUUID() : undefined
        const rows = dates.map(d => {
          const ds = dateStr(d)
          return {
            title:        form.title,
            category:     form.category,
            color,
            start_time:   new Date(`${ds}T${pad(form.startHour)}:${pad(form.startMin)}:00`).toISOString(),
            end_time:     new Date(`${ds}T${pad(form.endHour)}:${pad(form.endMin)}:00`).toISOString(),
            repeat_until: form.repeatFreq !== 'none' ? form.repeatUntil : null,
            repeat_id:    repeatId ?? null,
          }
        })
        // Batch insert in chunks. For single non-recurring events, capture the
        // inserted row so we can push it to Google with a known id.
        if (rows.length === 1) {
          const { data: inserted } = await supabase
            .from('time_blocks')
            .insert(rows[0])
            .select()
            .single()
          if (inserted) {
            pushToGoogle({ action: 'create', time_block: inserted as TimeBlock })
          }
        } else {
          const BATCH = 500
          for (let i = 0; i < rows.length; i += BATCH) {
            await supabase.from('time_blocks').insert(rows.slice(i, i + BATCH))
          }
          // Recurring series — TODO: translate to Google RRULE for proper sync.
        }
      }

      await loadBlocks()
      setShowForm(false)
      setEditingBlock(null)
      setForm(defaultForm)
    } catch (_) {}
    setSaving(false)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function promptDelete(block: TimeBlock) {
    setDeleteConfirm({ blockId: block.id, repeatId: block.repeat_id })
  }

  async function confirmDelete(deleteAll: boolean) {
    if (!deleteConfirm) return
    if (deleteAll && deleteConfirm.repeatId) {
      // Collect external_ids to delete from Google before removing locally
      const toUnsync = blocksRef.current
        .filter(b => b.repeat_id === deleteConfirm.repeatId && b.external_id)
        .map(b => b.external_id!)
      await supabase.from('time_blocks').delete().eq('repeat_id', deleteConfirm.repeatId)
      setBlocks(prev => prev.filter(b => b.repeat_id !== deleteConfirm.repeatId))
      for (const eid of toUnsync) pushToGoogle({ action: 'delete', external_id: eid })
    } else {
      const target = blocksRef.current.find(b => b.id === deleteConfirm.blockId)
      await supabase.from('time_blocks').delete().eq('id', deleteConfirm.blockId)
      setBlocks(prev => prev.filter(b => b.id !== deleteConfirm.blockId))
      if (target?.external_id) pushToGoogle({ action: 'delete', external_id: target.external_id })
    }
    setDeleteConfirm(null)
    if (showForm) { setShowForm(false); setEditingBlock(null) }
  }

  const blocksForDay = (day: Date) => visibleBlocks.filter(b => isSameDay(new Date(b.start_time), day))

  // ── Month View ────────────────────────────────────────────────────────────
  const renderMonth = () => {
    const grid = buildMonthGrid(currentDate)
    return (
      <div className="flex flex-col flex-1 min-h-0">
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
                <div className="px-1 space-y-0.5 pb-1">
                  {dayBlocks.slice(0, 3).map(b => (
                    <div
                      key={b.id}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-white text-[11px] leading-tight truncate cursor-pointer"
                      style={{ backgroundColor: b.color }}
                      onClick={e => { e.stopPropagation(); openEdit(b) }}
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
        {/* Column headers */}
        <div
          className="flex-shrink-0 border-b border-black/[0.06] dark:border-white/[0.05] bg-white dark:bg-mauve-800"
          style={{ display: 'grid', gridTemplateColumns: `52px repeat(${colCount}, 1fr)` }}
        >
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

        {/* All-day row */}
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

        {/* Scrollable time grid */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div
            className={dragPreview || movePreview ? 'select-none' : ''}
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
                  ref={el => { if (el) colRefs.current.set(dateStr(day), { el, date: day }) }}
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
                        className="w-2.5 h-2.5 rounded-full bg-blush-500 flex-shrink-0 shadow-sm animate-pulse-dot"
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
                    const moving   = movePreview?.blockId === block.id
                    const mp       = moving ? movePreview : null
                    const isOnThisDay = mp ? isSameDay(mp.date, day) : true
                    const st       = mp && isOnThisDay ? (() => { const d = new Date(mp.date); d.setHours(0,0,0,0); d.setMinutes(mp.startMin); return d })() : new Date(block.start_time)
                    const et       = mp && isOnThisDay ? (() => { const d = new Date(mp.date); d.setHours(0,0,0,0); d.setMinutes(mp.endMin); return d })() : new Date(block.end_time)
                    const topPx    = (st.getHours() * 60 + st.getMinutes()) / 60 * CELL_H
                    const durMin   = (et.getTime() - st.getTime()) / 60000
                    const hPx      = Math.max(durMin / 60 * CELL_H, 22)
                    // Hide from original column if being moved to another day
                    if (moving && !isOnThisDay) return null
                    return (
                      <div
                        key={block.id}
                        data-event="1"
                        className={`absolute left-px right-px rounded-xl overflow-hidden cursor-grab active:cursor-grabbing group transition-shadow
                          ${moving ? 'shadow-lg ring-2 ring-blush-400/50 opacity-90 z-30' : ''}`}
                        style={{ top: `${topPx + 1}px`, height: `${hPx - 2}px`, backgroundColor: block.color, zIndex: moving ? 30 : 5 }}
                        onMouseDown={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          const rect      = e.currentTarget.parentElement!.getBoundingClientRect()
                          const eventTop  = topPx + 1
                          const clickY    = e.clientY - rect.top
                          const offsetMin = (clickY - eventTop) / CELL_H * 60
                          const cols = Array.from(colRefs.current.values())
                          moveDragRef.current = {
                            block,
                            durMin: (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / 60000,
                            offsetMin: Math.max(0, offsetMin),
                            originX: e.clientX,
                            originY: e.clientY,
                            didMove: false,
                            cols,
                          }
                        }}
                      >
                        <div className="px-2 py-1 h-full flex flex-col justify-start">
                          <p className="text-[11px] font-semibold text-white leading-tight truncate">{block.title}</p>
                          {hPx > 30 && (
                            <p className="text-[10px] text-white/75 leading-tight mt-0.5">
                              {formatTime(st.getHours(), st.getMinutes())} – {formatTime(et.getHours(), et.getMinutes())}
                            </p>
                          )}
                        </div>
                        {block.repeat_id && (
                          <div className="absolute bottom-0.5 right-1 opacity-60">
                            <Repeat size={8} className="text-white" />
                          </div>
                        )}
                        {!moving && (
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-40 transition-opacity">
                            <GripVertical size={10} className="text-white" />
                          </div>
                        )}
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

  const isEditing = !!editingBlock

  // ── Shell ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)]">
      {/* Google Calendar integration */}
      <div className="mb-3 flex-shrink-0">
        <GoogleConnectCard />
      </div>

      {/* Toolbar (above the side-by-side body) */}
      <div className="flex items-center gap-1.5 mb-3 flex-shrink-0 flex-wrap">
        <button
          onClick={() => { setEditingBlock(null); setForm(defaultForm); setShowForm(true) }}
          className="w-7 h-7 flex items-center justify-center bg-blush-500 hover:bg-blush-600 text-white rounded-full shadow-sm transition-colors mr-1"
          title="New event"
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>

        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-mauve-500 dark:text-mauve-400 hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors"
        >
          Today
        </button>

        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-blush-100 dark:hover:bg-mauve-700 text-mauve-400 transition-colors">
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-blush-100 dark:hover:bg-mauve-700 text-mauve-400 transition-colors">
          <ChevronRight size={16} strokeWidth={2} />
        </button>

        <h2 className="font-semibold text-[16px] text-plum-800 dark:text-mauve-100 flex-1 ml-1 tracking-tight">
          {getTitle()}
        </h2>

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

      {/* Body: sidebar + calendar grid side-by-side on lg, single column otherwise */}
      <div className="flex-1 min-h-0 flex gap-3">
        <CalendarSidebar onChange={setSubs} />
        <div className="flex-1 min-h-0 bg-white dark:bg-ink-800 rounded-2xl shadow-card border border-linen-200 dark:border-ink-700 overflow-hidden flex flex-col">
          {mode === 'month' && renderMonth()}
          {mode === 'week'  && renderWeek()}
          {mode === 'day'   && renderDay()}
        </div>
      </div>

      {/* Add / Edit Event modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
              <h3 className="font-semibold text-[15px] text-plum-800 dark:text-mauve-100 tracking-tight">
                {isEditing ? 'Edit Event' : 'New Event'}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditingBlock(null); setForm(defaultForm) }}
                className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400 transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            {/* Recurring series banner */}
            {isEditing && editingBlock?.repeat_id && (
              <div className="mx-6 mt-4 px-3 py-2 rounded-xl bg-blush-50 dark:bg-blush-900/20 flex items-center gap-2">
                <Repeat size={12} className="text-blush-500 flex-shrink-0" />
                <p className="text-[12px] text-blush-600 dark:text-blush-300">Part of a repeating series — editing this occurrence only</p>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Title</label>
                <input
                  className="input-field"
                  placeholder="Event name…"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
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

              {/* Repeat options — show for new events or single (non-repeating) events being edited */}
              {(!isEditing || (isEditing && !editingBlock?.repeat_id)) && (
                <div className="space-y-3">
                  <div>
                    <label className="field-label"><Repeat size={10} className="inline mr-1" />Repeat</label>
                    <select
                      className="input-field"
                      value={form.repeatFreq}
                      onChange={e => setForm(f => ({ ...f, repeatFreq: e.target.value }))}
                    >
                      {REPEAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {form.repeatFreq !== 'none' && (
                    <div>
                      <label className="field-label">Repeat Until</label>
                      <input
                        type="date"
                        className="input-field"
                        value={form.repeatUntil}
                        min={form.date}
                        onChange={e => setForm(f => ({ ...f, repeatUntil: e.target.value }))}
                      />
                      <p className="text-[11px] text-mauve-400 mt-1">
                        {getRepeatDates(form.date, form.repeatUntil, form.repeatFreq).length} occurrence{getRepeatDates(form.date, form.repeatUntil, form.repeatFreq).length !== 1 ? 's' : ''} will be created
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 space-y-2.5">
              <div className="flex gap-2.5">
                <button
                  onClick={() => { setShowForm(false); setEditingBlock(null); setForm(defaultForm) }}
                  className="flex-1 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.1] text-mauve-400 text-[13px] font-medium hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBlock}
                  disabled={saving || !form.title.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-[13px] font-semibold transition-colors shadow-sm"
                >
                  {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Event'}
                </button>
              </div>

              {/* Delete button — shown only when editing */}
              {isEditing && (
                <button
                  onClick={() => { setShowForm(false); promptDelete(editingBlock!) }}
                  className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-400 text-[13px] font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete Event
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-sm p-6">
            <h3 className="font-semibold text-[15px] text-plum-800 dark:text-mauve-100 mb-1">Delete Event</h3>
            {deleteConfirm.repeatId
              ? <p className="text-[13px] text-mauve-400 mb-5">This is a repeating event. Delete just this occurrence or the entire series?</p>
              : <p className="text-[13px] text-mauve-400 mb-5">Are you sure you want to delete this event?</p>
            }
            <div className="space-y-2">
              {deleteConfirm.repeatId && (
                <button
                  onClick={() => confirmDelete(true)}
                  className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition-colors"
                >
                  Delete All in Series
                </button>
              )}
              <button
                onClick={() => confirmDelete(false)}
                className={`w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                  deleteConfirm.repeatId
                    ? 'border border-red-200 dark:border-red-900/50 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                Delete This Event Only
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="w-full py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.1] text-mauve-400 text-[13px] font-medium hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
