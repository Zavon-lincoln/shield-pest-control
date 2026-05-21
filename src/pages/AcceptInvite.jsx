import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { getInviteByToken, acceptInvite } from '../utils/team'

const ROLE_LABELS = {
  owner:        'Owner',
  office_staff: 'Office Staff',
  technician:   'Technician',
}

export default function AcceptInvite() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const token      = params.get('token') || ''

  const [invite,   setInvite]   = useState(null)  // { email, role }
  const [loading,  setLoading]  = useState(true)
  const [invalid,  setInvalid]  = useState(false)

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return }
    getInviteByToken(token).then(data => {
      if (!data) setInvalid(true)
      else setInvite(data)
      setLoading(false)
    })
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setError('')
    setSubmitting(true)
    try {
      await acceptInvite(token, password, fullName.trim())
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invite Not Found</h1>
          <p className="text-gray-500 text-sm">
            This invite link is invalid or has already been used. Ask your manager to send a new one.
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-brand-green" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Account Created!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Your account has been set up as <strong>{ROLE_LABELS[invite?.role] || invite?.role}</strong>.
            You can now sign in to the dashboard.
          </p>
          <button
            onClick={() => navigate('/admin')}
            className="btn-primary w-full justify-center"
            style={{ minHeight: 44 }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 bg-brand-green rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-brand-dark font-display">Set Your Password</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            You've been invited as <span className="font-semibold text-brand-dark">{ROLE_LABELS[invite.role] || invite.role}</span>
          </p>
          <p className="text-brand-green text-sm font-medium mt-0.5">{invite.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="input-field" placeholder="Jane Smith"
              required autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input-field" placeholder="At least 8 characters"
              required minLength={8} autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="input-field" placeholder="Repeat your password"
              required autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm flex items-center gap-1.5" role="alert">
              <XCircle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit" disabled={submitting}
            className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ minHeight: 48 }}>
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              : 'Create Account & Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
