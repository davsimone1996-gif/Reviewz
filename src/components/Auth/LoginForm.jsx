import { useState } from 'react'
import { Mail, Lock, Loader2 } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function LoginForm({ onSuccess, onSwitch }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
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
        <label className="block text-sm text-muted mb-1">Email</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pl-9"
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pl-9"
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading && <Loader2 size={16} className="animate-spin" />}
        Sign In
      </button>

      <p className="text-center text-sm text-muted">
        No account?{' '}
        <button type="button" onClick={onSwitch} className="text-accent hover:underline">
          Register
        </button>
      </p>
    </form>
  )
}
