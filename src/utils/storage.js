import { supabase } from '../lib/supabase'

const COMPANY_ID = 'shield-pest'
const LEADS_KEY  = 'shieldpest_leads'

/* ── Supabase sync helpers (fire-and-forget) ─────────────────────────────── */
function syncLead(lead) {
  if (!supabase) return
  supabase
    .from('leads')
    .upsert({ id: lead.id, company_id: COMPANY_ID, data: lead, submitted_at: lead.submittedAt })
    .then(() => {})
    .catch(() => {})
}

function syncLeads(leads) {
  if (!supabase || !leads.length) return
  supabase
    .from('leads')
    .upsert(leads.map(l => ({ id: l.id, company_id: COMPANY_ID, data: l, submitted_at: l.submittedAt })))
    .then(() => {})
    .catch(() => {})
}

function deleteSyncLead(id) {
  if (!supabase) return
  supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('company_id', COMPANY_ID)
    .then(() => {})
    .catch(() => {})
}

/* ── Hydrate from Supabase (called once on admin mount) ──────────────────── */
export async function hydrateFromSupabase() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('data')
      .eq('company_id', COMPANY_ID)
      .order('submitted_at', { ascending: false })
    if (error || !data?.length) return null
    const leads = data.map(row => row.data)
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads))
    return leads
  } catch { return null }
}

/* ── Leads ─────────────────────────────────────────────────────────────────── */
export function getLeads() {
  try { return JSON.parse(localStorage.getItem(LEADS_KEY) || '[]') }
  catch { return [] }
}

export function saveLead(lead) {
  const leads = getLeads()
  const newLead = {
    ...lead,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
    status: 'New',
    jobValue: null,
    followUpDate: null,
    followUpSent: false,
    activityLog: [{
      text: 'Lead submitted via website',
      type: 'system',
      timestamp: new Date().toISOString(),
    }],
  }
  leads.unshift(newLead)
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads))
  syncLead(newLead)
  return newLead
}

export function updateLeadStatus(id, status) {
  const leads = getLeads()
  const updated = leads.map(l => {
    if (l.id !== id) return l
    const logEntry = { text: `Status changed to ${status}`, type: 'status', timestamp: new Date().toISOString() }
    const followUpDate = status === 'Contacted'
      ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      : l.followUpDate
    const followUpSent = status === 'Contacted' ? false : l.followUpSent
    return { ...l, status, followUpDate, followUpSent, activityLog: [...(l.activityLog || []), logEntry] }
  })
  localStorage.setItem(LEADS_KEY, JSON.stringify(updated))
  const changed = updated.find(l => l.id === id)
  if (changed) syncLead(changed)
  return updated
}

export function deleteLead(id) {
  const updated = getLeads().filter(l => l.id !== id)
  localStorage.setItem(LEADS_KEY, JSON.stringify(updated))
  deleteSyncLead(id)
  return updated
}

export function addLeadNote(id, text) {
  const leads = getLeads()
  const updated = leads.map(l => {
    if (l.id !== id) return l
    const entry = { text, type: 'note', timestamp: new Date().toISOString() }
    return { ...l, activityLog: [...(l.activityLog || []), entry] }
  })
  localStorage.setItem(LEADS_KEY, JSON.stringify(updated))
  const changed = updated.find(l => l.id === id)
  if (changed) syncLead(changed)
  return updated
}

export function updateLeadJobValue(id, jobValue) {
  const leads = getLeads()
  const updated = leads.map(l => l.id === id ? { ...l, jobValue: parseFloat(jobValue) || null } : l)
  localStorage.setItem(LEADS_KEY, JSON.stringify(updated))
  const changed = updated.find(l => l.id === id)
  if (changed) syncLead(changed)
  return updated
}

export function updateLeadAppointment(id, preferredDate, preferredTime) {
  const leads = getLeads()
  const updated = leads.map(l => {
    if (l.id !== id) return l
    const dateStr = preferredDate
      ? new Date(preferredDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'TBD'
    const entry = { text: `Appointment updated to ${dateStr}${preferredTime ? ' at ' + preferredTime : ''}`, type: 'status', timestamp: new Date().toISOString() }
    return { ...l, preferredDate, preferredTime, activityLog: [...(l.activityLog || []), entry] }
  })
  localStorage.setItem(LEADS_KEY, JSON.stringify(updated))
  const changed = updated.find(l => l.id === id)
  if (changed) syncLead(changed)
  return updated
}

export function markFollowUpSent(id) {
  const leads = getLeads()
  const updated = leads.map(l => {
    if (l.id !== id) return l
    const entry = { text: 'Automated follow-up email sent to customer', type: 'follow_up', timestamp: new Date().toISOString() }
    return { ...l, followUpSent: true, activityLog: [...(l.activityLog || []), entry] }
  })
  localStorage.setItem(LEADS_KEY, JSON.stringify(updated))
  const changed = updated.find(l => l.id === id)
  if (changed) syncLead(changed)
  return updated
}

export function exportLeadsCSV() {
  const leads = getLeads()
  const headers = ['Name','Phone','Email','Service','Preferred Date','Preferred Time','Status','Job Value','Notes','Submitted']
  const rows = leads.map(l => [
    l.name, l.phone, l.email, l.service,
    l.preferredDate || '', l.preferredTime || '',
    l.status,
    l.jobValue != null ? l.jobValue : '',
    (l.notes || '').replace(/"/g, '""'),
    new Date(l.submittedAt).toLocaleDateString('en-US'),
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shieldpest-leads-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── Settings ──────────────────────────────────────────────────────────────── */
const SETTINGS_KEY = 'shieldpest_settings'

const DEFAULT_SETTINGS = {
  blocked_weekdays: [0],
  blocked_dates: [],
  time_slots: [
    '7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
    '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
  ],
}

export function getSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    return { ...DEFAULT_SETTINGS, ...stored }
  } catch { return DEFAULT_SETTINGS }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  if (supabase) {
    supabase
      .from('settings')
      .upsert({ company_id: COMPANY_ID, data: settings })
      .then(() => {})
      .catch(() => {})
  }
  return settings
}

/* ── Seed demo data ────────────────────────────────────────────────────────── */
export function seedDemoData() {
  const now = new Date()
  const d = (offset) => {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + offset)
    return dt.toISOString().split('T')[0]
  }
  const ts = (offsetDays, offsetHours = 0) =>
    new Date(Date.now() - offsetDays * 86400000 - offsetHours * 3600000).toISOString()

  const leads = [
    {
      name: 'David Morales', phone: '(702) 555-0142', email: 'david.m@gmail.com',
      service: 'Scorpion Control', preferredDate: d(-6), preferredTime: '9:00 AM',
      notes: 'Finding bark scorpions in master bedroom and garage — have two young kids',
      status: 'Completed', jobValue: 240, followUpDate: null, followUpSent: false,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(10) },
        { text: 'Status changed to Contacted', type: 'status', timestamp: ts(9) },
        { text: 'Automated follow-up email sent to customer', type: 'follow_up', timestamp: ts(7, 4) },
        { text: 'Status changed to Booked', type: 'status', timestamp: ts(7) },
        { text: 'Status changed to Completed', type: 'status', timestamp: ts(1) },
        { text: 'Treated perimeter and garage, customer very satisfied — wants quarterly plan', type: 'note', timestamp: ts(1) },
      ],
    },
    {
      name: 'Lisa Nguyen', phone: '(702) 555-3891', email: 'l.nguyen@outlook.com',
      service: 'Termite Treatment', preferredDate: d(-4), preferredTime: '10:00 AM',
      notes: 'Saw mud tubes in garage wall near water heater — older home built 1988',
      status: 'Completed', jobValue: 1650, followUpDate: null, followUpSent: false,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(8) },
        { text: 'Status changed to Contacted', type: 'status', timestamp: ts(7) },
        { text: 'Quoted $1,650 for liquid barrier treatment + 1-year warranty', type: 'note', timestamp: ts(6) },
        { text: 'Status changed to Quoted', type: 'status', timestamp: ts(6) },
        { text: 'Status changed to Booked', type: 'status', timestamp: ts(5) },
        { text: 'Status changed to Completed', type: 'status', timestamp: ts(2) },
      ],
    },
    {
      name: 'Carlos Espinoza', phone: '(702) 555-7204', email: 'c.espinoza@email.com',
      service: 'Rodent Control', preferredDate: d(-2), preferredTime: '8:00 AM',
      notes: 'Hearing scratching in attic at night, found droppings in pantry',
      status: 'Contacted', jobValue: 420,
      followUpDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      followUpSent: false,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(5) },
        { text: 'Left voicemail, will try again tomorrow', type: 'note', timestamp: ts(4) },
        { text: 'Status changed to Contacted', type: 'status', timestamp: ts(3) },
        { text: 'Quoted $420 for full exclusion + trap placement — waiting on approval', type: 'note', timestamp: ts(2) },
      ],
    },
    {
      name: 'Sarah Petersen', phone: '(702) 555-4417', email: 'sarah.p@gmail.com',
      service: 'Bed Bug Treatment', preferredDate: d(1), preferredTime: '11:00 AM',
      notes: 'Recently returned from travel, noticed bites and small bloodstains on sheets',
      status: 'Booked', jobValue: 895, followUpDate: null, followUpSent: false,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(6) },
        { text: 'Status changed to Contacted', type: 'status', timestamp: ts(5) },
        { text: 'Confirmed infestation on inspection call, quoted $895 heat treatment', type: 'note', timestamp: ts(4) },
        { text: 'Status changed to Quoted', type: 'status', timestamp: ts(4) },
        { text: 'Deposit received, prepped instructions sent to customer', type: 'note', timestamp: ts(2) },
        { text: 'Status changed to Booked', type: 'status', timestamp: ts(2) },
      ],
    },
    {
      name: 'Mike Thornton', phone: '(702) 555-8830', email: 'm.thornton@yahoo.com',
      service: 'Mosquito & Tick Control', preferredDate: d(2), preferredTime: '9:00 AM',
      notes: 'Large backyard with pool — hosting outdoor parties, want seasonal coverage',
      status: 'Booked', jobValue: 195, followUpDate: null, followUpSent: false,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(4) },
        { text: 'Status changed to Contacted', type: 'status', timestamp: ts(3) },
        { text: 'Status changed to Booked', type: 'status', timestamp: ts(2) },
      ],
    },
    {
      name: 'Jennifer Walsh', phone: '(702) 555-2295', email: 'jen.walsh@gmail.com',
      service: 'General Pest Control', preferredDate: d(4), preferredTime: '7:00 AM',
      notes: 'Quarterly service for 2,400 sqft home — ants and roaches main concern',
      status: 'Quoted', jobValue: 150, followUpDate: null, followUpSent: true,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(3) },
        { text: 'Status changed to Contacted', type: 'status', timestamp: ts(2, 8) },
        { text: 'Automated follow-up email sent to customer', type: 'follow_up', timestamp: ts(1, 4) },
        { text: 'Quoted $150/quarter for general pest plan', type: 'note', timestamp: ts(1) },
        { text: 'Status changed to Quoted', type: 'status', timestamp: ts(1) },
      ],
    },
    {
      name: 'Robert Kim', phone: '(702) 555-6603', email: 'robert.k@icloud.com',
      service: 'Commercial Pest Services', preferredDate: d(5), preferredTime: '8:00 AM',
      notes: 'Restaurant on Flamingo Rd — health inspection coming up, need full service',
      status: 'New', jobValue: null, followUpDate: null, followUpSent: false,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(1) },
      ],
    },
    {
      name: 'Amanda Foster', phone: '(702) 555-1187', email: 'a.foster@gmail.com',
      service: 'Wildlife Removal', preferredDate: d(7), preferredTime: '10:00 AM',
      notes: 'Pigeon problem on rooftop — droppings all over AC units',
      status: 'New', jobValue: null, followUpDate: null, followUpSent: false,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(0, 3) },
      ],
    },
    {
      name: 'Tom Bradley', phone: '(702) 555-9924', email: 'tom.b@outlook.com',
      service: 'Termite Treatment', preferredDate: d(-1), preferredTime: '3:00 PM',
      notes: 'New construction inspection required for mortgage approval',
      status: 'Cancelled', jobValue: null, followUpDate: null, followUpSent: false,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(7) },
        { text: 'Status changed to Contacted', type: 'status', timestamp: ts(6) },
        { text: 'Customer called to cancel — real estate deal fell through', type: 'note', timestamp: ts(4) },
        { text: 'Status changed to Cancelled', type: 'status', timestamp: ts(4) },
      ],
    },
    {
      name: 'Nicole Reyes', phone: '(702) 555-5512', email: 'n.reyes@gmail.com',
      service: 'Scorpion Control', preferredDate: d(9), preferredTime: '1:00 PM',
      notes: 'New construction home in Summerlin — builder-grade landscaping, lots of rock',
      status: 'Quoted', jobValue: 280, followUpDate: null, followUpSent: false,
      activityLog: [
        { text: 'Lead submitted via website', type: 'system', timestamp: ts(2) },
        { text: 'Status changed to Contacted', type: 'status', timestamp: ts(1, 8) },
        { text: 'Quoted $280 for scorpion barrier + UV inspection — customer considering annual plan', type: 'note', timestamp: ts(0, 4) },
        { text: 'Status changed to Quoted', type: 'status', timestamp: ts(0, 4) },
      ],
    },
  ]

  const seeded = leads.map((l, i) => ({
    ...l,
    id: `seed_${Date.now()}_${i}`,
    submittedAt: new Date(Date.now() - (10 - i) * 86400000).toISOString(),
  }))

  localStorage.setItem(LEADS_KEY, JSON.stringify(seeded))
  syncLeads(seeded)
  return seeded
}

/* ── Auth ──────────────────────────────────────────────────────────────────── */
const AUTH_KEY = 'shieldpest_auth'

export function login(password) {
  const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'ShieldPest@2026'
  if (password === adminPass) { sessionStorage.setItem(AUTH_KEY, 'true'); return true }
  return false
}
export function logout()          { sessionStorage.removeItem(AUTH_KEY) }
export function isAuthenticated() { return sessionStorage.getItem(AUTH_KEY) === 'true' }
