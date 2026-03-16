import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Circle,
  CheckCircle2,
  X,
  Flag,
  Calendar,
  Tag,
  Filter,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { Todo, Priority } from '@/lib/types'

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  medium: { label: 'Medium', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  low: { label: 'Low', color: 'text-blush-600 dark:text-blush-400', bg: 'bg-blush-100 dark:bg-blush-900/20' },
}

type FilterType = 'all' | 'pending' | 'completed' | Priority

/* ── Swipeable todo item ─────────────────────────────────────────────────── */
function TodoItem({
  todo, onToggle, onDelete,
}: {
  todo: Todo; onToggle: (t: Todo) => void; onDelete: (id: string) => void
}) {
  const pc = PRIORITY_CONFIG[todo.priority]
  const overdue = todo.due_date && !todo.completed && new Date(todo.due_date) < new Date()

  const itemRef = useRef<HTMLDivElement>(null)
  const [swipeX, setSwipeX] = useState(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const [swiping, setSwiping] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.touches[0].clientX - touchStartRef.current.x
    const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y)
    if (dy > 20 && !swiping) { touchStartRef.current = null; return }
    if (Math.abs(dx) > 10) setSwiping(true)
    if (swiping) setSwipeX(dx)
  }
  const handleTouchEnd = () => {
    if (swipeX > 80) onToggle(todo)
    else if (swipeX < -80) onDelete(todo.id)
    setSwipeX(0)
    setSwiping(false)
    touchStartRef.current = null
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe backgrounds */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-emerald-500 flex items-center pl-5">
          <CheckCircle2 size={18} className="text-white" />
        </div>
        <div className="flex-1 bg-rose-500 flex items-center justify-end pr-5">
          <Trash2 size={18} className="text-white" />
        </div>
      </div>

      <div
        ref={itemRef}
        className={`relative bg-white dark:bg-mauve-800 border ${
          overdue && !todo.completed
            ? 'border-rose-200 dark:border-rose-800'
            : 'border-blush-100 dark:border-mauve-700'
        } rounded-xl p-4 flex items-start gap-3 group transition-all hover:shadow-card-md hover:-translate-y-px dark:card-glow`}
        style={{ transform: `translateX(${swipeX}px)`, transition: swiping ? 'none' : 'transform 0.3s ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={() => onToggle(todo)}
          className="mt-0.5 flex-shrink-0 transition-all"
        >
          {todo.completed
            ? <CheckCircle2 size={18} className="text-emerald-500 animate-check-pop" />
            : <Circle size={18} className="text-mauve-300 hover:text-blush-400 transition-colors" />
          }
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${todo.completed ? 'line-through text-mauve-400' : 'text-plum-800 dark:text-mauve-100'}`}>
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-xs text-mauve-400 mt-0.5">{todo.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${pc.bg} ${pc.color}`}>
              <Flag size={9} />{pc.label}
            </span>
            {todo.due_date && (
              <span className={`text-xs flex items-center gap-1 ${overdue && !todo.completed ? 'text-rose-500 font-medium' : 'text-mauve-400'}`}>
                <Calendar size={11} />
                {new Date(todo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {overdue && !todo.completed && ' · overdue'}
              </span>
            )}
            {todo.tags?.map(tag => (
              <span key={tag} className="text-xs text-blush-500 flex items-center gap-0.5">
                <Tag size={9} />{tag}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => onDelete(todo.id)}
          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-mauve-400 hover:text-rose-500 transition-all flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/* ── Main view ───────────────────────────────────────────────────────────── */
export default function TodosView() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [filter, setFilter] = useState<FilterType>('pending')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    due_date: '',
    tags: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTodos()
  }, [])
  useRealtimeSync('todos', loadTodos)

  async function loadTodos() {
    try {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })
      setTodos((data as Todo[]) || [])
    } catch (_) {}
  }

  async function toggleTodo(todo: Todo) {
    const completed = !todo.completed
    await supabase.from('todos').update({ completed, updated_at: new Date().toISOString() }).eq('id', todo.id)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed } : t))
  }

  async function deleteTodo(id: string) {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  async function saveTodo() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const { data } = await supabase
        .from('todos')
        .insert({
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          due_date: form.due_date || null,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          completed: false,
        })
        .select()
        .single()
      if (data) setTodos(prev => [data as Todo, ...prev])
      setShowForm(false)
      setForm({ title: '', description: '', priority: 'medium', due_date: '', tags: '' })
    } catch (_) {}
    setSaving(false)
  }

  const filtered = todos.filter(t => {
    if (filter === 'all') return true
    if (filter === 'pending') return !t.completed
    if (filter === 'completed') return t.completed
    return t.priority === filter && !t.completed
  })

  const pendingCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-mauve-800 rounded-xl border border-blush-100 dark:border-mauve-700 p-3 text-center card-hover dark:card-glow transition-all duration-200 hover:shadow-card-md hover:-translate-y-px">
          <p className="text-xl font-bold text-plum-800 dark:text-mauve-100">{pendingCount}</p>
          <p className="text-xs text-mauve-400">Pending</p>
        </div>
        <div className="bg-white dark:bg-mauve-800 rounded-xl border border-blush-100 dark:border-mauve-700 p-3 text-center card-hover dark:card-glow transition-all duration-200 hover:shadow-card-md hover:-translate-y-px">
          <p className="text-xl font-bold text-rose-500">{todos.filter(t => !t.completed && t.priority === 'high').length}</p>
          <p className="text-xs text-mauve-400">High Priority</p>
        </div>
        <div className="bg-white dark:bg-mauve-800 rounded-xl border border-blush-100 dark:border-mauve-700 p-3 text-center card-hover dark:card-glow transition-all duration-200 hover:shadow-card-md hover:-translate-y-px">
          <p className="text-xl font-bold text-emerald-500">{completedCount}</p>
          <p className="text-xs text-mauve-400">Done</p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white dark:bg-mauve-800 rounded-xl border border-blush-100 dark:border-mauve-700 p-1 overflow-x-auto flex-1 min-w-0">
          <Filter size={12} className="text-mauve-400 ml-2 flex-shrink-0" />
          {(['pending', 'all', 'high', 'medium', 'low', 'completed'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors flex-shrink-0 ${
                filter === f
                  ? 'bg-blush-500 text-white'
                  : 'text-mauve-400 hover:text-plum-800 dark:hover:text-mauve-100 hover:bg-blush-50 dark:hover:bg-mauve-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-blush-500 hover:bg-blush-600 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0"
        >
          <Plus size={15} />
          Add Task
        </button>
      </div>

      {/* Todo list */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <p className="empty-state-title">
              {filter === 'completed' ? 'No completed tasks' : 'All caught up!'}
            </p>
            <p className="empty-state-desc">
              {filter === 'completed' ? 'Complete some tasks and they will appear here' : 'No open tasks right now'}
            </p>
            {filter !== 'completed' && (
              <button onClick={() => setShowForm(true)} className="empty-state-action">
                <Plus size={16} /> Add a task
              </button>
            )}
          </div>
        ) : (
          filtered.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))
        )}
      </div>

      {/* Add task modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-blush-100 dark:border-mauve-700">
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100">New Task</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Task *</label>
                <input className="input-field" placeholder="What needs to be done?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="field-label">Description</label>
                <input className="input-field" placeholder="Additional details" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Priority</label>
                  <select className="input-field" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Due Date</label>
                  <input type="date" className="input-field" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="field-label">Tags (comma-separated)</label>
                <input className="input-field" placeholder="work, personal, urgent..." value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-blush-200 dark:border-mauve-600 text-mauve-400 text-sm font-medium hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors">Cancel</button>
              <button onClick={saveTodo} disabled={saving || !form.title.trim()} className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {saving ? 'Saving...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
