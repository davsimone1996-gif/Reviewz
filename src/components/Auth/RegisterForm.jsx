import { useState } from 'react'
import { Mail, Lock, User, Loader2, Eye, EyeOff, Music2, Check } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { updateProfile } from '../../lib/supabase'
import { startSpotifyAuth } from '../../lib/spotifyAuth'

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Metal', 'Indie', 'Soul', 'Reggae', 'Latin', 'K-Pop',
  'Punk', 'Blues', 'Folk', 'Dance', 'Lo-fi', 'Gospel',
]

const STEPS = ['Account', 'Generi', 'Spotify']

function StepIndicator({ step }) {
  return (
    <div className="flex items-center mb-6">
      {STEPS.map((label, i) => {
        const n    = i + 1
        const done = step > n
        const active = step === n
        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-accent text-white'    :
                         'bg-surface-200 text-muted'
              }`}>
                {done ? <Check size={9} /> : n}
              </div>
              <span className={`text-xs font-semibold hidden sm:block transition-colors ${active ? 'text-white' : 'text-muted'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-2 transition-colors ${done ? 'bg-green-500' : 'bg-surface-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function RegisterForm({ onSuccess, onSwitch }) {
  const [step, setStep]         = useState(1)
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [err, setErr]           = useState(null)
  const [loading, setLoading]   = useState(false)
  const [genres, setGenres]     = useState([])
  const [savingGenres, setSavingGenres] = useState(false)

  const { register, user } = useAuthStore()

  const handleStep1 = async (e) => {
    e.preventDefault()
    setErr(null)
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(email, password, username)
      setStep(2)
    } catch (error) {
      setErr(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleGenre = (g) =>
    setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])

  const handleStep2 = async () => {
    if (genres.length > 0 && user) {
      setSavingGenres(true)
      try {
        await updateProfile(user.id, { preferred_genres: genres })
      } catch (_) {}
      finally { setSavingGenres(false) }
    }
    setStep(3)
  }

  return (
    <div className="space-y-0">
      <StepIndicator step={step} />

      {/* ── Step 1: Account ─────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Username</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="input pl-9"
                placeholder="yourname"
                required minLength={3} maxLength={30}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
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
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-9 pr-10"
                placeholder="Min. 6 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-100 transition-colors"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {err && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">
              {err}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
            {loading && <Loader2 size={15} className="animate-spin" />}
            Crea Account
          </button>

          <p className="text-center text-xs text-muted">
            Hai già un account?{' '}
            <button type="button" onClick={onSwitch} className="text-accent hover:underline font-semibold">
              Accedi
            </button>
          </p>
        </form>
      )}

      {/* ── Step 2: Generi ──────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-0.5">Qual è il tuo gusto musicale?</p>
            <p className="text-xs text-muted mb-3">Seleziona i generi che ami (opzionale)</p>
            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    genres.includes(g)
                      ? 'bg-accent border-accent text-white shadow-md shadow-accent/20'
                      : 'bg-surface-200 border-transparent text-muted hover:text-white hover:bg-surface-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {genres.length > 0 && (
            <p className="text-xs text-accent font-semibold">{genres.length} selezionati</p>
          )}

          <button
            type="button"
            onClick={handleStep2}
            disabled={savingGenres}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
          >
            {savingGenres && <Loader2 size={15} className="animate-spin" />}
            Continua
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full text-center text-xs text-muted hover:text-white transition-colors py-1"
          >
            Salta
          </button>
        </div>
      )}

      {/* ── Step 3: Spotify ─────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1DB954]/10 border border-[#1DB954]/30 flex items-center justify-center mx-auto">
            <Music2 size={30} className="text-[#1DB954]" />
          </div>

          <div>
            <p className="font-semibold mb-1">Connetti Spotify</p>
            <p className="text-xs text-muted leading-relaxed">
              Condividi cosa stai ascoltando in tempo reale sul tuo profilo
            </p>
          </div>

          <button
            type="button"
            onClick={() => startSpotifyAuth()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold transition-colors"
          >
            <Music2 size={16} /> Connetti Spotify
          </button>

          <button
            type="button"
            onClick={onSuccess}
            className="w-full text-center text-xs text-muted hover:text-white transition-colors py-1"
          >
            Salta per ora
          </button>
        </div>
      )}
    </div>
  )
}
