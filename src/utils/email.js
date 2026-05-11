import emailjs from '@emailjs/browser'
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY'
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'
const CLIENT_TEMPLATE_ID = 'YOUR_CLIENT_TEMPLATE_ID'
const OWNER_TEMPLATE_ID  = 'YOUR_OWNER_TEMPLATE_ID'
const OWNER_EMAIL        = 'owner@shieldpestcontrol.com'
export async function sendConfirmationEmail(lead) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, CLIENT_TEMPLATE_ID, {
      to_name: lead.name, to_email: lead.email, service: lead.service,
      date: lead.preferredDate, time: lead.preferredTime,
      company: 'Shield Pest Control', phone: '(702) 555-0458',
    }, EMAILJS_PUBLIC_KEY)
  } catch (err) { console.warn('Email (client) not sent:', err) }
}
export async function sendOwnerNotification(lead) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, OWNER_TEMPLATE_ID, {
      owner_email: OWNER_EMAIL, lead_name: lead.name, lead_phone: lead.phone,
      lead_email: lead.email, service: lead.service,
      date: lead.preferredDate, time: lead.preferredTime, notes: lead.notes || 'None',
    }, EMAILJS_PUBLIC_KEY)
  } catch (err) { console.warn('Email (owner) not sent:', err) }
}
