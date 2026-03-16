import { useState, useEffect } from 'react'
import { Plus, X, Flame, CheckCircle2, Circle, Pencil, Trash2, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { Habit, HabitCompletion } from '@/lib/types'

const HABIT_COLORS = ['#e8829a', '#b05070', '#9b7edb', '#6abf8e', '#f0a56a', '#5ba4cf', '#f4afc0', '#d4607a']

const DAYS_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function getLast7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    return d
  })
}

function dateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function getStreak(habitId: string, completions: HabitCompletion[]): number {
  const completedDates = new Set(
    completions.filter(c => c.habit_id === habitId).map(c => c.completed_date)
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (completedDates.has(dateStr(d))) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export default function HabitsView() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#e8829a' })
  const [saving, setSaving] = useState(false)

  const last7 = getLast7Days()
  const todayStr = dateStr(new Date())

  useEffect(() => {
    loadAll()
  }, [])
  useRealtimeSync('habits', loadAll)

  async function loadAll() {
    try {
      const thirtyAgo = new Date()
      thirtyAgo.setDate(thirtyAgo.getDate() - 30)
      const [{ data: h }, { data: c }] = await Promise.all([
        supabase.from('habits').select('*').order('order_index'),
        supabase.from('habit_completions').select('*').gte('completed_date', thirtyAgo.toISOString().split('T')[0]),
      ])
      setHabits((h as Habit[]) || [])
      setCompletions((c as HabitCompletion[]) || [])
    } catch (_) {}
  }

  async function toggleDay(habitId: string, day: string) {
    const existing = completions.find(c => c.habit_id === habitId && c.completed_date === day)
    if (existing) {
      await supabase.from('habit_completions').delete().eq('id', existing.id)
      setCompletions(prev => prev.filter(c => c.id !== existing.id))
    } else {
      const { data } = await supabase
        .from('habit_completions')
        .insert({ habit_id: habitId, completed_date: day })
        .select()
        .single()
      if (data) setCompletions(prev => [...prev, data as HabitCompletion])
    }
  }

  async function saveHabit() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editHabit) {
        const { data } = await supabase
          .from('habits')
          .update({ name: form.name, description: form.description, color: form.color })
          .eq('id', editHabit.id)
          .select()
          .single()
        if (data) setHabits(prev => prev.map(h => h.id === editHabit.id ? data as Habit : h))
      } else {
        const { data } = await supabase
          .from('habits')
          .insert({ name: form.name, description: form.description, color: form.color, order_index: habits.length })
          .select()
          .single()
        if (data) setHabits(prev => [...prev, data as Habit])
      }
      setShowForm(false)
      setEditHabit(null)
      setForm({ name: '', description: '', color: '#e8829a' })
    } catch (_) {}
    setSaving(false)
  }

  async function deleteHabit(id: string) {
    if (!confirm('Delete this habit?')) return
    await supabase.from('habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
    setCompletions(prev => prev.filter(c => c.habit_id !== id))
  }

  function openEdit(h: Habit) {
    setEditHabit(h)
    setForm({ name: h.name, description: h.description || '', color: h.color })
    setShowForm(true)
  }

  const todayCompletedCount = habits.filter(h =>
    completions.some(c => c.habit_id === h.id && c.completed_date === todayStr)
  ).length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header stats — warm orange accent */}
      <div className="relative bg-gradient-to-br from-orange-400 via-amber-500 to-rose-500 dark:from-orange-600 dark:via-amber-600 dark:to-rose-600 rounded-2xl p-5 text-white overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full bg-white/[0.04]" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">Today's Progress</p>
            <p className="text-3xl font-bold mt-1">{todayCompletedCount} / {habits.length}</p>
            <p className="text-sm opacity-70">habits completed</p>
          </div>
          <Flame size={48} className="opacity-20" />
        </div>
        {habits.length > 0 && (
          <div className="relative mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/70 rounded-full transition-all duration-500"
              style={{ width: `${habits.length ? (todayCompletedCount / habits.length) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Habit list with 7-day grid */}
      <div className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden dark:card-glow">
        {/* Header row */}
        <div className="flex items-center px-5 py-3 border-b border-blush-100 dark:border-mauve-700">
          <div className="flex-1">
            <span className="text-xs font-semibold text-plum-800 dark:text-mauve-100">Habit</span>
          </div>
          {/* Desktop: 7-day column headers */}
          <div className="hidden md:flex gap-1 items-center mr-12">
            {last7.map((day, i) => (
              <div
                key={i}
                className={`w-8 text-center text-xs font-medium ${
                  dateStr(day) === todayStr ? 'text-orange-500' : 'text-mauve-400'
                }`}
              >
                <div>{DAYS_LABELS[day.getDay()]}</div>
                <div className="text-[10px]">{day.getDate()}</div>
              </div>
            ))}
          </div>
          {/* Mobile: just "Today" label */}
          <span className="md:hidden text-xs font-medium text-mauve-400 mr-3">Today</span>
          <span className="text-xs font-medium text-mauve-400 w-12 text-center">Streak</span>
        </div>

        {habits.length === 0 ? (
          <div className="empty-state py-12">
            <div className="empty-state-icon">
              <Flame size={24} className="text-orange-400" />
            </div>
            <p className="empty-state-title">No habits tracked yet</p>
            <p className="empty-state-desc">Start building your daily routines</p>
            <button
              onClick={() => { setEditHabit(null); setForm({ name: '', description: '', color: HABIT_COLORS[0] }); setShowForm(true) }}
              className="empty-state-action"
            >
              <Plus size={16} /> Add your first habit
            </button>
          </div>
        ) : (
          habits.map(habit => {
            const streak = getStreak(habit.id, completions)
            return (
              <div
                key={habit.id}
                className="flex items-center px-5 py-3 border-b border-blush-50 dark:border-mauve-700/50 last:border-0 hover:bg-blush-50/50 dark:hover:bg-mauve-700/30 group transition-colors"
              >
                {/* Drag handle — desktop only */}
                <GripVertical size={14} className="hidden md:block text-mauve-300 dark:text-mauve-600 mr-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

                {/* Habit info */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                  <span className="text-sm font-medium text-plum-800 dark:text-mauve-100 truncate">{habit.name}</span>
                </div>

                {/* Desktop: 7-day checkboxes */}
                <div className="hidden md:flex gap-1 items-center mr-3">
                  {last7.map((day, i) => {
                    const ds = dateStr(day)
                    const done = completions.some(c => c.habit_id === habit.id && c.completed_date === ds)
                    const isToday = ds === todayStr
                    return (
                      <button
                        key={i}
                        onClick={() => toggleDay(habit.id, ds)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                          done
                            ? 'text-white animate-check-pop'
                            : isToday
                            ? 'border-2 border-orange-300 dark:border-orange-700 text-mauve-300'
                            : 'text-mauve-200 dark:text-mauve-600 hover:text-mauve-400'
                        }`}
                        style={done ? { backgroundColor: habit.color } : undefined}
                      >
                        {done ? <CheckCircle2 size={16} /> : <Circle size={14} />}
                      </button>
                    )
                  })}
                </div>

                {/* Mobile: today only */}
                {(() => {
                  const done = completions.some(c => c.habit_id === habit.id && c.completed_date === todayStr)
                  return (
                    <button
                      onClick={() => toggleDay(habit.id, todayStr)}
                      className={`md:hidden w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-all duration-200 ${
                        done ? 'text-white animate-check-pop' : 'border-2 border-orange-300 dark:border-orange-700 text-mauve-300'
                      }`}
                      style={done ? { backgroundColor: habit.color } : undefined}
                    >
                      {done ? <CheckCircle2 size={16} /> : <Circle size={14} />}
                    </button>
                  )
                })()}

                {/* Streak */}
                <div className="w-12 flex items-center justify-center gap-1">
                  {streak > 0 && <Flame size={12} className="text-orange-400" />}
                  <span className={`text-sm font-bold ${streak > 0 ? 'text-orange-400' : 'text-mauve-300 dark:text-mauve-500'}`}>
                    {streak}
                  </span>
                </div>

                {/* Actions — desktop hover, mobile always visible */}
                <div className="flex items-center gap-1 ml-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(habit)} className="p-1 rounded hover:bg-blush-100 dark:hover:bg-mauve-600 text-mauve-400">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => deleteHabit(habit.id)} className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/20 text-mauve-400 hover:text-rose-500">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })
        )}

        {/* Add habit button */}
        {habits.length > 0 && (
          <div className="px-5 py-3 border-t border-blush-100 dark:border-mauve-700">
            <button
              onClick={() => { setEditHabit(null); setForm({ name: '', description: '', color: HABIT_COLORS[habits.length % HABIT_COLORS.length] }); setShowForm(true) }}
              className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <Plus size={16} />
              Add new habit
            </button>
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-blush-100 dark:border-mauve-700">
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100">{editHabit ? 'Edit Habit' : 'New Habit'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Habit Name *</label>
                <input className="input-field" placeholder="e.g. Morning workout, Journaling..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="field-label">Description (optional)</label>
                <input className="input-field" placeholder="Details or notes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Color</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {HABIT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className={`w-8 h-8 rounded-full transition-all duration-150 ${form.color === color ? 'scale-110 ring-2 ring-offset-2 ring-blush-400' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-blush-200 dark:border-mauve-600 text-mauve-400 text-sm font-medium hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors">Cancel</button>
              <button onClick={saveHabit} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {saving ? 'Saving...' : editHabit ? 'Save' : 'Add Habit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
