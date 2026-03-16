import { useState, useEffect } from 'react'
import {
  Plus,
  X,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { Course, Assignment } from '@/lib/types'

const COURSE_COLORS = ['#e8829a', '#b05070', '#9b7edb', '#6abf8e', '#f0a56a', '#5ba4cf']
const ASSIGNMENT_TYPES = ['homework', 'exam', 'project', 'quiz', 'other'] as const
const TYPE_COLORS: Record<string, string> = {
  homework: 'bg-blush-100 text-blush-600 dark:bg-blush-900/30 dark:text-blush-400',
  exam: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  project: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  quiz: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
}

interface CourseWithAssignments extends Course {
  assignments: Assignment[]
}

function gradeColor(pct: number) {
  if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 80) return 'text-blush-600 dark:text-blush-400'
  if (pct >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

function letterGrade(pct: number) {
  if (pct >= 93) return 'A'
  if (pct >= 90) return 'A-'
  if (pct >= 87) return 'B+'
  if (pct >= 83) return 'B'
  if (pct >= 80) return 'B-'
  if (pct >= 77) return 'C+'
  if (pct >= 73) return 'C'
  if (pct >= 70) return 'C-'
  return 'D'
}

function calcGPA(courses: CourseWithAssignments[]) {
  const graded = courses.filter(c => {
    const graded = c.assignments.filter(a => a.grade != null && a.max_grade != null)
    return graded.length > 0
  })
  if (!graded.length) return null
  const total = graded.reduce((sum, c) => {
    const assignments = c.assignments.filter(a => a.grade != null && a.max_grade != null)
    const pct = assignments.reduce((s, a) => s + (a.grade! / a.max_grade!) * 100, 0) / assignments.length
    const points = pct >= 93 ? 4.0 : pct >= 90 ? 3.7 : pct >= 87 ? 3.3 : pct >= 83 ? 3.0 : pct >= 80 ? 2.7 : pct >= 77 ? 2.3 : pct >= 73 ? 2.0 : 1.7
    return sum + points * (c.credits || 3)
  }, 0)
  const credits = graded.reduce((s, c) => s + (c.credits || 3), 0)
  return (total / credits).toFixed(2)
}

export default function AcademicsView() {
  const [courses, setCourses] = useState<CourseWithAssignments[]>([])
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showAssignmentForm, setShowAssignmentForm] = useState<string | null>(null)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [courseForm, setCourseForm] = useState({ name: '', instructor: '', credits: '3', color: '#e8829a', semester: '' })
  const [assignForm, setAssignForm] = useState({ title: '', type: 'homework' as Assignment['type'], due_date: '', grade: '', max_grade: '100', notes: '' })
  const [saving, setSaving] = useState(false)

  const currentSemester = () => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    if (month >= 0 && month <= 4) return `Spring ${year}`
    if (month >= 5 && month <= 7) return `Summer ${year}`
    return `Fall ${year}`
  }

  useEffect(() => {
    loadAll()
  }, [])
  useRealtimeSync('courses', loadAll)
  useRealtimeSync('assignments', loadAll)

  async function loadAll() {
    try {
      const [{ data: c }, { data: a }] = await Promise.all([
        supabase.from('courses').select('*').order('created_at', { ascending: false }),
        supabase.from('assignments').select('*').order('due_date', { ascending: true }),
      ])
      const coursesData = (c as Course[]) || []
      const assignmentsData = (a as Assignment[]) || []
      setCourses(coursesData.map(course => ({
        ...course,
        assignments: assignmentsData.filter(a => a.course_id === course.id),
      })))
    } catch (_) {}
  }

  async function saveCourse() {
    if (!courseForm.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: courseForm.name.trim(),
        instructor: courseForm.instructor.trim() || null,
        credits: parseInt(courseForm.credits) || 3,
        color: courseForm.color,
        semester: courseForm.semester.trim() || currentSemester(),
      }
      if (editCourse) {
        const { data } = await supabase.from('courses').update(payload).eq('id', editCourse.id).select().single()
        if (data) setCourses(prev => prev.map(c => c.id === editCourse.id ? { ...data as Course, assignments: c.assignments } : c))
      } else {
        const { data } = await supabase.from('courses').insert(payload).select().single()
        if (data) setCourses(prev => [{ ...data as Course, assignments: [] }, ...prev])
      }
      setShowCourseForm(false)
      setEditCourse(null)
      setCourseForm({ name: '', instructor: '', credits: '3', color: '#e8829a', semester: '' })
    } catch (_) {}
    setSaving(false)
  }

  async function deleteCourse(id: string) {
    if (!confirm('Delete this course and all its assignments?')) return
    await supabase.from('courses').delete().eq('id', id)
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  async function saveAssignment(courseId: string) {
    if (!assignForm.title.trim()) return
    setSaving(true)
    try {
      const { data } = await supabase.from('assignments').insert({
        course_id: courseId,
        title: assignForm.title.trim(),
        type: assignForm.type,
        due_date: assignForm.due_date || null,
        grade: assignForm.grade ? parseFloat(assignForm.grade) : null,
        max_grade: assignForm.max_grade ? parseFloat(assignForm.max_grade) : 100,
        completed: false,
        notes: assignForm.notes.trim() || null,
      }).select().single()
      if (data) {
        setCourses(prev => prev.map(c => c.id === courseId
          ? { ...c, assignments: [...c.assignments, data as Assignment] }
          : c
        ))
      }
      setShowAssignmentForm(null)
      setAssignForm({ title: '', type: 'homework', due_date: '', grade: '', max_grade: '100', notes: '' })
    } catch (_) {}
    setSaving(false)
  }

  async function toggleAssignment(assignment: Assignment, courseId: string) {
    const completed = !assignment.completed
    await supabase.from('assignments').update({ completed }).eq('id', assignment.id)
    setCourses(prev => prev.map(c => c.id === courseId
      ? { ...c, assignments: c.assignments.map(a => a.id === assignment.id ? { ...a, completed } : a) }
      : c
    ))
  }

  async function deleteAssignment(id: string, courseId: string) {
    await supabase.from('assignments').delete().eq('id', id)
    setCourses(prev => prev.map(c => c.id === courseId
      ? { ...c, assignments: c.assignments.filter(a => a.id !== id) }
      : c
    ))
  }

  async function updateGrade(assignment: Assignment, courseId: string, grade: string) {
    const g = parseFloat(grade)
    if (isNaN(g)) return
    await supabase.from('assignments').update({ grade: g }).eq('id', assignment.id)
    setCourses(prev => prev.map(c => c.id === courseId
      ? { ...c, assignments: c.assignments.map(a => a.id === assignment.id ? { ...a, grade: g } : a) }
      : c
    ))
  }

  const gpa = calcGPA(courses)
  const totalUpcoming = courses.reduce((s, c) => s + c.assignments.filter(a => !a.completed && a.due_date && new Date(a.due_date) >= new Date()).length, 0)
  const totalDone = courses.reduce((s, c) => s + c.assignments.filter(a => a.completed).length, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 p-4 text-center card-hover dark:card-glow transition-all duration-200 hover:shadow-card-md hover:-translate-y-px">
          <p className="text-2xl font-bold text-plum-800 dark:text-mauve-100">{courses.length}</p>
          <p className="text-xs text-mauve-400 mt-0.5">Courses</p>
        </div>
        <div className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 p-4 text-center card-hover dark:card-glow transition-all duration-200 hover:shadow-card-md hover:-translate-y-px">
          <p className="text-2xl font-bold text-amber-500">{totalUpcoming}</p>
          <p className="text-xs text-mauve-400 mt-0.5">Upcoming</p>
        </div>
        <div className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 p-4 text-center card-hover dark:card-glow transition-all duration-200 hover:shadow-card-md hover:-translate-y-px">
          {gpa ? (
            <>
              <p className={`text-2xl font-bold ${gradeColor(parseFloat(gpa) * 25)}`}>{gpa}</p>
              <p className="text-xs text-mauve-400 mt-0.5">GPA</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-mauve-300">--</p>
              <p className="text-xs text-mauve-400 mt-0.5">GPA</p>
            </>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-mauve-400">{totalDone} assignments completed</p>
        <button
          onClick={() => { setEditCourse(null); setCourseForm({ name: '', instructor: '', credits: '3', color: COURSE_COLORS[courses.length % COURSE_COLORS.length], semester: currentSemester() }); setShowCourseForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Course
        </button>
      </div>

      {/* Course list */}
      <div className="space-y-4">
        {courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <GraduationCap size={24} className="text-blue-500" />
            </div>
            <p className="empty-state-title">No courses yet</p>
            <p className="empty-state-desc">Add your first course to get started</p>
            <button
              onClick={() => { setEditCourse(null); setCourseForm({ name: '', instructor: '', credits: '3', color: COURSE_COLORS[0], semester: currentSemester() }); setShowCourseForm(true) }}
              className="empty-state-action !bg-blue-500 hover:!bg-blue-600"
            >
              <Plus size={16} /> Add a course
            </button>
          </div>
        ) : (
          courses.map(course => {
            const gradedAssignments = course.assignments.filter(a => a.grade != null && a.max_grade != null)
            const avgPct = gradedAssignments.length
              ? gradedAssignments.reduce((s, a) => s + (a.grade! / a.max_grade!) * 100, 0) / gradedAssignments.length
              : null
            const upcoming = course.assignments.filter(a => !a.completed && a.due_date && new Date(a.due_date) >= new Date())
            const isExpanded = expandedCourse === course.id

            return (
              <div key={course.id} className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden card-hover dark:card-glow transition-all duration-200 hover:shadow-card-md">
                {/* Course header */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: course.color + '22' }}>
                      <BookOpen size={18} style={{ color: course.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-plum-800 dark:text-mauve-100">{course.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {course.instructor && <p className="text-xs text-mauve-400">{course.instructor}</p>}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blush-50 dark:bg-mauve-700 text-mauve-400">{course.semester}</span>
                            {course.credits && <span className="text-xs text-mauve-400">{course.credits} credits</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {avgPct != null && (
                            <div className="text-right">
                              <p className={`text-lg font-bold ${gradeColor(avgPct)}`}>{letterGrade(avgPct)}</p>
                              <p className="text-xs text-mauve-400">{avgPct.toFixed(1)}%</p>
                            </div>
                          )}
                          <button onClick={() => { setEditCourse(course); setCourseForm({ name: course.name, instructor: course.instructor || '', credits: String(course.credits || 3), color: course.color, semester: course.semester }); setShowCourseForm(true) }} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteCourse(course.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-mauve-400 hover:text-rose-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {course.assignments.length > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-mauve-400 mb-1">
                            <span>{course.assignments.filter(a => a.completed).length}/{course.assignments.length} done</span>
                            {upcoming.length > 0 && <span className="text-amber-500">{upcoming.length} upcoming</span>}
                          </div>
                          <div className="h-1.5 bg-blush-100 dark:bg-mauve-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(course.assignments.filter(a => a.completed).length / course.assignments.length) * 100}%`,
                                backgroundColor: course.color,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                    className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-mauve-400 hover:text-blue-500 py-1 transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Hide assignments' : `Assignments (${course.assignments.length})`}
                  </button>
                </div>

                {/* Assignments */}
                {isExpanded && (
                  <div className="border-t border-blush-100 dark:border-mauve-700 bg-blush-50/30 dark:bg-mauve-700/20">
                    {course.assignments.length === 0 ? (
                      <p className="text-center text-xs text-mauve-400 py-6">No assignments yet</p>
                    ) : (
                      <div className="divide-y divide-blush-50 dark:divide-mauve-700/50">
                        {course.assignments.map(a => {
                          const isOverdue = a.due_date && !a.completed && new Date(a.due_date) < new Date()
                          return (
                            <div key={a.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-blush-50/50 dark:hover:bg-mauve-700/30 transition-colors">
                              <button onClick={() => toggleAssignment(a, course.id)} className="flex-shrink-0">
                                {a.completed
                                  ? <CheckCircle2 size={16} style={{ color: course.color }} className="animate-check-pop" />
                                  : <Circle size={16} className="text-mauve-300 hover:text-blush-400 transition-colors" />
                                }
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${a.completed ? 'line-through text-mauve-400' : 'text-plum-800 dark:text-mauve-100'}`}>
                                  {a.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${TYPE_COLORS[a.type]}`}>{a.type}</span>
                                  {a.due_date && (
                                    <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-rose-500 font-medium' : 'text-mauve-400'}`}>
                                      <Calendar size={10} />
                                      {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      {isOverdue && ' · overdue'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Grade input */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <input
                                  type="number"
                                  placeholder="--"
                                  defaultValue={a.grade ?? ''}
                                  onBlur={e => updateGrade(a, course.id, e.target.value)}
                                  className="w-12 text-center text-xs rounded-lg border border-blush-200 dark:border-mauve-600 bg-white dark:bg-mauve-700 text-plum-800 dark:text-mauve-100 py-1 focus:outline-none focus:ring-1 focus:ring-blush-400"
                                />
                                <span className="text-xs text-mauve-400">/{a.max_grade ?? 100}</span>
                                {a.grade != null && a.max_grade != null && (
                                  <span className={`text-xs font-bold ml-1 ${gradeColor((a.grade / a.max_grade) * 100)}`}>
                                    <Star size={10} className="inline" /> {((a.grade / a.max_grade) * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                              <button onClick={() => deleteAssignment(a.id, course.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/20 text-mauve-400 hover:text-rose-500 transition-all">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {/* Add assignment */}
                    {showAssignmentForm === course.id ? (
                      <div className="p-4 border-t border-blush-100 dark:border-mauve-700 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input-field text-sm col-span-2" placeholder="Assignment title *" value={assignForm.title} onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))} autoFocus />
                          <select className="input-field text-sm" value={assignForm.type} onChange={e => setAssignForm(f => ({ ...f, type: e.target.value as Assignment['type'] }))}>
                            {ASSIGNMENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                          </select>
                          <input type="date" className="input-field text-sm" value={assignForm.due_date} onChange={e => setAssignForm(f => ({ ...f, due_date: e.target.value }))} />
                          <input className="input-field text-sm" placeholder="Points earned" type="number" value={assignForm.grade} onChange={e => setAssignForm(f => ({ ...f, grade: e.target.value }))} />
                          <input className="input-field text-sm" placeholder="Out of (e.g. 100)" type="number" value={assignForm.max_grade} onChange={e => setAssignForm(f => ({ ...f, max_grade: e.target.value }))} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowAssignmentForm(null)} className="flex-1 py-2 rounded-xl border border-blush-200 dark:border-mauve-600 text-mauve-400 text-sm hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors">Cancel</button>
                          <button onClick={() => saveAssignment(course.id)} disabled={saving || !assignForm.title.trim()} className="flex-1 py-2 rounded-xl bg-blush-500 text-white text-sm disabled:opacity-50 hover:bg-blush-600 transition-colors">
                            {saving ? 'Saving...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 py-3 border-t border-blush-100 dark:border-mauve-700">
                        <button
                          onClick={() => { setAssignForm({ title: '', type: 'homework', due_date: '', grade: '', max_grade: '100', notes: '' }); setShowAssignmentForm(course.id) }}
                          className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors"
                        >
                          <Plus size={14} />
                          Add assignment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Course form modal */}
      {showCourseForm && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-blush-100 dark:border-mauve-700">
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100">{editCourse ? 'Edit Course' : 'Add Course'}</h3>
              <button onClick={() => setShowCourseForm(false)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Course Name *</label>
                <input className="input-field" placeholder="e.g. Intro to Psychology" value={courseForm.name} onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Instructor</label>
                  <input className="input-field" placeholder="Prof. Smith" value={courseForm.instructor} onChange={e => setCourseForm(f => ({ ...f, instructor: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Credits</label>
                  <input className="input-field" type="number" min="1" max="6" value={courseForm.credits} onChange={e => setCourseForm(f => ({ ...f, credits: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="field-label">Semester</label>
                <input className="input-field" placeholder={currentSemester()} value={courseForm.semester} onChange={e => setCourseForm(f => ({ ...f, semester: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Color</label>
                <div className="flex gap-2 mt-1">
                  {COURSE_COLORS.map(color => (
                    <button key={color} onClick={() => setCourseForm(f => ({ ...f, color }))} className={`w-8 h-8 rounded-full transition-all duration-150 ${courseForm.color === color ? 'scale-110 ring-2 ring-offset-2 ring-blush-400' : 'hover:scale-105'}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowCourseForm(false)} className="flex-1 py-2.5 rounded-xl border border-blush-200 dark:border-mauve-600 text-mauve-400 text-sm hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors">Cancel</button>
              <button onClick={saveCourse} disabled={saving || !courseForm.name.trim()} className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {saving ? 'Saving...' : editCourse ? 'Save' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
