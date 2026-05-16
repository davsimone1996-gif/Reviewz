import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music2 } from 'lucide-react'
import { exchangeCodeForTokens } from '../lib/spotifyAuth'
import useAuthStore from '../store/authStore'

export default function SpotifyCallbackPage() {
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code        = params.get('code')
    const errorParam  = params.get('error')
    const returnState = params.get('state')
    const storedState = sessionStorage.getItem('spotify_oauth_state')

    if (errorParam) {
      setError('Accesso Spotify negato.')
      return
    }

    if (!code) {
      setError('Codice di autorizzazione mancante.')
      return
    }

    // CSRF check
    if (!storedState || returnState !== storedState) {
      setError('Risposta non valida da Spotify. Riprova.')
      return
    }
    sessionStorage.removeItem('spotify_oauth_state')

    exchangeCodeForTokens(code)
      .then(() => {
        const username = profile?.username
        if (username) {
          navigate(`/profile/${username}`, { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      })
      .catch((err) => {
        console.error(err)
        setError('Errore durante la connessione a Spotify. Riprova.')
      })
  }, [navigate, profile])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center shadow-lg animate-pulse">
        <Music2 size={32} className="text-white" />
      </div>

      {error ? (
        <>
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Torna indietro
          </button>
        </>
      ) : (
        <p className="text-muted">Connessione a Spotify in corso…</p>
      )}
    </div>
  )
}
