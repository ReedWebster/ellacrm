import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  X,
  Mail,
  Phone,
  Building2,
  Tag,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { Contact, Payment } from '@/lib/types'

const AVATAR_COLORS = ['#e8829a', '#b05070', '#9b7edb', '#6abf8e', '#f0a56a', '#5ba4cf']

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function PaymentBadge({ status }: { status: Payment['status'] }) {
  const styles = {
    outstanding: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    upcoming: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}

interface ContactCardProps {
  contact: Contact
  payments: Payment[]
  onEdit: (c: Contact) => void
  onDelete: (id: string) => void
  onAddPayment: (contactId: string) => void
}

function ContactCard({ contact, payments, onEdit, onDelete, onAddPayment }: ContactCardProps) {
  const [expanded, setExpanded] = useState(false)
  const contactPayments = payments.filter(p => p.contact_id === contact.id)
  const outstanding = contactPayments.filter(p => p.status === 'outstanding').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="bg-white dark:bg-mauve-800 rounded-2xl border border-blush-100 dark:border-mauve-700 overflow-hidden transition-all">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: contact.avatar_color || '#e8829a' }}
          >
            {initials(contact.name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-plum-800 dark:text-mauve-100">{contact.name}</h3>
                {contact.company && (
                  <p className="text-xs text-mauve-400 flex items-center gap-1 mt-0.5">
                    <Building2 size={11} />{contact.company}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {outstanding > 0 && (
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    ${outstanding.toLocaleString()} due
                  </span>
                )}
                <button onClick={() => onEdit(contact)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400 hover:text-blush-500 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(contact.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-mauve-400 hover:text-rose-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Contact details */}
            <div className="flex flex-wrap gap-3 mt-2">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="text-xs text-blush-500 hover:underline flex items-center gap-1">
                  <Mail size={11} />{contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="text-xs text-blush-500 hover:underline flex items-center gap-1">
                  <Phone size={11} />{contact.phone}
                </a>
              )}
            </div>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {contact.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-blush-50 dark:bg-mauve-700 text-blush-600 dark:text-blush-400 flex items-center gap-1">
                    <Tag size={9} />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-mauve-400 hover:text-blush-500 py-1 transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide' : `Show notes & payments (${contactPayments.length})`}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-blush-100 dark:border-mauve-700 p-5 space-y-4 bg-blush-50/50 dark:bg-mauve-700/30">
          {/* Notes */}
          {contact.notes && (
            <div>
              <p className="text-xs font-medium text-mauve-400 mb-1.5">Notes</p>
              <p className="text-sm text-plum-800 dark:text-mauve-100 leading-relaxed">{contact.notes}</p>
            </div>
          )}

          {/* Payments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-mauve-400">Payments</p>
              <button
                onClick={() => onAddPayment(contact.id)}
                className="text-xs text-blush-500 hover:text-blush-600 flex items-center gap-1"
              >
                <Plus size={12} />Add
              </button>
            </div>
            {contactPayments.length === 0 ? (
              <p className="text-xs text-mauve-400">No payments tracked</p>
            ) : (
              <div className="space-y-2">
                {contactPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-plum-800 dark:text-mauve-100">{p.description}</p>
                      {p.due_date && (
                        <p className="text-xs text-mauve-400">
                          Due {new Date(p.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-plum-800 dark:text-mauve-100">
                        ${Number(p.amount).toLocaleString()}
                      </span>
                      <PaymentBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ContactFormData {
  name: string
  email: string
  phone: string
  company: string
  tags: string
  notes: string
  avatar_color: string
}

interface PaymentFormData {
  contactId: string
  amount: string
  status: Payment['status']
  due_date: string
  description: string
}

const defaultContactForm: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  tags: '',
  notes: '',
  avatar_color: '#e8829a',
}

const defaultPaymentForm: PaymentFormData = {
  contactId: '',
  amount: '',
  status: 'upcoming',
  due_date: '',
  description: '',
}

export default function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [form, setForm] = useState<ContactFormData>(defaultContactForm)
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>(defaultPaymentForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])
  useRealtimeSync('contacts', loadAll)

  async function loadAll() {
    try {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('contacts').select('*').order('name'),
        supabase.from('payments').select('*').order('due_date'),
      ])
      setContacts((c as Contact[]) || [])
      setPayments((p as Payment[]) || [])
    } catch (_) {}
  }

  function openEdit(c: Contact) {
    setEditContact(c)
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      company: c.company || '',
      tags: c.tags.join(', '),
      notes: c.notes || '',
      avatar_color: c.avatar_color || '#e8829a',
    })
    setShowForm(true)
  }

  function openNew() {
    setEditContact(null)
    setForm({ ...defaultContactForm, avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] })
    setShowForm(true)
  }

  async function saveContact() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        notes: form.notes.trim() || null,
        avatar_color: form.avatar_color,
        updated_at: new Date().toISOString(),
      }
      if (editContact) {
        const { data } = await supabase.from('contacts').update(payload).eq('id', editContact.id).select().single()
        if (data) setContacts(prev => prev.map(c => c.id === editContact.id ? data as Contact : c))
      } else {
        const { data } = await supabase.from('contacts').insert(payload).select().single()
        if (data) setContacts(prev => [...prev, data as Contact].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setShowForm(false)
      setEditContact(null)
    } catch (_) {}
    setSaving(false)
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
    setPayments(prev => prev.filter(p => p.contact_id !== id))
  }

  async function savePayment() {
    if (!paymentForm.description.trim() || !paymentForm.amount) return
    setSaving(true)
    try {
      const { data } = await supabase
        .from('payments')
        .insert({
          contact_id: paymentForm.contactId,
          amount: parseFloat(paymentForm.amount),
          status: paymentForm.status,
          due_date: paymentForm.due_date || null,
          description: paymentForm.description.trim(),
        })
        .select()
        .single()
      if (data) setPayments(prev => [...prev, data as Payment])
      setShowPaymentForm(false)
      setPaymentForm(defaultPaymentForm)
    } catch (_) {}
    setSaving(false)
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mauve-400" />
          <input
            className="input-field pl-9"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blush-500 hover:bg-blush-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm flex-shrink-0"
        >
          <Plus size={16} />
          Add Contact
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {['outstanding', 'upcoming', 'paid'].map(status => {
          const total = payments
            .filter(p => p.status === status)
            .reduce((s, p) => s + Number(p.amount), 0)
          const styles = {
            outstanding: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20',
            upcoming: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
            paid: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20',
          }
          const textStyles = {
            outstanding: 'text-rose-700 dark:text-rose-400',
            upcoming: 'text-amber-700 dark:text-amber-400',
            paid: 'text-emerald-700 dark:text-emerald-400',
          }
          return (
            <div key={status} className={`rounded-xl border p-3 text-center ${styles[status as keyof typeof styles]}`}>
              <p className={`text-lg font-bold ${textStyles[status as keyof typeof textStyles]}`}>
                ${total.toLocaleString()}
              </p>
              <p className="text-xs text-mauve-400 capitalize">{status}</p>
            </div>
          )
        })}
      </div>

      {/* Contact list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-mauve-400">
            <DollarSign size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No contacts yet</p>
            <p className="text-sm mt-1">Add your first client or contact above</p>
          </div>
        ) : (
          filtered.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              payments={payments}
              onEdit={openEdit}
              onDelete={deleteContact}
              onAddPayment={id => {
                setPaymentForm({ ...defaultPaymentForm, contactId: id })
                setShowPaymentForm(true)
              }}
            />
          ))
        )}
      </div>

      {/* Contact form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-mauve-800 rounded-3xl shadow-xl w-full max-w-md border border-blush-100 dark:border-mauve-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-blush-100 dark:border-mauve-700">
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100">
                {editContact ? 'Edit Contact' : 'New Contact'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Name *</label>
                <input className="input-field" placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Email</label>
                  <input className="input-field" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input className="input-field" type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="field-label">Company</label>
                <input className="input-field" placeholder="Company or business" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Tags (comma-separated)</label>
                <input className="input-field" placeholder="client, brand deal, vendor…" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Notes</label>
                <textarea className="input-field resize-none" rows={3} placeholder="Any notes about this contact…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Avatar Color</label>
                <div className="flex gap-2 mt-1">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, avatar_color: color }))}
                      className={`w-8 h-8 rounded-full transition-transform ${form.avatar_color === color ? 'scale-110 ring-2 ring-offset-2 ring-blush-400' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-blush-200 dark:border-mauve-600 text-mauve-400 text-sm font-medium">Cancel</button>
              <button onClick={saveContact} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-sm font-medium">
                {saving ? 'Saving…' : editContact ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment form modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-mauve-800 rounded-3xl shadow-xl w-full max-w-sm border border-blush-100 dark:border-mauve-700">
            <div className="flex items-center justify-between p-6 border-b border-blush-100 dark:border-mauve-700">
              <h3 className="font-semibold text-plum-800 dark:text-mauve-100">Add Payment</h3>
              <button onClick={() => setShowPaymentForm(false)} className="p-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-mauve-700 text-mauve-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Description</label>
                <input className="input-field" placeholder="Invoice #123, Project fee…" value={paymentForm.description} onChange={e => setPaymentForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Amount ($)</label>
                  <input className="input-field" type="number" placeholder="0.00" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select className="input-field" value={paymentForm.status} onChange={e => setPaymentForm(f => ({ ...f, status: e.target.value as Payment['status'] }))}>
                    <option value="upcoming">Upcoming</option>
                    <option value="outstanding">Outstanding</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Due Date</label>
                <input type="date" className="input-field" value={paymentForm.due_date} onChange={e => setPaymentForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowPaymentForm(false)} className="flex-1 py-2.5 rounded-xl border border-blush-200 dark:border-mauve-600 text-mauve-400 text-sm font-medium">Cancel</button>
              <button onClick={savePayment} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blush-500 hover:bg-blush-600 disabled:opacity-50 text-white text-sm font-medium">
                {saving ? 'Saving…' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
