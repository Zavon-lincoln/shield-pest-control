import emailjs from '@emailjs/browser'

const PUBLIC_KEY        = import.meta.env.VITE_EMAILJS_PUBLIC_KEY        || ''
const SERVICE_ID        = import.meta.env.VITE_EMAILJS_SERVICE_ID        || ''
const CLIENT_TEMPLATE   = import.meta.env.VITE_EMAILJS_CLIENT_TEMPLATE_ID || ''
const OWNER_TEMPLATE    = import.meta.env.VITE_EMAILJS_OWNER_TEMPLATE_ID  || ''
const FOLLOWUP_TEMPLATE = import.meta.env.VITE_EMAILJS_FOLLOWUP_TEMPLATE_ID || ''
const INVITE_TEMPLATE   = import.meta.env.VITE_EMAILJS_INVITE_TEMPLATE_ID   || ''
const OWNER_EMAIL       = 'demo@shieldpestcontrol.com'

const configured = () => PUBLIC_KEY && PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY'

export async function sendConfirmationEmail(lead) {
  if (!configured()) { console.warn('EmailJS not configured — add keys to .env'); return }
  try {
    await emailjs.send(SERVICE_ID, CLIENT_TEMPLATE, {
      to_name:  lead.name,
      to_email: lead.email,
      service:  lead.service,
      date:     lead.preferredDate,
      time:     lead.preferredTime,
      company:  'Shield Pest Control',
      phone:    '(702) 555-0284',
    }, PUBLIC_KEY)
  } catch (err) {
    console.warn('Confirmation email failed:', err)
  }
}

export async function sendOwnerNotification(lead) {
  if (!configured()) return
  try {
    await emailjs.send(SERVICE_ID, OWNER_TEMPLATE, {
      owner_email: OWNER_EMAIL,
      lead_name:   lead.name,
      lead_phone:  lead.phone,
      lead_email:  lead.email,
      service:     lead.service,
      date:        lead.preferredDate,
      time:        lead.preferredTime,
      notes:       lead.notes || 'None',
    }, PUBLIC_KEY)
  } catch (err) {
    console.warn('Owner notification failed:', err)
  }
}

export async function sendInviteEmail({ toEmail, role, inviteLink }) {
  if (!configured()) {
    console.info('EmailJS not configured — invite simulated for:', toEmail)
    return
  }
  try {
    await emailjs.send(SERVICE_ID, INVITE_TEMPLATE, {
      to_email:    toEmail,
      role:        role,
      invite_link: inviteLink,
      company:     'Shield Pest Control',
    }, PUBLIC_KEY)
  } catch (err) {
    console.warn('Invite email failed:', err)
  }
}

export async function sendFollowUpEmail(lead) {
  if (!configured()) {
    console.info('EmailJS not configured — follow-up simulated for:', lead.name)
    return
  }
  try {
    await emailjs.send(SERVICE_ID, FOLLOWUP_TEMPLATE, {
      to_name:  lead.name,
      to_email: lead.email,
      service:  lead.service,
      company:  'Shield Pest Control',
      phone:    '(702) 555-0284',
    }, PUBLIC_KEY)
  } catch (err) {
    console.warn('Follow-up email failed:', err)
  }
}
