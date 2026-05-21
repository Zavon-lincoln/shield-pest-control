import { supabase } from '../lib/supabase'

export async function loginWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function logoutTeam() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getCurrentUserProfile() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
  return data
}

export async function createInvite(email, role, invitedBy) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('team_invites')
    .insert({ email: email.toLowerCase().trim(), role, invited_by: invitedBy })
    .select()
    .single()
  if (error) throw error
  return data
}

const DEMO_TEAM = [
  { id: 'demo_1', email: 'linda.k@shieldpest.com',  full_name: 'Linda Kowalski', role: 'office_staff', created_at: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: 'demo_2', email: 'marcus.w@shieldpest.com', full_name: 'Marcus Webb',    role: 'technician',   created_at: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: 'demo_3', email: 'tony.e@shieldpest.com',   full_name: 'Tony Esparza',   role: 'technician',   created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
]

export async function getTeamMembers() {
  if (!supabase) return DEMO_TEAM
  const { data, error } = await supabase.from('profiles').select('*').order('created_at')
  if (error) return DEMO_TEAM
  return data?.length ? data : DEMO_TEAM
}

export async function removeTeamMember(id) {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) throw error
}

export async function getInviteByToken(token) {
  if (!supabase) return null
  const { data } = await supabase
    .from('team_invites')
    .select('email, role')
    .eq('token', token)
    .is('accepted_at', null)
    .single()
  return data
}

export async function acceptInvite(token, password, fullName) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: invite, error: invErr } = await supabase
    .from('team_invites')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .single()
  if (invErr || !invite) throw new Error('This invite link is invalid or has already been used.')

  const { data, error } = await supabase.auth.signUp({
    email: invite.email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error

  await supabase
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return { data, invite }
}
