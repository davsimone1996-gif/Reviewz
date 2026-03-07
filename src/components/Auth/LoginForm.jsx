import { useState } from 'react'
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function LoginForm({ onSuccess, onSwitch }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [err, setErr]           = useState(null)
  const [loading, setLoading]   = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      await login(email, password)
      onSuccess()
    } catch (error) {
      setErr(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Email</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="input pl-9" placeholder="you@example.com" required />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Password</label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
            className="input pl-9 pr-10" placeholder="••••••••" required />
          <button type="button" onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-100 transition-colors">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">
          {err}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
        {loading && <Loader2 size={15} className="animate-spin" />}
        Sign In
      </button>

      <p className="text-center text-xs text-muted">
        No account?{' '}
        <button type="button" onClick={onSwitch} className="text-accent hover:underline font-semibold">
          Register for free
        </button>
      </p>
    </form>
  )
}
