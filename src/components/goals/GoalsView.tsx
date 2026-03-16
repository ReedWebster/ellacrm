import { useState, useEffect } from 'react'
import { Plus, X, Target, CheckCircle2, Circle, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { Goal, Milestone } from '@/lib/types'

const GOAL_COLORS = ['#e8829a', '#b05070', '#9b7edb', '#6abf8e', '#f0a56a', '#5ba4cf']
const CATEGORIES = ['Personal', 'Health', 'Career', 'Financial', 'Creative', 'Learning', 'Relationships', 'Travel']

interface GoalWithMilestones extends Goal {
  milestones: Milestone[]
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onToggleMilestone,
  onAddMilestone,
  onUpdateProgress,
}: {
  goal: GoalWithMilestones
  onEdit: (g: Goal) => void
  onDelete: (id: string) => void
  onToggleMilestone: (milestone: Milestone) => void
  onAddMilestone: (goalId: string, title: string) => void
  onUpdateProgress: (goalId: string, progress: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [newMilestone, setNewMilestone] = useState('')

  const completedMilestones = goal.milestones.filter(m => m.completed).length
  const totalMilestones = goal.milestones.length

  return (
    <div className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden card-hover dark:card-glow transition-all duration-200 hover:shadow-card-md hover:-translate-y-px">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: goal.color + '22' }}
            >
              <Target size={18} style={{ color: goal.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100">{goal.title}</h3>
              <p className="text-xs text-mauve-400 mt-0.5">{goal.category}</p>
              {goal.target_date && (
                <p className="text-xs text-mauve-400">
                  Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(goal)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400 hover:text-blush-500 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(goal.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-mauve-400 hover:text-rose-500 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-mauve-400">Progress</span>
            <span className="text-xs font-semibold" style={{ color: goal.color }}>{goal.progress}%</span>
          </div>
          <div className="h-2 bg-blush-100 dark:bg-mauve-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${goal.progress}%`, backgroundColor: goal.color }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={goal.progress}
            onChange={e => onUpdateProgress(goal.id, Number(e.target.value))}
            className="w-full mt-2 accent-blush-500 cursor-pointer"
          />
        </div>

        {/* Description */}
        {goal.description && (
          <p className="text-sm text-mauve-400 mt-3">{goal.description}</p>
        )}

        {/* Milestones summary */}
        {totalMilestones > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-mauve-400">
              {completedMilestones}/{totalMilestones} milestones
            </span>
            <div className="flex gap-0.5">
              {goal.milestones.map(m => (
                <div
                  key={m.id}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ backgroundColor: m.completed ? goal.color : '#e5e5e5' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-mauve-400 hover:text-emerald-500 py-1 transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide milestones' : 'Manage milestones'}
        </button>
      </div>

      {/* Milestones */}
      {expanded && (
        <div className="border-t border-blush-100 dark:border-mauve-700 p-5 space-y-2 bg-blush-50/50 dark:bg-mauve-700/30">
          {goal.milestones.length === 0 ? (
            <p className="text-xs text-mauve-400 text-center py-2">No milestones yet</p>
          ) : (
            goal.milestones.map(m => (
              <button
                key={m.id}
                onClick={() => onToggleMilestone(m)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-blush-100 dark:hover:bg-mauve-600 text-left transition-colors"
              >
                {m.completed
                  ? <CheckCircle2 size={16} style={{ color: goal.color }} className="flex-shrink-0 animate-check-pop" />
                  : <Circle size={16} className="text-mauve-300 flex-shrink-0" />
                }
                <span className={`text-sm ${m.completed ? 'line-through text-mauve-400' : 'text-plum-800 dark:text-mauve-100'}`}>
                  {m.title}
                </span>
              </button>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <input
              className="input-field text-sm flex-1"
              placeholder="Add milestone..."
              value={newMilestone}
              onChange={e => setNewMilestone(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newMilestone.trim()) {
                  onAddMilestone(goal.id, newMilestone.trim())
                  setNewMilestone('')
                }
              }}
            />
            <button
              onClick={() => {
                if (newMilestone.trim()) {
                  onAddMilestone(goal.id, newMilestone.trim())
                  setNewMilestone('')
                }
              }}
              className="px-3 py-2 bg-blush-500 text-white rounded-lg text-sm hover:bg-blush-600 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GoalsView() {
  const [goals, setGoals] = useState<GoalWithMilestones[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Personal',
    target_date: '',
    color: '#e8829a',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])
  useRealtimeSync('goals', loadAll)

  async function loadAll() {
    try {
      const [{ data: g }, { data: m }] = await Promise.all([
        supabase.from('goals').select('*').order('created_at', { ascending: false }),
        supabase.from('milestones').select('*').order('order_index'),
      ])
      const goalsData = (g as Goal[]) || []
      const milestonesData = (m as Milestone[]) || []
      setGoals(goalsData.map(goal => ({
        ...goal,
        milestones: milestonesData.filter(ms => ms.goal_id === goal.id),
      })))
    } catch (_) {}
  }

  async function saveGoal() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        target_date: form.target_date || null,
        color: form.color,
        progress: editGoal?.progress ?? 0,
      }
      if (editGoal) {
        const { data } = await supabase.from('goals').update(payload).eq('id', editGoal.id).select().single()
        if (data) {
          setGoals(prev => prev.map(g => g.id === editGoal.id
            ? { ...data as Goal, milestones: g.milestones }
            : g
          ))
        }
      } else {
        const { data } = await supabase.from('goals').insert(payload).select().single()
        if (data) setGoals(prev => [{ ...data as Goal, milestones: [] }, ...prev])
      }
      setShowForm(false)
      setEditGoal(null)
      setForm({ title: '', description: '', category: 'Personal', target_date: '', color: '#e8829a' })
    } catch (_) {}
    setSaving(false)
  }

  async function deleteGoal(id: string) {
    if (!confirm('Delete this goal?')) return
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  async function toggleMilestone(milestone: Milestone) {
    const completed = !milestone.completed
    await supabase.from('milestones').update({ completed }).eq('id', milestone.id)
    setGoals(prev => prev.map(g => ({
      ...g,
      milestones: g.milestones.map(m => m.id === milestone.id ? { ...m, completed } : m),
    })))
  }

  async function addMilestone(goalId: string, title: string) {
    const goal = goals.find(g => g.id === goalId)
    const { data } = await supabase
      .from('milestones')
      .insert({ goal_id: goalId, title, completed: false, order_index: goal?.milestones.length || 0 })
      .select()
      .single()
    if (data) {
      setGoals(prev => prev.map(g => g.id === goalId
        ? { ...g, milestones: [...g.milestones, data as Milestone] }
        : g
      ))
    }
  }

  async function updateProgress(goalId: string, progress: number) {
    await supabase.from('goals').update({ progress }).eq('id', goalId)
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress } : g))
  }

  function openEdit(g: Goal) {
    setEditGoal(g)
    setForm({
      title: g.title,
      description: g.description || '',
      category: g.category,
      target_date: g.target_date || '',
      color: g.color,
    })
    setShowForm(true)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-mauve-400">{goals.length} goal{goals.length !== 1 ? 's' : ''} tracked</p>
        <button
          onClick={() => { setEditGoal(null); setForm({ title: '', description: '', category: 'Personal', target_date: '', color: GOAL_COLORS[goals.length % GOAL_COLORS.length] }); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Goal
        </button>
      </div>

      {/* Goals grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {goals.length === 0 ? (
          <div className="col-span-2 empty-state">
            <div className="empty-state-icon">
              <Target size={24} className="text-emerald-500" />
            </div>
            <p className="empty-state-title">No goals yet</p>
            <p className="empty-state-desc">Set your first goal and start tracking progress</p>
            <button
              onClick={() => { setEditGoal(null); setForm({ title: '', description: '', category: 'Personal', target_date: '', color: GOAL_COLORS[0] }); setShowForm(true) }}
              className="empty-state-action"
            >
              <Plus size={16} /> Create a goal
            </button>
          </div>
        ) : (
          goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openEdit}
              onDelete={deleteGoal}
              onToggleMilestone={toggleMilestone}
              onAddMilestone={addMilestone}
              onUpdateProgress={updateProgress}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-blush-100 dark:border-mauve-700">
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100">{editGoal ? 'Edit Goal' : 'New Goal'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Goal Title *</label>
                <input className="input-field" placeholder="What do you want to achieve?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="field-label">Description</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Why does this goal matter?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Category</label>
                  <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Target Date</label>
                  <input type="date" className="input-field" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="field-label">Color</label>
                <div className="flex gap-2 mt-1">
                  {GOAL_COLORS.map(color => (
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
              <button onClick={saveGoal} disabled={saving || !form.title.trim()} className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {saving ? 'Saving...' : editGoal ? 'Save' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
