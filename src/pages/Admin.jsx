import { useState, useEffect } from 'react'
import { LogOut, Calendar, Users, Lock, ChevronLeft, ChevronRight, Clock, Phone, Mail, XCircle } from 'lucide-react'
import { isAuthenticated, login, logout, getLeads, updateLeadStatus } from '../utils/storage'

const STATUS_OPTIONS = ['New', 'Contacted', 'Booked', 'Completed', 'Cancelled']
const STATUS_STYLES = {
  New:       'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  Booked:    'bg-green-100 text-green-800',
  Completed: 'bg-gray-100 text-gray-700',
  Cancelled: 'bg-red-100 text-red-800',
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay() }

export default function Admin() {
  const [authed, setAuthed]     = useState(isAuthenticated())
  const [password, setPassword] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [leads, setLeads]       = useState([])
  const [view, setView]         = useState('table')
  const [calYear, setCalYear]   = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())

  useEffect(() => { if (authed) setLeads(getLeads()) }, [authed])

  function handleLogin(e) {
    e.preventDefault()
    if (login(password)) { setAuthed(true); setLoginErr('') }
    else setLoginErr('Incorrect password.')
  }
  function handleLogout() { logout(); setAuthed(false); setPassword('') }
  function handleStatusChange(id, status) { setLeads(updateLeadStatus(id, status)) }
  function prevMonth() { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11) } else setCalMonth(m => m-1) }
  function nextMonth() { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0) } else setCalMonth(m => m+1) }

  if (!authed) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-brand-red rounded-xl flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark font-display tracking-wide">Admin Login</h1>
            <p className="text-gray-500 text-sm mt-1">Shield Pest Control</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="Enter admin password" required />
            </div>
            {loginErr && <p className="text-red-600 text-sm flex items-center gap-1"><XCircle className="w-4 h-4" /> {loginErr}</p>}
            <button type="submit" className="btn-primary w-full justify-center">Sign In</button>
          </form>
        </div>
      </div>
    )
  }

  const appointmentsByDay = {}
  leads.forEach(lead => {
    if (lead.preferredDate) {
      const d = new Date(lead.preferredDate + 'T00:00:00')
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate()
        if (!appointmentsByDay[day]) appointmentsByDay[day] = []
        appointmentsByDay[day].push(lead)
      }
    }
  })
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDay(calYear, calMonth)
  const today = new Date()
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'New').length,
    booked: leads.filter(l => l.status === 'Booked').length,
    completed: leads.filter(l => l.status === 'Completed').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-dark shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-red rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SP</span>
            </div>
            <div>
              <p className="text-white font-bold leading-tight font-display tracking-wide">SHIELD PEST CONTROL</p>
              <p className="text-gray-400 text-xs">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setView('table')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'table' ? 'bg-brand-red text-white' : 'text-gray-300 hover:text-white'}`}>
              <Users className="w-4 h-4" /> Leads
            </button>
            <button onClick={() => setView('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-brand-red text-white' : 'text-gray-300 hover:text-white'}`}>
              <Calendar className="w-4 h-4" /> Calendar
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors ml-2">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Leads', value: stats.total,    color: 'text-brand-red',  bg: 'bg-red-50' },
            { label: 'New',         value: stats.new,       color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Booked',      value: stats.booked,    color: 'text-green-600',  bg: 'bg-green-50' },
            { label: 'Completed',   value: stats.completed, color: 'text-gray-600',   bg: 'bg-gray-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5`}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-600 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {view === 'table' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-brand-dark text-lg flex items-center gap-2"><Users className="w-5 h-5 text-brand-red" /> All Leads</h2>
              <span className="text-sm text-gray-500">{leads.length} total</span>
            </div>
            {leads.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No leads yet</p>
                <p className="text-sm mt-1">Submissions from the booking form will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                    <tr>{['Name','Phone','Email','Service','Preferred Date','Time','Submitted','Status'].map(h => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leads.map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                        <td className="px-4 py-3 text-gray-600"><a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-brand-red"><Phone className="w-3 h-3" />{lead.phone}</a></td>
                        <td className="px-4 py-3 text-gray-600"><a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-brand-red"><Mail className="w-3 h-3" />{lead.email}</a></td>
                        <td className="px-4 py-3 text-gray-700">{lead.service}</td>
                        <td className="px-4 py-3 text-gray-700">{lead.preferredDate || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{lead.preferredTime || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(lead.submittedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</td>
                        <td className="px-4 py-3">
                          <select value={lead.status} onChange={e => handleStatusChange(lead.id, e.target.value)} className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-red ${STATUS_STYLES[lead.status]}`}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
              <h2 className="font-bold text-brand-dark text-lg font-display tracking-wide">{MONTH_NAMES[calMonth]} {calYear}</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/50" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day
                const appts = appointmentsByDay[day] || []
                return (
                  <div key={day} className={`min-h-[80px] border-b border-r border-gray-100 p-2 ${isToday ? 'bg-red-50' : 'hover:bg-gray-50'} transition-colors`}>
                    <span className={`text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday ? 'bg-brand-red text-white' : 'text-gray-700'}`}>{day}</span>
                    <div className="mt-1 space-y-1">
                      {appts.slice(0,2).map(a => <div key={a.id} className="text-xs bg-brand-red/10 text-brand-red font-medium rounded px-1.5 py-0.5 truncate">{a.name}</div>)}
                      {appts.length > 2 && <div className="text-xs text-gray-400 pl-1">+{appts.length-2} more</div>}
                    </div>
                  </div>
                )
              })}
            </div>
            {Object.keys(appointmentsByDay).length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-brand-red" /> Appointments this month</p>
                <div className="space-y-2">
                  {Object.entries(appointmentsByDay).sort(([a],[b]) => Number(a)-Number(b)).map(([day, appts]) =>
                    appts.map(a => (
                      <div key={a.id} className="flex items-center gap-3 text-sm">
                        <span className="w-16 text-gray-500 shrink-0">{MONTH_NAMES[calMonth].slice(0,3)} {day}</span>
                        <span className="font-medium text-gray-800">{a.name}</span>
                        <span className="text-gray-500">—</span>
                        <span className="text-gray-600">{a.service}</span>
                        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
