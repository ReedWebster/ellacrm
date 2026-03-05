// ─── Contact / Client ───────────────────────────────────────────────────────

export interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  tags: string[]
  notes?: string
  avatar_color?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  contact_id: string
  amount: number
  status: 'outstanding' | 'upcoming' | 'paid'
  due_date?: string
  description: string
  created_at: string
}

// ─── Habits ─────────────────────────────────────────────────────────────────

export interface Habit {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  order_index: number
  created_at: string
}

export interface HabitCompletion {
  id: string
  habit_id: string
  completed_date: string
}

// ─── To-Do ──────────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  title: string
  description?: string
  priority: Priority
  due_date?: string
  completed: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

// ─── Goals ──────────────────────────────────────────────────────────────────

export interface Goal {
  id: string
  title: string
  description?: string
  category: string
  progress: number
  target_date?: string
  color: string
  created_at: string
  milestones: Milestone[]
}

export interface Milestone {
  id: string
  goal_id: string
  title: string
  completed: boolean
  order_index: number
}

// ─── Notes ──────────────────────────────────────────────────────────────────

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  pinned: boolean
  created_at: string
  updated_at: string
}

// ─── Academics ───────────────────────────────────────────────────────────────

export interface Course {
  id: string
  name: string
  instructor?: string
  credits?: number
  color: string
  semester: string
  created_at: string
}

export interface Assignment {
  id: string
  course_id: string
  title: string
  type: 'homework' | 'exam' | 'project' | 'quiz' | 'other'
  due_date?: string
  grade?: number
  max_grade?: number
  completed: boolean
  notes?: string
  created_at: string
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface Document {
  id: string
  name: string
  folder: string
  url?: string
  file_type?: string
  size_bytes?: number
  notes?: string
  created_at: string
}

// ─── Calendar / Time Blocks ──────────────────────────────────────────────────

export interface TimeBlock {
  id: string
  title: string
  category: string
  start_time: string
  end_time: string
  color: string
  repeat_until?: string
  created_at: string
}

// ─── App Navigation ──────────────────────────────────────────────────────────

export type ViewKey =
  | 'dashboard'
  | 'calendar'
  | 'habits'
  | 'todos'
  | 'goals'
  | 'notes'
  | 'academics'
  | 'docs'
