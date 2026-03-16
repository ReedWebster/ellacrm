import { useState, useEffect } from 'react'
import { Plus, X, Pin, PinOff, Tag, Search, Trash2, Save, ChevronLeft, StickyNote } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { Note } from '@/lib/types'

export default function NotesView() {
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ title: '', content: '', tags: '' })
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => { loadNotes() }, [])
  useRealtimeSync('notes', loadNotes)

  async function loadNotes() {
    try {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })
      setNotes((data as Note[]) || [])
    } catch (_) {}
  }

  function openNote(note: Note) {
    setActiveNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditTags(note.tags.join(', '))
    setDirty(false)
    setShowNew(false)
  }

  async function saveActiveNote() {
    if (!activeNote || !editTitle.trim()) return
    setSaving(true)
    try {
      const updated = {
        title: editTitle.trim(),
        content: editContent,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      }
      const { data } = await supabase.from('notes').update(updated).eq('id', activeNote.id).select().single()
      if (data) {
        setNotes(prev => prev.map(n => n.id === activeNote.id ? data as Note : n).sort((a, b) =>
          Number(b.pinned) - Number(a.pinned) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ))
        setActiveNote(data as Note)
      }
      setDirty(false)
    } catch (_) {}
    setSaving(false)
  }

  async function createNote() {
    if (!newForm.title.trim()) return
    setSaving(true)
    try {
      const { data } = await supabase
        .from('notes')
        .insert({
          title: newForm.title.trim(),
          content: newForm.content,
          tags: newForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          pinned: false,
        })
        .select()
        .single()
      if (data) {
        setNotes(prev => [data as Note, ...prev])
        setShowNew(false)
        setNewForm({ title: '', content: '', tags: '' })
        openNote(data as Note)
      }
    } catch (_) {}
    setSaving(false)
  }

  async function deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeNote?.id === id) setActiveNote(null)
  }

  async function togglePin(note: Note) {
    const pinned = !note.pinned
    await supabase.from('notes').update({ pinned }).eq('id', note.id)
    setNotes(prev => prev
      .map(n => n.id === note.id ? { ...n, pinned } : n)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    )
    if (activeNote?.id === note.id) setActiveNote(prev => prev ? { ...prev, pinned } : null)
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const mobileShowEditor = showNew || !!activeNote

  return (
    <div className="flex gap-4 h-[calc(100dvh-8rem)]">
      {/* Sidebar / list panel */}
      <div className={`${mobileShowEditor ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-shrink-0 flex-col bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden dark:card-glow`}>
        {/* Search + New */}
        <div className="p-3 border-b border-blush-100 dark:border-mauve-700 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mauve-400" />
            <input
              className="input-field pl-8 text-sm"
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setShowNew(true); setActiveNote(null) }}
            className="w-full flex items-center justify-center gap-2 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition-colors"
            aria-label="New note"
          >
            <Plus size={15} />
            New Note
          </button>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-mauve-400">
              <StickyNote size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">No notes found</p>
            </div>
          ) : (
            filtered.map(note => (
              <button
                key={note.id}
                onClick={() => openNote(note)}
                className={`w-full text-left p-3 border-b border-blush-50 dark:border-mauve-700/50 hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors group ${
                  activeNote?.id === note.id ? 'bg-blush-50 dark:bg-mauve-700 border-l-2 border-l-purple-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      {note.pinned && <Pin size={10} className="text-purple-400 flex-shrink-0" />}
                      <p className="text-sm font-medium text-plum-800 dark:text-mauve-100 truncate">{note.title}</p>
                    </div>
                    <p className="text-xs text-mauve-400 truncate mt-0.5">{note.content.substring(0, 60) || 'No content'}</p>
                    <p className="text-[10px] text-mauve-300 dark:text-mauve-500 mt-1">{formatDate(note.updated_at)}</p>
                  </div>
                </div>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {note.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className={`${mobileShowEditor ? 'flex' : 'hidden md:flex'} flex-1 bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden flex-col dark:card-glow`}>
        {showNew ? (
          <div className="flex-1 flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowNew(false)} className="md:hidden p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400">
                  <ChevronLeft size={18} />
                </button>
                <h3 className="font-semibold text-plum-800 dark:text-mauve-100">New Note</h3>
              </div>
              <button onClick={() => setShowNew(false)} className="hidden md:flex p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400">
                <X size={18} />
              </button>
            </div>
            <input
              className="text-xl font-semibold bg-transparent border-0 outline-none text-plum-800 dark:text-mauve-100 placeholder-mauve-300 dark:placeholder-mauve-600"
              placeholder="Note title..."
              value={newForm.title}
              onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
            <div className="flex items-center gap-1.5">
              <Tag size={12} className="text-mauve-400" />
              <input
                className="text-sm bg-transparent border-0 outline-none text-mauve-400 placeholder-mauve-300 dark:placeholder-mauve-600 flex-1"
                placeholder="Tags (comma-separated)..."
                value={newForm.tags}
                onChange={e => setNewForm(f => ({ ...f, tags: e.target.value }))}
              />
            </div>
            <textarea
              className="flex-1 bg-transparent border-0 outline-none text-sm text-plum-800 dark:text-mauve-100 placeholder-mauve-300 dark:placeholder-mauve-600 resize-none leading-relaxed"
              placeholder="Start writing..."
              value={newForm.content}
              onChange={e => setNewForm(f => ({ ...f, content: e.target.value }))}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-xl border border-blush-200 dark:border-mauve-600 text-mauve-400 text-sm hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors">Cancel</button>
              <button onClick={createNote} disabled={saving || !newForm.title.trim()} className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {saving ? 'Saving...' : 'Create Note'}
              </button>
            </div>
          </div>
        ) : activeNote ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100 dark:border-mauve-700">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveNote(null)} className="md:hidden p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => togglePin(activeNote)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400 hover:text-purple-500 transition-colors">
                  {activeNote.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
                <span className="text-xs text-mauve-400 hidden sm:block">
                  Updated {formatDate(activeNote.updated_at)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {dirty && (
                  <button
                    onClick={saveActiveNote}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium transition-colors"
                  >
                    <Save size={12} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
                <button onClick={() => deleteNote(activeNote.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-mauve-400 hover:text-rose-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              <input
                className="text-2xl font-semibold bg-transparent border-0 outline-none text-plum-800 dark:text-mauve-100 placeholder-mauve-300"
                value={editTitle}
                onChange={e => { setEditTitle(e.target.value); setDirty(true) }}
                placeholder="Note title..."
              />
              <div className="flex items-center gap-1.5">
                <Tag size={12} className="text-mauve-400" />
                <input
                  className="text-sm bg-transparent border-0 outline-none text-mauve-400 placeholder-mauve-300 flex-1"
                  placeholder="Tags (comma-separated)..."
                  value={editTags}
                  onChange={e => { setEditTags(e.target.value); setDirty(true) }}
                />
              </div>
              <textarea
                className="flex-1 min-h-[300px] bg-transparent border-0 outline-none text-sm text-plum-800 dark:text-mauve-200 placeholder-mauve-300 resize-none leading-relaxed font-mono"
                value={editContent}
                onChange={e => { setEditContent(e.target.value); setDirty(true) }}
                placeholder="Start writing... (supports Markdown)"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-mauve-400">
            <div>
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <StickyNote size={24} className="text-purple-400" />
              </div>
              <p className="font-semibold text-plum-800 dark:text-mauve-100">Select a note to edit</p>
              <p className="text-sm mt-1">or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
