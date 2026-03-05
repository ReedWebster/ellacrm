import { useState, useEffect } from 'react'
import {
  Plus,
  X,
  FolderOpen,
  FileText,
  Link,
  Trash2,
  Search,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { Document } from '@/lib/types'

const DEFAULT_FOLDERS = ['EIN & Tax', 'Agreements', 'References', 'Branding', 'Invoices', 'Licenses', 'General']

const FOLDER_COLORS: Record<string, string> = {
  'EIN & Tax': '#e8829a',
  'Agreements': '#b05070',
  'References': '#9b7edb',
  'Branding': '#f0a56a',
  'Invoices': '#6abf8e',
  'Licenses': '#5ba4cf',
  'General': '#9e7080',
}

function getFolderColor(folder: string) {
  return FOLDER_COLORS[folder] || '#9e7080'
}

export default function DocHubView() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    folder: 'General',
    url: '',
    file_type: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadDocs() }, [])
  useRealtimeSync('documents', loadDocs)

  async function loadDocs() {
    try {
      const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
      setDocuments((data as Document[]) || [])
    } catch (_) {}
  }

  async function saveDoc() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { data } = await supabase
        .from('documents')
        .insert({
          name: form.name.trim(),
          folder: form.folder,
          url: form.url.trim() || null,
          file_type: form.file_type.trim() || null,
          notes: form.notes.trim() || null,
        })
        .select()
        .single()
      if (data) setDocuments(prev => [data as Document, ...prev])
      setShowForm(false)
      setForm({ name: '', folder: 'General', url: '', file_type: '', notes: '' })
    } catch (_) {}
    setSaving(false)
  }

  async function deleteDoc(id: string) {
    await supabase.from('documents').delete().eq('id', id)
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  // Get all unique folders (including ones with existing docs)
  const allFolders = Array.from(new Set([
    ...DEFAULT_FOLDERS,
    ...documents.map(d => d.folder),
  ]))

  const filteredDocs = documents.filter(d => {
    const matchSearch = !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.folder.toLowerCase().includes(search.toLowerCase()) ||
      d.notes?.toLowerCase().includes(search.toLowerCase())
    const matchFolder = !activeFolder || d.folder === activeFolder
    return matchSearch && matchFolder
  })

  const docsByFolder = allFolders.reduce<Record<string, Document[]>>((acc, folder) => {
    acc[folder] = documents.filter(d => d.folder === folder)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mauve-400" />
          <input
            className="input-field pl-9"
            placeholder="Search documents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blush-500 hover:bg-blush-600 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0"
        >
          <Plus size={16} />
          Add Doc
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {/* Folder sidebar */}
        <div className="md:col-span-1 bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-blush-100 dark:border-mauve-700">
            <p className="text-xs font-semibold text-mauve-400 uppercase tracking-wide">Folders</p>
          </div>
          <div className="p-2">
            <button
              onClick={() => setActiveFolder(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                !activeFolder ? 'bg-blush-100 dark:bg-blush-900/30 text-blush-600 dark:text-blush-400' : 'text-mauve-400 hover:bg-blush-50 dark:hover:bg-mauve-700'
              }`}
            >
              <FolderOpen size={14} />
              All Documents
              <span className="ml-auto text-xs">{documents.length}</span>
            </button>
            {allFolders.map(folder => {
              const count = docsByFolder[folder]?.length || 0
              const color = getFolderColor(folder)
              return (
                <button
                  key={folder}
                  onClick={() => setActiveFolder(folder === activeFolder ? null : folder)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                    activeFolder === folder
                      ? 'bg-blush-100 dark:bg-blush-900/30 text-blush-600 dark:text-blush-400'
                      : 'text-mauve-400 hover:bg-blush-50 dark:hover:bg-mauve-700'
                  }`}
                >
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate">{folder}</span>
                  {count > 0 && <span className="ml-auto text-xs">{count}</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Document grid */}
        <div className="md:col-span-3">
          {!search && !activeFolder ? (
            // Folder view
            <div className="space-y-4">
              {allFolders.filter(f => docsByFolder[f]?.length > 0).map(folder => {
                const color = getFolderColor(folder)
                const docs = docsByFolder[folder]
                return (
                  <div key={folder} className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden">
                    <button
                      onClick={() => setActiveFolder(folder)}
                      className="w-full flex items-center gap-3 px-5 py-4 border-b border-blush-100 dark:border-mauve-700 hover:bg-blush-50 dark:hover:bg-mauve-700 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
                        <FolderOpen size={16} style={{ color }} />
                      </div>
                      <span className="font-semibold text-plum-800 dark:text-mauve-100 text-sm">{folder}</span>
                      <span className="text-xs text-mauve-400">{docs.length} doc{docs.length !== 1 ? 's' : ''}</span>
                      <ChevronRight size={14} className="ml-auto text-mauve-400" />
                    </button>
                    <div className="p-3 grid grid-cols-2 gap-2">
                      {docs.slice(0, 4).map(doc => (
                        <DocCard key={doc.id} doc={doc} onDelete={deleteDoc} />
                      ))}
                    </div>
                  </div>
                )
              })}
              {allFolders.every(f => !docsByFolder[f]?.length) && (
                <div className="text-center py-16 text-mauve-400">
                  <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No documents yet</p>
                  <p className="text-sm mt-1">Add your first document to get organized</p>
                </div>
              )}
            </div>
          ) : (
            // List view
            <div className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-blush-100 dark:border-mauve-700 flex items-center justify-between">
                <p className="text-sm font-semibold text-plum-800 dark:text-mauve-100">
                  {activeFolder || 'All Documents'} — {filteredDocs.length} result{filteredDocs.length !== 1 ? 's' : ''}
                </p>
                {activeFolder && (
                  <button onClick={() => setActiveFolder(null)} className="text-xs text-blush-500 hover:text-blush-600">
                    ← Back
                  </button>
                )}
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {filteredDocs.map(doc => (
                  <DocCard key={doc.id} doc={doc} onDelete={deleteDoc} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add doc modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-mauve-800 rounded-3xl shadow-xl w-full max-w-md border border-blush-100 dark:border-mauve-700">
            <div className="flex items-center justify-between p-6 border-b border-blush-100 dark:border-mauve-700">
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100">Add Document</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Document Name *</label>
                <input className="input-field" placeholder="e.g. EIN Certificate, Client Agreement…" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Folder</label>
                  <select className="input-field" value={form.folder} onChange={e => setForm(f => ({ ...f, folder: e.target.value }))}>
                    {allFolders.map(folder => <option key={folder} value={folder}>{folder}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">File Type</label>
                  <input className="input-field" placeholder="PDF, DOCX, PNG…" value={form.file_type} onChange={e => setForm(f => ({ ...f, file_type: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="field-label">URL / Link (optional)</label>
                <input className="input-field" type="url" placeholder="https://drive.google.com/…" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Notes</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Any relevant notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-blush-200 dark:border-mauve-600 text-mauve-400 text-sm font-medium">Cancel</button>
              <button onClick={saveDoc} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-sm font-medium">
                {saving ? 'Saving…' : 'Add Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocCard({ doc, onDelete }: { doc: Document; onDelete: (id: string) => void }) {
  return (
    <div className="group flex items-start gap-2.5 p-3 rounded-xl border border-blush-100 dark:border-mauve-700 bg-blush-50/50 dark:bg-mauve-700/30 hover:border-blush-300 dark:hover:border-blush-700 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-blush-100 dark:bg-mauve-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        {doc.url ? <Link size={14} className="text-blush-500" /> : <FileText size={14} className="text-blush-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-plum-800 dark:text-mauve-100 truncate leading-tight">{doc.name}</p>
        {doc.file_type && <p className="text-[11px] text-mauve-400 uppercase">{doc.file_type}</p>}
        {doc.notes && <p className="text-[11px] text-mauve-400 truncate mt-0.5">{doc.notes}</p>}
        {doc.url && (
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blush-500 hover:underline flex items-center gap-0.5 mt-0.5">
            Open <ExternalLink size={9} />
          </a>
        )}
      </div>
      <button
        onClick={() => onDelete(doc.id)}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-mauve-400 hover:text-rose-500 transition-all flex-shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
