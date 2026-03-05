import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Calendar,
  Flame,
  Star,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { Todo, Habit, HabitCompletion } from '@/lib/types'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white dark:bg-mauve-800 rounded-2xl p-4 border border-blush-100 dark:border-mauve-700 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-mauve-400 dark:text-mauve-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-plum-800 dark:text-mauve-100 leading-tight">{value}</p>
        {sub && <p className="text-xs text-mauve-400 dark:text-mauve-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}

export default function DailyBrief() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [loading, setLoading] = useState(true)

  const todayStr = new Date().toISOString().split('T')[0]

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  useEffect(() => {
    async function load() {
      try {
        const [{ data: todosData }, { data: habitsData }, { data: completionsData }] =
          await Promise.all([
            supabase.from('todos').select('*').eq('completed', false).order('due_date', { ascending: true }).limit(5),
            supabase.from('habits').select('*').order('order_index'),
            supabase.from('habit_completions').select('*').eq('completed_date', todayStr),
          ])
        setTodos((todosData as Todo[]) || [])
        setHabits((habitsData as Habit[]) || [])
        setCompletions((completionsData as HabitCompletion[]) || [])
      } catch (_) {
        // Supabase not configured yet — show placeholder UI
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [todayStr])

  const refreshBrief = () => { void (async () => {
    try {
      const todayStrLocal = new Date().toISOString().split('T')[0]
      const [{ data: todosData }, { data: habitsData }, { data: completionsData }] =
        await Promise.all([
          supabase.from('todos').select('*').eq('completed', false).order('due_date', { ascending: true }).limit(5),
          supabase.from('habits').select('*').order('order_index'),
          supabase.from('habit_completions').select('*').eq('completed_date', todayStrLocal),
        ])
      setTodos((todosData as Todo[]) || [])
      setHabits((habitsData as Habit[]) || [])
      setCompletions((completionsData as HabitCompletion[]) || [])
    } catch (_) {}
  })() }

  useRealtimeSync('todos', refreshBrief)
  useRealtimeSync('habits', refreshBrief)
  useRealtimeSync('habit_completions', refreshBrief)

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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero greeting */}
      <div className="bg-gradient-to-br from-blush-400 to-blush-600 dark:from-blush-600 dark:to-plum-600 rounded-3xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
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
          <div className="mt-4">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
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

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Tasks Today"
          value={todos.length}
          sub="open items"
          icon={CheckCircle2}
          color="bg-blush-500"
        />
        <StatCard
          label="Habit Streak"
          value={`${completedHabitsToday}/${totalHabits}`}
          sub="done today"
          icon={Flame}
          color="bg-rose-600"
        />
      </div>

      {/* Two-column panel */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Today's habits */}
        <div className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-blush-100 dark:border-mauve-700">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-blush-500" />
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100 text-sm">Today's Habits</h3>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {habits.length === 0 ? (
              <p className="text-sm text-mauve-400 text-center py-4">
                No habits yet — add some in the Habits section
              </p>
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
                        : 'hover:bg-blush-50 dark:hover:bg-mauve-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                        done ? 'border-blush-500 bg-blush-500' : 'border-mauve-300 dark:border-mauve-500'
                      }`}
                    >
                      {done && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        done
                          ? 'text-mauve-400 line-through'
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
        <div className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-blush-100 dark:border-mauve-700">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-blush-500" />
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100 text-sm">Top Priorities</h3>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {todos.length === 0 ? (
              <p className="text-sm text-mauve-400 text-center py-4">
                All caught up! No open tasks.
              </p>
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
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-blush-50 dark:hover:bg-mauve-700 group"
                  >
                    <button
                      onClick={() => toggleTodo(todo)}
                      className="mt-0.5 flex-shrink-0 text-mauve-300 hover:text-blush-500 transition-colors"
                    >
                      <Circle size={16} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-plum-800 dark:text-mauve-100 truncate">{todo.title}</p>
                      {todo.due_date && (
                        <p className="text-xs text-mauve-400 flex items-center gap-1 mt-0.5">
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
    </div>
  )
}
