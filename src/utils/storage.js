const LEADS_KEY = 'shield_leads'
export function getLeads() {
  try { return JSON.parse(localStorage.getItem(LEADS_KEY) || '[]') } catch { return [] }
}
export function saveLead(lead) {
  const leads = getLeads()
  const newLead = { ...lead, id: Date.now().toString(), submittedAt: new Date().toISOString(), status: 'New' }
  leads.unshift(newLead)
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads))
  return newLead
}
export function updateLeadStatus(id, status) {
  const leads = getLeads()
  const updated = leads.map(l => l.id === id ? { ...l, status } : l)
  localStorage.setItem(LEADS_KEY, JSON.stringify(updated))
  return updated
}
const AUTH_KEY = 'shield_auth'
export function login(password) {
  if (password === 'Vegas@9471') { sessionStorage.setItem(AUTH_KEY, 'true'); return true }
  return false
}
export function logout() { sessionStorage.removeItem(AUTH_KEY) }
export function isAuthenticated() { return sessionStorage.getItem(AUTH_KEY) === 'true' }
