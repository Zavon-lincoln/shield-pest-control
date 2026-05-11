import { useState } from 'react'
import { Menu, X, Phone, Star, CheckCircle, Shield, Bug, Home as HomeIcon, Rat, Zap, Mail, MapPin, Clock, Send, Loader2, ArrowRight } from 'lucide-react'
import { saveLead } from '../utils/storage'
import { sendConfirmationEmail, sendOwnerNotification } from '../utils/email'

const SERVICES = [
  { icon: Bug,      title: 'General Pest Control',  desc: 'Eliminate ants, cockroaches, spiders, and 30+ other common pests with our EPA-approved treatments and prevention programs.' },
  { icon: HomeIcon, title: 'Termite Treatment',     desc: 'Protect your biggest investment with industry-leading termite inspections, baiting systems, and liquid barrier treatments.' },
  { icon: Rat,      title: 'Rodent Removal',        desc: 'Safely trap and remove mice, rats, and other rodents then seal entry points so they never come back.' },
  { icon: Zap,      title: 'Scorpion Barrier',      desc: 'Las Vegas-specific scorpion elimination with UV night inspections and perimeter barrier treatments.' },
]

const REVIEWS = [
  { name: 'Kevin A.',   loc: 'Henderson',  stars: 5, text: "Had scorpions getting into the house every summer. Shield set up their barrier system and we haven't seen a single one in over a year. Absolute lifesaver for my family." },
  { name: 'Rachel M.',  loc: 'Summerlin',  stars: 5, text: "Found termite damage and called Shield in a panic. They came out the same day, explained everything clearly, and had us treated by that weekend. Honest and professional." },
  { name: 'Jerome T.',  loc: 'Las Vegas',  stars: 5, text: "Monthly service plan is totally worth it. My home stays completely pest-free and the techs are always respectful and thorough. Highly recommend." },
]

const TIME_SLOTS = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM']

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', email:'', service:'', preferredDate:'', preferredTime:'', notes:'' })
  const [status, setStatus] = useState('idle')

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }
  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }
  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    try {
      saveLead(form)
      await Promise.all([sendConfirmationEmail(form), sendOwnerNotification(form)])
      setStatus('success')
      setForm({ name:'', phone:'', email:'', service:'', preferredDate:'', preferredTime:'', notes:'' })
    } catch { setStatus('error') }
  }

  return (
    <div className="min-h-screen">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/95 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold font-display text-lg tracking-wide">SHIELD <span className="text-brand-red">PEST</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {['services','about','reviews','booking'].map(s => (
                <button key={s} onClick={() => scrollTo(s)} className="text-gray-300 hover:text-white capitalize text-sm font-medium transition-colors">
                  {s === 'booking' ? 'Contact' : s}
                </button>
              ))}
              <button onClick={() => scrollTo('booking')} className="btn-primary py-2 text-sm">
                Free Inspection <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setMenuOpen(o => !o)} className="md:hidden text-white p-2">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-brand-dark border-t border-white/10 px-4 py-4 space-y-3">
            {['services','about','reviews','booking'].map(s => (
              <button key={s} onClick={() => scrollTo(s)} className="block w-full text-left text-gray-300 hover:text-white capitalize py-2 text-sm font-medium">
                {s === 'booking' ? 'Contact' : s}
              </button>
            ))}
            <button onClick={() => scrollTo('booking')} className="btn-primary w-full justify-center mt-2 text-sm">Free Inspection</button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="bg-brand-dark pt-16 min-h-screen flex items-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(230,57,70,0.08) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-red/20 text-red-300 text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-brand-red/30">
            <Shield className="w-4 h-4" /> Licensed & Guaranteed Pest Control
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-wide">
            PROTECT YOUR HOME.<br /><span className="text-brand-red">ELIMINATE PESTS.</span>
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            Las Vegas's toughest pest control company. Scorpions, termites, rodents — we handle it all with guaranteed results and EPA-safe treatments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button onClick={() => scrollTo('booking')} className="btn-primary text-base px-8 py-4">
              Book Free Inspection <ArrowRight className="w-5 h-5" />
            </button>
            <a href="tel:+17025550458" className="btn-outline text-base px-8 py-4">
              <Phone className="w-5 h-5" /> (702) 555-0458
            </a>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto sm:max-w-md">
            {[['8+','Years Protecting Homes'],['1,200+','Homes Treated'],['100%','Satisfaction Guarantee']].map(([n,l]) => (
              <div key={l} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <p className="text-brand-red font-bold font-display text-2xl">{n}</p>
                <p className="text-gray-300 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-3">Our Services</p>
            <h2 className="font-display text-4xl font-bold text-brand-dark tracking-wide">Complete Pest Elimination</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Targeted treatments for every pest problem Las Vegas homes face.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card group cursor-default">
                <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-red transition-colors duration-200">
                  <Icon className="w-6 h-6 text-brand-red group-hover:text-white transition-colors duration-200" />
                </div>
                <h3 className="font-display font-bold text-brand-dark text-lg mb-2 tracking-wide">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="section-label mb-3">Why Shield</p>
              <h2 className="font-display text-4xl font-bold text-brand-dark mb-6 tracking-wide">Las Vegas Pest Experts You Can Count On</h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                We've protected Las Vegas homes since 2017. Our technicians are state-licensed and trained specifically for the pests that thrive in the Mojave Desert — including bark scorpions, desert termites, and roof rats that most national chains don't know how to handle.
              </p>
              <ul className="space-y-3">
                {['Nevada-licensed pest control operators','EPA-approved, family & pet-safe treatments','Same-day and emergency service available','Free re-treatment if pests return within 30 days','Monthly, quarterly, and one-time service plans'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-brand-red shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Pet-Safe Treatments',    desc: 'All products are EPA-registered and safe for children and pets when dry' },
                { label: 'Desert Specialists',     desc: 'Experts in the specific pests that thrive in Nevada\'s Mojave Desert climate' },
                { label: 'Guaranteed Results',     desc: 'If pests return within 30 days we come back and re-treat at no charge' },
                { label: 'Fast Response',          desc: 'Same-day appointments for urgent pest problems — we prioritize your safety' },
              ].map(f => (
                <div key={f.label} className="bg-brand-dark rounded-2xl p-5 text-white">
                  <h4 className="font-display font-bold text-brand-red mb-2 tracking-wide">{f.label}</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-3">Customer Reviews</p>
            <h2 className="font-display text-4xl font-bold text-brand-dark tracking-wide">Trusted by Las Vegas Families</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {REVIEWS.map(r => (
              <div key={r.name} className="card">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: r.stars }).map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-600 leading-relaxed mb-6 italic">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red/10 rounded-full flex items-center justify-center">
                    <span className="text-brand-red font-bold text-sm">{r.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-brand-dark">{r.name}</p>
                    <p className="text-gray-400 text-xs">{r.loc}, NV</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKING FORM */}
      <section id="booking" className="py-24 bg-brand-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2 text-white">
              <p className="section-label mb-3">Book a Service</p>
              <h2 className="font-display text-4xl font-bold mb-6 tracking-wide">Schedule Your Free Inspection</h2>
              <p className="text-gray-300 leading-relaxed mb-10">No obligation. One of our technicians will inspect your property and provide a custom treatment plan and quote.</p>
              <div className="space-y-5">
                {[
                  { icon: Phone, label: 'Call Us',      val: '(702) 555-0458' },
                  { icon: Mail,  label: 'Email Us',     val: 'info@shieldpestcontrol.com' },
                  { icon: MapPin,label: 'Service Area', val: 'Las Vegas, Henderson & Valley' },
                  { icon: Clock, label: 'Hours',        val: 'Mon–Sat 7am–7pm' },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brand-red/20 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-brand-red" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-white font-medium">{val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              {status === 'success' ? (
                <div className="bg-white rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-brand-dark mb-2 tracking-wide">Inspection Request Sent!</h3>
                  <p className="text-gray-500 mb-6">We'll call you within 1 hour to confirm your free inspection appointment.</p>
                  <button onClick={() => setStatus('idle')} className="btn-primary">Submit Another Request</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                      <input name="name" value={form.name} onChange={handleChange} required className="input-field" placeholder="John Smith" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                      <input name="phone" type="tel" value={form.phone} onChange={handleChange} required className="input-field" placeholder="(702) 000-0000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} required className="input-field" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Needed *</label>
                    <select name="service" value={form.service} onChange={handleChange} required className="input-field">
                      <option value="">Select a service...</option>
                      {SERVICES.map(s => <option key={s.title} value={s.title}>{s.title}</option>)}
                    </select>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Date</label>
                      <input name="preferredDate" type="date" value={form.preferredDate} onChange={handleChange} className="input-field" min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Time</label>
                      <select name="preferredTime" value={form.preferredTime} onChange={handleChange} className="input-field">
                        <option value="">Select time...</option>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Describe the Problem</label>
                    <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="input-field resize-none" placeholder="What pests are you seeing? Where in the home? Any prior treatments?" />
                  </div>
                  {status === 'error' && <p className="text-red-600 text-sm">Something went wrong. Please call us at (702) 555-0458.</p>}
                  <button type="submit" disabled={status === 'loading'} className="btn-primary w-full justify-center py-4 text-base disabled:opacity-70">
                    {status === 'loading' ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : <><Send className="w-5 h-5" /> Schedule Free Inspection</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-brand-dark border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold font-display tracking-wide">SHIELD PEST CONTROL</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">Protecting Las Vegas homes from pests since 2017. Licensed, insured, and guaranteed.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-2">
                {SERVICES.map(s => <li key={s.title}><button onClick={() => scrollTo('services')} className="text-gray-400 hover:text-brand-red text-sm transition-colors">{s.title}</button></li>)}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand-red" /> (702) 555-0458</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-brand-red" /> info@shieldpestcontrol.com</li>
                <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-red" /> Mon–Sat 7am–7pm</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Shield Pest Control. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
