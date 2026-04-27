import { useEffect, useState, useRef, useCallback } from 'react'
import {
  CheckCircle2,
  Circle,
  Calendar,
  Flame,
  Star,
  ArrowRight,
  Sparkles,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { PetalCluster } from '@/components/ui/Petal'
import type { Todo, Habit, HabitCompletion, TimeBlock } from '@/lib/types'

/* ── Mini donut chart ────────────────────────────────────────────────────────── */
function MiniDonut({ value, max, color, size = 36 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-black/[0.06] dark:text-white/[0.08]" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-all duration-700" />
    </svg>
  )
}

/* ── Stat card ───────────────────────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, donut,
}: {
  label: string; value: string | number; sub?: string; icon: React.ElementType
  donut: { value: number; max: number; color: string }
}) {
  return (
    <div className="bg-white dark:bg-ink-800 rounded-2xl p-4 border border-linen-200 dark:border-ink-700 flex items-center gap-4 card-hover dark:card-glow transition-all duration-200 hover:shadow-card-md hover:-translate-y-px">
      <div className="relative flex-shrink-0">
        <MiniDonut {...donut} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={14} style={{ color: donut.color }} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-linen-500 dark:text-ink-300 font-medium">{label}</p>
        <p className="text-xl font-bold text-plum-800 dark:text-mauve-100 leading-tight">{value}</p>
        {sub && <p className="text-xs text-linen-500 dark:text-ink-300 truncate">{sub}</p>}
      </div>
    </div>
  )
}

/* ── Skeleton loaders ────────────────────────────────────────────────────────── */
function SkeletonHero() {
  return (
    <div className="rounded-3xl p-6 bg-linen-200 dark:bg-ink-700 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-7 w-48 rounded" />
          <div className="skeleton h-4 w-36 rounded" />
        </div>
        <div className="skeleton h-12 w-16 rounded-lg" />
      </div>
      <div className="mt-5 skeleton h-2 w-full rounded-full" />
    </div>
  )
}

function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-ink-800 rounded-2xl border border-linen-200 dark:border-ink-700 overflow-hidden">
      <div className="section-header">
        <div className="skeleton h-4 w-28 rounded" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
            <div className="skeleton w-5 h-5 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-3/4 rounded" />
              <div className="skeleton h-2.5 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function fmtTime(iso: string) {
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${dh}:${String(m).padStart(2, '0')} ${ampm}`
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function DailyBrief() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [todayBlocks, setTodayBlocks] = useState<TimeBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Pull-to-refresh state
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pullY, setPullY] = useState(0)
  const [pulling, setPulling] = useState(false)
  const touchStartRef = useRef(0)

  const todayStr = new Date().toISOString().split('T')[0]

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const loadData = useCallback(async () => {
    try {
      const todayStrLocal = new Date().toISOString().split('T')[0]
      const [{ data: todosData }, { data: habitsData }, { data: completionsData }, { data: blocksData }] =
        await Promise.all([
          supabase.from('todos').select('*').eq('completed', false).order('due_date', { ascending: true }).limit(5),
          supabase.from('habits').select('*').order('order_index'),
          supabase.from('habit_completions').select('*').eq('completed_date', todayStrLocal),
          supabase.from('time_blocks').select('*').gte('start_time', todayStrLocal + 'T00:00:00').lt('start_time', todayStrLocal + 'T23:59:59').order('start_time'),
        ])
      setTodos((todosData as Todo[]) || [])
      setHabits((habitsData as Habit[]) || [])
      setCompletions((completionsData as HabitCompletion[]) || [])
      setTodayBlocks((blocksData as TimeBlock[]) || [])
    } catch (_) {}
  }, [])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [loadData])

  useRealtimeSync('todos', loadData)
  useRealtimeSync('habits', loadData)
  useRealtimeSync('habit_completions', loadData)

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current
    if (el && el.scrollTop <= 0) {
      touchStartRef.current = e.touches[0].clientY
      setPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return
    const diff = Math.max(0, (e.touches[0].clientY - touchStartRef.current) * 0.4)
    setPullY(Math.min(diff, 80))
  }, [pulling])

  const handleTouchEnd = useCallback(async () => {
    if (pullY > 50) {
      setRefreshing(true)
      await loadData()
      setRefreshing(false)
    }
    setPullY(0)
    setPulling(false)
  }, [pullY, loadData])

  const completedHabitsToday = completions.length
  const totalHabits = habits.length

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const toggleHabit = async (habitId: string) => {
    const existing = completions.find(c => c.habit_id === habitId)
    if (existing) {
      await supabase.from('habit_completions').delete().eq('id', existing.id)
      setCompletions(prev => prev.filter(c => c.id !== existing.id))
    } else {
      const { data } = await supabase
        .from('habit_completions')
        .insert({ habit_id: habitId, completed_date: todayStr })
        .select()
        .single()
      if (data) setCompletions(prev => [...prev, data as HabitCompletion])
    }
  }

  const toggleTodo = async (todo: Todo) => {
    await supabase.from('todos').update({ completed: true, updated_at: new Date().toISOString() }).eq('id', todo.id)
    setTodos(prev => prev.filter(t => t.id !== todo.id))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SkeletonHero />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <SkeletonList />
          <SkeletonList />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div className="flex justify-center pb-3" style={{ height: refreshing ? 40 : pullY * 0.5 }}>
          <RefreshCw
            size={18}
            className={`text-blush-400 transition-transform ${refreshing ? 'animate-pull-spin' : ''}`}
            style={{ transform: refreshing ? undefined : `rotate(${pullY * 3}deg)`, opacity: Math.min(pullY / 50, 1) }}
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero greeting — flat blush surface with petal flourish */}
        <div className="bg-blush-500 dark:bg-blush-700 rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
          <PetalCluster size={180} opacity={0.1} className="absolute -top-8 -right-8 text-white" />

          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={18} className="opacity-80" />
                <span className="text-sm font-medium opacity-80">Daily Brief</span>
              </div>
              <h2 className="text-2xl font-bold mb-1">{greeting()}, Ella!</h2>
              <p className="text-sm opacity-80">{todayFormatted}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{completedHabitsToday}/{totalHabits}</div>
              <div className="text-xs opacity-80">habits today</div>
            </div>
          </div>

          {/* Habit progress bar */}
          {totalHabits > 0 && (
            <div className="relative mt-4">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/70 rounded-full transition-all duration-500"
                  style={{ width: `${(completedHabitsToday / totalHabits) * 100}%` }}
                />
              </div>
              <p className="text-xs mt-1 opacity-70">
                {completedHabitsToday === totalHabits
                  ? 'All habits done! Great work today!'
                  : `${totalHabits - completedHabitsToday} habit${totalHabits - completedHabitsToday !== 1 ? 's' : ''} remaining`}
              </p>
            </div>
          )}
        </div>

        {/* Stats grid with micro-charts */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Tasks Today"
            value={todos.length}
            sub="open items"
            icon={CheckCircle2}
            donut={{ value: todos.filter(t => t.completed).length, max: Math.max(todos.length, 1), color: '#de6690' }}
          />
          <StatCard
            label="Habit Streak"
            value={`${completedHabitsToday}/${totalHabits}`}
            sub="done today"
            icon={Flame}
            donut={{ value: completedHabitsToday, max: Math.max(totalHabits, 1), color: '#e84a72' }}
          />
        </div>

        {/* Two-column panel */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Today's habits */}
          <div className="bg-white dark:bg-ink-800 rounded-2xl border border-linen-200 dark:border-ink-700 overflow-hidden dark:card-glow">
            <div className="section-header">
              <div className="section-title">
                <Flame size={16} className="text-orange-500" />
                <h3 className="font-semibold text-plum-800 dark:text-mauve-100 text-sm">Today's Habits</h3>
              </div>
              <span className="section-count">{completedHabitsToday}/{totalHabits}</span>
            </div>
            <div className="p-4 space-y-1.5">
              {habits.length === 0 ? (
                <div className="empty-state py-8">
                  <div className="empty-state-icon mx-auto w-12 h-12">
                    <Flame size={20} className="text-orange-400" />
                  </div>
                  <p className="empty-state-desc">No habits yet — add some in the Habits section</p>
                </div>
              ) : (
                habits.map(habit => {
                  const done = completions.some(c => c.habit_id === habit.id)
                  return (
                    <button
                      key={habit.id}
                      onClick={() => toggleHabit(habit.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 ${
                        done
                          ? 'bg-blush-50 dark:bg-blush-900/20'
                          : 'hover:bg-linen-100 dark:hover:bg-ink-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                          done ? 'border-blush-500 bg-blush-500 animate-check-pop' : 'border-mauve-300 dark:border-mauve-500'
                        }`}
                      >
                        {done && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span
                        className={`text-sm font-medium transition-all ${
                          done
                            ? 'text-linen-500 dark:text-ink-300 line-through'
                            : 'text-plum-800 dark:text-mauve-100'
                        }`}
                      >
                        {habit.name}
                      </span>
                      <div
                        className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: habit.color }}
                      />
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Priority todos */}
          <div className="bg-white dark:bg-ink-800 rounded-2xl border border-linen-200 dark:border-ink-700 overflow-hidden dark:card-glow">
            <div className="section-header">
              <div className="section-title">
                <Star size={16} className="text-amber-500" />
                <h3 className="font-semibold text-plum-800 dark:text-mauve-100 text-sm">Top Priorities</h3>
              </div>
              <span className="section-count">{todos.length} task{todos.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="p-4 space-y-1.5">
              {todos.length === 0 ? (
                <div className="empty-state py-8">
                  <div className="empty-state-icon mx-auto w-12 h-12">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  </div>
                  <p className="empty-state-title">All caught up!</p>
                  <p className="empty-state-desc">No open tasks right now</p>
                </div>
              ) : (
                todos.slice(0, 5).map(todo => {
                  const priorityColors: Record<string, string> = {
                    high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    low: 'bg-blush-100 text-blush-600 dark:bg-blush-900/30 dark:text-blush-400',
                  }
                  return (
                    <div
                      key={todo.id}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-linen-100 dark:hover:bg-ink-700 group transition-colors"
                    >
                      <button
                        onClick={() => toggleTodo(todo)}
                        className="mt-0.5 flex-shrink-0 text-linen-500 dark:text-ink-300 hover:text-blush-500 transition-colors"
                      >
                        <Circle size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-plum-800 dark:text-mauve-100 truncate">{todo.title}</p>
                        {todo.due_date && (
                          <p className="text-xs text-linen-500 dark:text-ink-300 flex items-center gap-1 mt-0.5">
                            <Calendar size={11} />
                            {new Date(todo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${priorityColors[todo.priority]}`}>
                        {todo.priority}
                      </span>
                    </div>
                  )
                })
              )}
              {todos.length > 5 && (
                <button className="w-full text-xs text-blush-500 hover:text-blush-600 flex items-center justify-center gap-1 py-2">
                  View all {todos.length} tasks <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        {todayBlocks.length > 0 && (
          <div className="bg-white dark:bg-ink-800 rounded-2xl border border-linen-200 dark:border-ink-700 overflow-hidden dark:card-glow">
            <div className="section-header">
              <div className="section-title">
                <Clock size={16} className="text-blush-500" />
                <h3 className="font-semibold text-plum-800 dark:text-mauve-100 text-sm">Today's Schedule</h3>
              </div>
              <span className="section-count">{todayBlocks.length} event{todayBlocks.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-linen-200 dark:divide-ink-700/50">
              {todayBlocks.map(block => (
                <div key={block.id} className="flex items-center gap-3 px-5 py-3 hover:bg-linen-50 dark:hover:bg-ink-700/40 transition-colors">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: block.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-plum-800 dark:text-mauve-100 truncate">{block.title}</p>
                    <p className="text-xs text-linen-500 dark:text-ink-300 mt-0.5">
                      {fmtTime(block.start_time)} – {fmtTime(block.end_time)}
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{ backgroundColor: block.color + '22', color: block.color }}>
                    {block.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
