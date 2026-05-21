import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LogOut, Calendar, Users, Lock, ChevronLeft, ChevronRight,
  Phone, Mail, XCircle, Trash2, AlertTriangle, CheckCircle,
  Settings, Plus, X as XIcon, Database, MessageSquare,
  ArrowRight, Info, DollarSign, Download, Kanban,
  Clock, Send, UserPlus, Loader2, ShieldCheck,
} from 'lucide-react'
import {
  isAuthenticated, login, logout,
  getLeads, updateLeadStatus, deleteLead,
  addLeadNote, updateLeadJobValue, markFollowUpSent,
  exportLeadsCSV, getSettings, saveSettings, seedDemoData,
} from '../utils/storage'
import { sendFollowUpEmail, sendInviteEmail } from '../utils/email'
import { loginWithEmail, logoutTeam, getCurrentUserProfile, createInvite, getTeamMembers, removeTeamMember } from '../utils/team'

const STATUS_OPTIONS  = ['New', 'Contacted', 'Quoted', 'Booked', 'Completed', 'Cancelled']
const PIPELINE_COLS   = ['New', 'Contacted', 'Quoted', 'Booked', 'Completed', 'Cancelled']

const STATUS_BG = {
  New:       'var(--badge-new-bg)',
  Contacted: 'var(--badge-contacted-bg)',
  Quoted:    'var(--badge-quoted-bg)',
  Booked:    'var(--badge-booked-bg)',
  Completed: 'var(--badge-completed-bg)',
  Cancelled: 'var(--badge-cancelled-bg)',
}
const STATUS_FG = {
  New:       'var(--badge-new-text)',
  Contacted: 'var(--badge-contacted-text)',
  Quoted:    'var(--badge-quoted-text)',
  Booked:    'var(--badge-booked-text)',
  Completed: 'var(--badge-completed-text)',
  Cancelled: 'var(--badge-cancelled-text)',
}
const COL_DOT = {
  New:       'bg-blue-400',
  Contacted: 'bg-violet-400',
  Quoted:    'bg-amber-400',
  Booked:    'bg-green-400',
  Completed: 'bg-gray-400',
  Cancelled: 'bg-red-400',
}

const ALL_WEEKDAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const ALL_TIME_SLOTS = [
  '7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
]
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const fmt$ = (v) => v != null ? `$${Number(v).toLocaleString()}` : '—'
const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'
const fmtTime = (iso) => iso
  ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  : ''

/* ── Toast ─────────────────────────────────────────────────────────────── */
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])
  if (!toast) return null
  return (
    <div className={`toast toast--${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'success'
        ? <CheckCircle className="w-4 h-4 shrink-0" />
        : <XCircle     className="w-4 h-4 shrink-0" />}
      {toast.message}
    </div>
  )
}

/* ── Confirm Delete Modal ───────────────────────────────────────────────── */
function ConfirmDeleteModal({ lead, onConfirm, onCancel }) {
  if (!lead) return null
  return (
    <div
      className="confirm-modal-overlay"
      role="dialog" aria-modal="true" aria-labelledby="confirm-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="confirm-modal">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 id="confirm-title" className="font-bold text-gray-900 text-lg leading-tight">Delete lead?</h3>
            <p className="text-gray-500 text-sm mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-gray-700 text-sm mb-6">
          You are about to permanently delete <strong>{lead.name}</strong> and all their data.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            style={{ minHeight: 44 }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            style={{ minHeight: 44 }}>
            Delete lead
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Activity Log Icons ─────────────────────────────────────────────────── */
function ActivityIcon({ type }) {
  const base = 'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5'
  if (type === 'status')    return <div className={`${base} bg-blue-100`}><ArrowRight className="w-3 h-3 text-blue-600" /></div>
  if (type === 'follow_up') return <div className={`${base} bg-green-100`}><Send className="w-3 h-3 text-green-600" /></div>
  if (type === 'note')      return <div className={`${base} bg-purple-100`}><MessageSquare className="w-3 h-3 text-purple-600" /></div>
  return                           <div className={`${base} bg-gray-100`}><Info className="w-3 h-3 text-gray-500" /></div>
}

/* ── Lead Detail Drawer ─────────────────────────────────────────────────── */
function LeadDrawer({ lead, onClose, onStatusChange, onNoteAdd, onJobValueSave, onDeleteRequest }) {
  const [noteText, setNoteText]       = useState('')
  const [jobVal, setJobVal]           = useState(lead?.jobValue != null ? String(lead.jobValue) : '')
  const [jobEditing, setJobEditing]   = useState(false)
  const noteRef = useRef(null)

  useEffect(() => {
    setJobVal(lead?.jobValue != null ? String(lead.jobValue) : '')
  }, [lead?.jobValue])

  if (!lead) return null

  function submitNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    onNoteAdd(lead.id, noteText.trim())
    setNoteText('')
    noteRef.current?.focus()
  }

  function saveJobValue() {
    onJobValueSave(lead.id, jobVal)
    setJobEditing(false)
  }

  const log = [...(lead.activityLog || [])].reverse()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-lg leading-tight truncate">{lead.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">{lead.service}</p>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <span
              className="status-pill"
              style={{ background: STATUS_BG[lead.status], color: STATUS_FG[lead.status] }}
            >
              {lead.status}
            </span>
            <button onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              style={{ minWidth: 36, minHeight: 36 }}
              aria-label="Close drawer">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${lead.phone}`}
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm text-gray-700 hover:bg-green-50 hover:text-brand-green transition-colors">
              <Phone className="w-4 h-4 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </a>
            <a href={`mailto:${lead.email}`}
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm text-gray-700 hover:bg-green-50 hover:text-brand-green transition-colors">
              <Mail className="w-4 h-4 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </a>
          </div>

          {/* Appointment */}
          {(lead.preferredDate || lead.preferredTime) && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
              <p className="font-semibold text-gray-800 mb-1">Appointment</p>
              {lead.preferredDate && <p>{fmtDate(lead.preferredDate + 'T00:00:00')}{lead.preferredTime ? ` · ${lead.preferredTime}` : ''}</p>}
            </div>
          )}

          {/* Job Value */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Job Value</p>
            {jobEditing ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    value={jobVal}
                    onChange={e => setJobVal(e.target.value)}
                    className="input-field pl-8"
                    placeholder="0"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveJobValue(); if (e.key === 'Escape') setJobEditing(false) }}
                  />
                </div>
                <button onClick={saveJobValue}
                  className="px-4 py-2 bg-brand-green text-white text-sm font-semibold rounded-lg hover:bg-brand-dark transition-colors"
                  style={{ minHeight: 44 }}>
                  Save
                </button>
                <button onClick={() => setJobEditing(false)}
                  className="px-3 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  style={{ minHeight: 44 }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setJobEditing(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-dashed border-gray-300
                           rounded-xl text-sm hover:border-brand-green hover:text-brand-green transition-colors w-full text-left"
                style={{ minHeight: 44 }}>
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className={lead.jobValue != null ? 'font-bold text-gray-900' : 'text-gray-400'}>
                  {lead.jobValue != null ? `$${Number(lead.jobValue).toLocaleString()}` : 'Set job value…'}
                </span>
              </button>
            )}
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
            <select
              value={lead.status}
              onChange={e => onStatusChange(lead.id, e.target.value)}
              className="text-sm font-semibold px-3 py-2.5 rounded-xl cursor-pointer border border-gray-200
                         focus:outline-none focus:ring-2 focus:ring-brand-green w-full"
              style={{
                backgroundColor: STATUS_BG[lead.status] || 'var(--badge-inactive-bg)',
                color:           STATUS_FG[lead.status] || 'var(--badge-inactive-text)',
                minHeight: 44,
              }}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Follow-up */}
          {lead.followUpDate && (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${
              lead.followUpSent
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {lead.followUpSent
                ? <><CheckCircle className="w-4 h-4 shrink-0" /> Follow-up sent {fmtDate(lead.followUpDate)}</>
                : <><Clock className="w-4 h-4 shrink-0" /> Follow-up scheduled {fmtDate(lead.followUpDate)} {fmtTime(lead.followUpDate)}</>
              }
            </div>
          )}

          {/* Project notes from form */}
          {lead.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Project Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{lead.notes}</p>
            </div>
          )}

          {/* Add note */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Add Note</p>
            <form onSubmit={submitNote} className="space-y-2">
              <textarea
                ref={noteRef}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={2}
                placeholder="Log a call, update, or next step…"
                className="input-field resize-none text-sm"
              />
              <button type="submit" disabled={!noteText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-green text-white text-sm font-semibold
                           rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ minHeight: 40 }}>
                <MessageSquare className="w-3.5 h-3.5" /> Save Note
              </button>
            </form>
          </div>

          {/* Activity log */}
          {log.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Activity</p>
              <div className="space-y-3">
                {log.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <ActivityIcon type={entry.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{entry.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(entry.timestamp)} · {fmtTime(entry.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 shrink-0">
          <button onClick={() => onDeleteRequest({ id: lead.id, name: lead.name })}
            className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:text-red-700 hover:bg-red-50
                       rounded-lg text-sm font-semibold transition-colors w-full justify-center"
            style={{ minHeight: 44 }}>
            <Trash2 className="w-4 h-4" /> Delete Lead
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Kanban Card ────────────────────────────────────────────────────────── */
function LeadCard({ lead, onSelect, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onSelect(lead)}
      className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer
                 hover:shadow-md hover:border-gray-200 transition-all select-none group"
    >
      <p className="font-semibold text-gray-900 text-sm leading-tight">{lead.name}</p>
      <p className="text-xs text-gray-500 mt-0.5 truncate">{lead.service}</p>
      {lead.preferredDate && (
        <p className="text-xs text-gray-400 mt-1.5">
          {new Date(lead.preferredDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {lead.preferredTime ? ` · ${lead.preferredTime}` : ''}
        </p>
      )}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
        {lead.jobValue != null ? (
          <span className="text-xs font-bold text-brand-green">{fmt$(lead.jobValue)}</span>
        ) : (
          <span className="text-xs text-gray-300">No value set</span>
        )}
        {lead.followUpDate && !lead.followUpSent && (
          <span className="flex items-center gap-0.5 text-xs text-amber-500">
            <Clock className="w-3 h-3" /> Follow-up
          </span>
        )}
        {lead.followUpSent && (
          <span className="flex items-center gap-0.5 text-xs text-green-500">
            <Send className="w-3 h-3" /> Sent
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Kanban Column ──────────────────────────────────────────────────────── */
function KanbanColumn({ status, leads, onDrop, onDragOver, onDragStart, onSelectLead }) {
  const [over, setOver] = useState(false)
  const colValue = leads.reduce((sum, l) => sum + (l.jobValue || 0), 0)

  return (
    <div className="flex flex-col min-w-[200px] flex-1 max-w-[240px]">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${COL_DOT[status]}`} />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{status}</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-medium">{leads.length}</span>
      </div>
      {colValue > 0 && (
        <p className="text-xs font-semibold text-gray-500 px-1 mb-2">{fmt$(colValue)}</p>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { setOver(false); onDrop(e, status) }}
        className={`flex flex-col gap-2 min-h-[120px] p-2 rounded-xl flex-1 transition-colors ${
          over ? 'bg-brand-green/10 border-2 border-brand-green/30 border-dashed' : 'bg-gray-50'
        }`}
      >
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onSelect={onSelectLead}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Team Management Card ───────────────────────────────────────────────── */
const INVITE_ROLES = [
  {
    value: 'office_staff',
    label: 'Office Staff',
    description: 'Manages leads, pipeline, and calendar. Can add notes, update statuses, and export data. No access to team or settings.',
  },
  {
    value: 'technician',
    label: 'Technician',
    description: 'Field crew access. Sees the calendar and their scheduled appointments only. Cannot view leads or financial data.',
  },
]

function TeamManagementCard({ teamMembers, inviteEmail, setInviteEmail, inviteRole, setInviteRole, inviteLoading, onInvite, onRemove, onMount }) {
  useEffect(() => { onMount() }, [])

  const selectedRole = INVITE_ROLES.find(r => r.value === inviteRole)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-bold text-brand-dark text-lg mb-1 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-brand-green" /> Team Management
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        Invite employees by email. They'll receive a link to set their password.
      </p>

      {/* Invite form */}
      <form onSubmit={onInvite} className="mb-6">
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            className="input-field flex-1" style={{ minWidth: 200 }}
            placeholder="employee@example.com" required
          />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
            className="input-field" style={{ minWidth: 160 }}>
            {INVITE_ROLES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="submit" disabled={inviteLoading || !inviteEmail.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-green text-white font-semibold
                       text-sm rounded-lg hover:bg-brand-dark transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: 44 }}>
            {inviteLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              : <><Send className="w-4 h-4" /> Send Invite</>}
          </button>
        </div>
        {selectedRole && (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <span className="font-semibold text-gray-700">{selectedRole.label}: </span>
            {selectedRole.description}
          </p>
        )}
      </form>

      {/* Team members list */}
      {teamMembers.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No team members yet. Send your first invite above.</p>
      ) : (
        <div className="space-y-2">
          {teamMembers.map(member => (
            <div key={member.id}
              className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
                  <span className="text-brand-green font-bold text-sm">
                    {(member.full_name || member.email || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {member.full_name || <span className="text-gray-400 italic">Name not set</span>}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  member.role === 'owner'        ? 'bg-brand-green/10 text-brand-green' :
                  member.role === 'office_staff' ? 'bg-blue-50 text-blue-700' :
                                                   'bg-gray-100 text-gray-600'
                }`}>
                  {ROLE_LABELS[member.role] || member.role}
                </span>
                {member.role !== 'owner' && (
                  <button onClick={() => onRemove(member)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove member">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Skeleton Row ───────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded w-full" style={{ maxWidth: i === 8 ? 32 : '100%' }} />
        </td>
      ))}
    </tr>
  )
}

const ROLE_LABELS = { owner: 'Owner', office_staff: 'Office Staff', technician: 'Technician' }

/* ── Admin Page ─────────────────────────────────────────────────────────── */
export default function Admin() {
  const [authed, setAuthed]             = useState(isAuthenticated())
  const [userRole, setUserRole]         = useState(isAuthenticated() ? 'owner' : null)
  const [loginTab, setLoginTab]         = useState('owner')  // 'owner' | 'team'
  const [password, setPassword]         = useState('')
  const [teamEmail, setTeamEmail]       = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [loginErr, setLoginErr]         = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [leads, setLeads]               = useState([])
  const [isLoading, setIsLoading]       = useState(false)
  const [view, setView]                 = useState('pipeline')
  const [calYear, setCalYear]           = useState(new Date().getFullYear())
  const [calMonth, setCalMonth]         = useState(new Date().getMonth())
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast]               = useState(null)
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [settings, setSettings]         = useState(getSettings())
  const [settingsDateInput, setSettingsDateInput] = useState('')
  const [teamMembers, setTeamMembers]   = useState([])
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteRole, setInviteRole]     = useState('technician')
  const [inviteLoading, setInviteLoading] = useState(false)
  const followUpChecked = useRef(false)

  /* derive drawer lead from live leads array so it's never stale */
  const drawerLead = selectedLeadId ? leads.find(l => l.id === selectedLeadId) ?? null : null

  /* Check for existing Supabase session on mount (team member returning) */
  useEffect(() => {
    if (authed) return
    getCurrentUserProfile().then(profile => {
      if (profile) {
        setUserRole(profile.role)
        setAuthed(true)
      }
    })
  }, [])

  const loadLeads = useCallback(() => {
    setIsLoading(true)
    const t = setTimeout(() => {
      let data = getLeads()
      if (data.length === 0) data = seedDemoData()
      setLeads(data)
      setIsLoading(false)
    }, 180)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (authed) return loadLeads()
  }, [authed, loadLeads])

  /* Automated follow-up — runs once after initial load */
  useEffect(() => {
    if (isLoading || !authed || followUpChecked.current || leads.length === 0) return
    followUpChecked.current = true
    const now = Date.now()
    const due = leads.filter(l =>
      l.followUpDate && !l.followUpSent && new Date(l.followUpDate).getTime() <= now
    )
    if (due.length === 0) return
    ;(async () => {
      for (const lead of due) {
        await sendFollowUpEmail(lead)
        markFollowUpSent(lead.id)
      }
      setLeads(getLeads())
      const names = due.map(l => l.name.split(' ')[0]).join(' & ')
      setToast({ message: `Follow-up email${due.length > 1 ? 's' : ''} sent to ${names}`, type: 'success' })
    })()
  }, [isLoading, authed, leads.length])

  function handleLogin(e) {
    e.preventDefault()
    if (login(password)) { setUserRole('owner'); setAuthed(true); setLoginErr('') }
    else setLoginErr('Incorrect password. Please try again.')
  }

  async function handleTeamLogin(e) {
    e.preventDefault()
    setLoginLoading(true); setLoginErr('')
    try {
      await loginWithEmail(teamEmail, teamPassword)
      const profile = await getCurrentUserProfile()
      if (!profile) throw new Error('Account not found. Contact your manager.')
      setUserRole(profile.role)
      setAuthed(true)
    } catch (err) {
      setLoginErr(err.message || 'Sign-in failed. Check your credentials.')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleLogout() {
    logout()
    await logoutTeam()
    setAuthed(false); setUserRole(null)
    setPassword(''); setTeamEmail(''); setTeamPassword('')
    setSelectedLeadId(null)
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    try {
      const invite = await createInvite(inviteEmail.trim(), inviteRole, null)
      const inviteLink = `${window.location.origin}/admin/accept-invite?token=${invite.token}`
      await sendInviteEmail({ toEmail: invite.email, role: invite.role, inviteLink })
      setInviteEmail('')
      setToast({ message: `Invite sent to ${invite.email}`, type: 'success' })
      loadTeamMembers()
    } catch (err) {
      setToast({ message: err.message || 'Failed to send invite', type: 'error' })
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRemoveMember(member) {
    try {
      await removeTeamMember(member.id)
      setTeamMembers(prev => prev.filter(m => m.id !== member.id))
      setToast({ message: `${member.full_name || member.email} removed`, type: 'success' })
    } catch (err) {
      setToast({ message: err.message || 'Could not remove member', type: 'error' })
    }
  }

  function loadTeamMembers() {
    getTeamMembers().then(setTeamMembers)
  }

  function handleStatusChange(id, status) {
    setLeads(updateLeadStatus(id, status))
  }

  function handleNoteAdd(id, text) {
    setLeads(addLeadNote(id, text))
  }

  function handleJobValueSave(id, value) {
    setLeads(updateLeadJobValue(id, value))
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      if (selectedLeadId === deleteTarget.id) setSelectedLeadId(null)
      setLeads(deleteLead(deleteTarget.id))
      setToast({ message: `${deleteTarget.name} has been deleted`, type: 'success' })
    } catch {
      setToast({ message: 'Could not delete lead — please try again', type: 'error' })
    }
    setDeleteTarget(null)
  }

  /* Kanban drag-and-drop */
  function handleDragStart(e, leadId) {
    e.dataTransfer.setData('leadId', leadId)
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDrop(e, status) {
    const id = e.dataTransfer.getData('leadId')
    const lead = leads.find(l => l.id === id)
    if (lead && lead.status !== status) handleStatusChange(id, status)
  }

  /* Settings handlers */
  function handleSaveSettings() {
    saveSettings(settings)
    setToast({ message: 'Availability settings saved', type: 'success' })
  }
  function toggleWeekday(day) {
    setSettings(s => ({
      ...s,
      blocked_weekdays: s.blocked_weekdays.includes(day)
        ? s.blocked_weekdays.filter(d => d !== day)
        : [...s.blocked_weekdays, day],
    }))
  }
  function toggleTimeSlot(slot) {
    setSettings(s => ({
      ...s,
      time_slots: s.time_slots.includes(slot)
        ? s.time_slots.filter(t => t !== slot)
        : [...s.time_slots, slot].sort((a, b) => ALL_TIME_SLOTS.indexOf(a) - ALL_TIME_SLOTS.indexOf(b)),
    }))
  }
  function handleAddBlockedDate() {
    if (!settingsDateInput || settings.blocked_dates.includes(settingsDateInput)) {
      setSettingsDateInput(''); return
    }
    setSettings(s => ({ ...s, blocked_dates: [...s.blocked_dates, settingsDateInput].sort() }))
    setSettingsDateInput('')
  }
  function handleRemoveBlockedDate(date) {
    setSettings(s => ({ ...s, blocked_dates: s.blocked_dates.filter(d => d !== date) }))
  }
  function handleSeedData() {
    seedDemoData(); loadLeads()
    setToast({ message: 'Demo leads loaded', type: 'success' })
    setView('pipeline')
  }

  /* ── Login screen ─────────────────────────────────────────────────── */
  if (!authed) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-brand-green rounded-xl flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark font-display">Dashboard Login</h1>
            <p className="text-gray-500 text-sm mt-1">Shield Pest Control</p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            {[['owner', 'Owner Access'], ['team', 'Team Sign In']].map(([key, label]) => (
              <button key={key} type="button"
                onClick={() => { setLoginTab(key); setLoginErr('') }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                  loginTab === key ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {loginTab === 'owner' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field" placeholder="Enter owner password"
                  required autoComplete="current-password"
                />
              </div>
              {loginErr && (
                <p className="text-red-600 text-sm flex items-center gap-1" role="alert">
                  <XCircle className="w-4 h-4 shrink-0" /> {loginErr}
                </p>
              )}
              <button type="submit" className="btn-primary w-full justify-center" style={{ minHeight: 48 }}>
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeamLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" value={teamEmail} onChange={e => setTeamEmail(e.target.value)}
                  className="input-field" placeholder="you@example.com"
                  required autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password" value={teamPassword} onChange={e => setTeamPassword(e.target.value)}
                  className="input-field" placeholder="Your password"
                  required autoComplete="current-password"
                />
              </div>
              {loginErr && (
                <p className="text-red-600 text-sm flex items-center gap-1" role="alert">
                  <XCircle className="w-4 h-4 shrink-0" /> {loginErr}
                </p>
              )}
              <button type="submit" disabled={loginLoading}
                className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ minHeight: 48 }}>
                {loginLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  /* ── Calendar data ────────────────────────────────────────────────── */
  const appointmentsByDay = {}
  leads.forEach(lead => {
    if (!lead.preferredDate) return
    const d = new Date(lead.preferredDate + 'T00:00:00')
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const day = d.getDate()
      if (!appointmentsByDay[day]) appointmentsByDay[day] = []
      appointmentsByDay[day].push(lead)
    }
  })
  const daysInMonth   = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay      = new Date(calYear, calMonth, 1).getDay()
  const today         = new Date()
  const monthHasAppts = Object.keys(appointmentsByDay).length > 0

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  /* ── KPI stats ────────────────────────────────────────────────────── */
  const PIPELINE_STATUSES = ['New','Contacted','Quoted','Booked']
  const pipelineValue  = leads
    .filter(l => PIPELINE_STATUSES.includes(l.status) && l.jobValue != null)
    .reduce((s, l) => s + l.jobValue, 0)
  const completedRevenue = leads
    .filter(l => l.status === 'Completed' && l.jobValue != null)
    .reduce((s, l) => s + l.jobValue, 0)
  const stats = {
    pipeline:  pipelineValue,
    completed: completedRevenue,
    new:       leads.filter(l => l.status === 'New').length,
    booked:    leads.filter(l => l.status === 'Booked').length,
  }

  /* ── Kanban leads grouped by status ──────────────────────────────── */
  const byStatus = Object.fromEntries(PIPELINE_COLS.map(s => [s, []]))
  leads.forEach(l => { if (byStatus[l.status]) byStatus[l.status].push(l) })

  /* ── Dashboard ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      <ConfirmDeleteModal
        lead={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Lead Drawer */}
      {drawerLead && (
        <LeadDrawer
          lead={drawerLead}
          onClose={() => setSelectedLeadId(null)}
          onStatusChange={handleStatusChange}
          onNoteAdd={handleNoteAdd}
          onJobValueSave={handleJobValueSave}
          onDeleteRequest={setDeleteTarget}
        />
      )}

      {/* Header */}
      <header className="bg-brand-dark shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-green rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SP</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-bold leading-tight">Shield Pest Control</p>
              <p className="text-gray-400 text-xs">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
            {[
              { key: 'pipeline', icon: <Kanban className="w-4 h-4" />,    label: 'Pipeline', roles: ['owner','office_staff'] },
              { key: 'table',    icon: <Users className="w-4 h-4" />,     label: 'Leads',    roles: ['owner','office_staff'] },
              { key: 'calendar', icon: <Calendar className="w-4 h-4" />,  label: 'Calendar', roles: ['owner','office_staff','technician'] },
              { key: 'settings', icon: <Settings className="w-4 h-4" />,  label: 'Settings', roles: ['owner','office_staff'] },
            ].filter(t => t.roles.includes(userRole)).map(({ key, icon, label }) => (
              <button key={key} onClick={() => setView(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === key ? 'bg-brand-green text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                style={{ minHeight: 44 }}>
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            {userRole && userRole !== 'owner' && (
              <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-white/10 rounded-lg text-xs text-gray-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                {ROLE_LABELS[userRole]}
              </span>
            )}
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                         text-gray-300 hover:text-white hover:bg-white/10 transition-colors ml-1"
              style={{ minHeight: 44 }}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pipeline Value',    value: fmt$(stats.pipeline),  color: 'text-brand-green', bg: 'bg-green-50',  raw: stats.pipeline },
            { label: 'Completed Revenue', value: fmt$(stats.completed), color: 'text-blue-600',    bg: 'bg-blue-50',   raw: stats.completed },
            { label: 'New Leads',         value: stats.new,             color: 'text-violet-600',  bg: 'bg-violet-50', raw: null },
            { label: 'Booked',            value: stats.booked,          color: 'text-green-600',   bg: 'bg-green-50',  raw: null },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5`}>
              {isLoading
                ? <div className="h-9 w-20 bg-white/60 rounded animate-pulse mb-1" />
                : <p className={`text-2xl sm:text-3xl font-bold ${s.color}`}>{s.value}</p>
              }
              <p className="text-gray-600 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Pipeline (Kanban) ─────────────────────────────────────────── */}
        {view === 'pipeline' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-brand-dark text-lg flex items-center gap-2">
                <Kanban className="w-5 h-5 text-brand-green" /> Pipeline
              </h2>
              <p className="text-xs text-gray-400">Drag cards between columns to update status</p>
            </div>
            <div className="overflow-x-auto">
              <div className="flex gap-4 p-6 min-w-max">
                {PIPELINE_COLS.map(status => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    leads={byStatus[status] || []}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onDragStart={handleDragStart}
                    onSelectLead={(lead) => setSelectedLeadId(lead.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Leads table ──────────────────────────────────────────────── */}
        {view === 'table' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-brand-dark text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-green" /> All Leads
              </h2>
              <button
                onClick={exportLeadsCSV}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200
                           text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                style={{ minHeight: 40 }}>
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            {isLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                    <tr>{['Name','Phone','Email','Service','Date','Time','Value','Status',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
                  </tbody>
                </table>
              </div>
            ) : leads.length === 0 ? (
              <div className="py-20 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">No leads yet</p>
                <p className="text-sm text-gray-400 mt-1">Submissions from the booking form will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                    <tr>{['Name','Phone','Email','Service','Date','Time','Value','Status',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leads.map(lead => (
                      <tr key={lead.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedLeadId(lead.id)}>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{lead.name}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 hover:text-brand-green">
                            <Phone className="w-3 h-3" />{lead.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 hover:text-brand-green">
                            <Mail className="w-3 h-3" />{lead.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{lead.service}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{lead.preferredDate || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{lead.preferredTime || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{fmt$(lead.jobValue)}</td>
                        <td className="px-4 py-3">
                          <span className="status-pill"
                            style={{
                              background: STATUS_BG[lead.status] || 'var(--badge-inactive-bg)',
                              color:      STATUS_FG[lead.status] || 'var(--badge-inactive-text)',
                            }}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: lead.id, name: lead.name }) }}
                            className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            style={{ minWidth: 44, minHeight: 44 }}
                            aria-label={`Delete ${lead.name}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Calendar view ─────────────────────────────────────────────── */}
        {view === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ minWidth: 44, minHeight: 44 }} aria-label="Previous month">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="font-bold text-brand-dark text-lg">{MONTH_NAMES[calMonth]} {calYear}</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ minWidth: 44, minHeight: 44 }} aria-label="Next month">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/50" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day
                const appts = appointmentsByDay[day] || []
                return (
                  <div key={day}
                    className={`min-h-[80px] border-b border-r border-gray-100 p-2 transition-colors ${isToday ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <span className={`text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full ${
                      isToday ? 'bg-brand-green text-white' : 'text-gray-700'
                    }`}>{day}</span>
                    <div className="mt-1 space-y-1">
                      {appts.slice(0, 2).map(a => (
                        <button key={a.id}
                          onClick={() => setSelectedLeadId(a.id)}
                          className="text-xs bg-brand-green/10 text-brand-green font-medium rounded px-1.5 py-0.5 truncate w-full text-left hover:bg-brand-green/20 transition-colors">
                          {a.name}
                        </button>
                      ))}
                      {appts.length > 2 && <div className="text-xs text-gray-400 pl-1">+{appts.length - 2} more</div>}
                    </div>
                  </div>
                )
              })}
            </div>
            {isLoading ? (
              <div className="px-6 py-8 border-t border-gray-100 text-center">
                <div className="spinner spinner--sm mx-auto" />
              </div>
            ) : monthHasAppts ? (
              <div className="px-6 py-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">Appointments this month</p>
                <div className="space-y-2">
                  {Object.entries(appointmentsByDay)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([day, appts]) => appts.map(a => (
                      <button key={a.id}
                        onClick={() => setSelectedLeadId(a.id)}
                        className="flex items-center gap-3 text-sm flex-wrap w-full text-left hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                        <span className="w-16 text-gray-500 shrink-0">{MONTH_NAMES[calMonth].slice(0,3)} {day}</span>
                        <span className="font-medium text-gray-800">{a.name}</span>
                        <span className="text-gray-400">—</span>
                        <span className="text-gray-600">{a.service}</span>
                        <span className="status-pill ml-auto"
                          style={{ background: STATUS_BG[a.status], color: STATUS_FG[a.status] }}>
                          {a.status}
                        </span>
                      </button>
                    )))}
                </div>
              </div>
            ) : (
              <div className="px-6 py-14 border-t border-gray-100 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">No appointments this month</p>
                <p className="text-sm text-gray-400 mt-1">Book a service from the homepage and it will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Settings view ─────────────────────────────────────────────── */}
        {view === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-brand-dark text-lg mb-1 flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-green" /> Availability Settings
              </h2>
              <p className="text-sm text-gray-500 mb-6">Configure which days and times customers can request appointments.</p>

              <p className="text-sm font-semibold text-gray-700 mb-3">Days Off</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {ALL_WEEKDAYS.map((label, idx) => {
                  const blocked = settings.blocked_weekdays.includes(idx)
                  return (
                    <button key={label} onClick={() => toggleWeekday(idx)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                        blocked
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-green hover:text-brand-green'
                      }`}
                      style={{ minHeight: 44 }}>
                      {label}{blocked && <span className="ml-1 text-xs">(off)</span>}
                    </button>
                  )
                })}
              </div>

              <p className="text-sm font-semibold text-gray-700 mb-3">Available Time Slots</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {ALL_TIME_SLOTS.map(slot => {
                  const active = settings.time_slots.includes(slot)
                  return (
                    <button key={slot} onClick={() => toggleTimeSlot(slot)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                        active
                          ? 'bg-brand-green/10 border-brand-green/40 text-brand-green'
                          : 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                      }`}
                      style={{ minHeight: 40 }}>
                      {slot}
                    </button>
                  )
                })}
              </div>

              <p className="text-sm font-semibold text-gray-700 mb-3">Block Specific Dates</p>
              <div className="flex gap-2 mb-3">
                <input type="date" value={settingsDateInput}
                  onChange={e => setSettingsDateInput(e.target.value)}
                  className="input-field flex-1" style={{ maxWidth: 200 }} />
                <button onClick={handleAddBlockedDate} disabled={!settingsDateInput}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-semibold
                             hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ minHeight: 44 }}>
                  <Plus className="w-4 h-4" /> Block Date
                </button>
              </div>
              {settings.blocked_dates.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No specific dates blocked.</p>
              ) : (
                <ul className="space-y-1.5">
                  {settings.blocked_dates.map(date => (
                    <li key={date} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm">
                      <span className="text-red-700 font-medium">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <button onClick={() => handleRemoveBlockedDate(date)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors rounded"
                        aria-label={`Remove ${date}`}>
                        <XIcon className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex justify-end">
                <button onClick={handleSaveSettings} className="btn-primary" style={{ minHeight: 44 }}>
                  Save Settings
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-brand-dark text-base mb-1 flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-400" /> Demo Data
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Load 10 sample leads with realistic pest control data to preview the dashboard. Replaces existing leads.
              </p>
              <button onClick={handleSeedData}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                           font-semibold text-sm rounded-lg transition-colors"
                style={{ minHeight: 44 }}>
                <Database className="w-4 h-4" /> Load Demo Leads
              </button>
            </div>

            {/* Team Management — owner only */}
            {userRole === 'owner' && (
              <TeamManagementCard
                teamMembers={teamMembers}
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                inviteRole={inviteRole}
                setInviteRole={setInviteRole}
                inviteLoading={inviteLoading}
                onInvite={handleInvite}
                onRemove={handleRemoveMember}
                onMount={loadTeamMembers}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
