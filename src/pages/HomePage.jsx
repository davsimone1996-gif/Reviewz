import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Feed from '../components/Feed/Feed'
import useAuthStore from '../store/authStore'
import AuthModal from '../components/Auth/AuthModal'
import Spinner from '../components/UI/Spinner'
import { Music2, Star, Users, Zap, ArrowRight } from 'lucide-react'
import { getFollowedArtists } from '../lib/supabase'
import { getAlbum } from '../lib/spotify'

// ─── Non-logged hero ─────────────────────────────────────────────────────────

function HeroSection({ onSignIn }) {
  return (
    <section className="relative overflow-hidden rounded-3xl mb-10 animate-fade-in">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-surface-100 to-surface-50 rounded-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent" />

      {/* Decorative circles */}
      <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-orange-400/10 blur-2xl" />

      <div className="relative px-8 py-14 sm:px-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center shadow-xl shadow-accent/30">
            <Music2 size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gradient">Reviewz</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
          Music you love,{' '}
          <span className="text-gradient">reviews you trust.</span>
        </h1>
        <p className="text-muted text-lg max-w-md mb-8 leading-relaxed">
          Discover, rate and share your favourite tracks and albums. Follow critics, earn reputation, build your musical identity.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onSignIn}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-base"
          >
            Get started <ArrowRight size={16} />
          </button>
          <a href="#feed" className="btn-secondary flex items-center gap-2 px-6 py-3 text-base">
            Browse reviews
          </a>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-6 mt-10">
          {[
            { icon: Star,   label: 'Honest ratings',    color: 'text-amber-400' },
            { icon: Users,  label: 'Social feed',        color: 'text-blue-400' },
            { icon: Zap,    label: 'Social score karma', color: 'text-purple-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-muted">
              <Icon size={15} className={color} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Releases hero (logged-in users) ─────────────────────────────────────────

const SLIDE_DURATION = 6000 // ms

function formatItalianDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ReleasesHero({ userId }) {
  // 1. Fetch followed artists
  const { data: followedArtists, isLoading: loadingArtists } = useQuery({
    queryKey: ['followed-artists', userId],
    queryFn: () => getFollowedArtists(userId),
    staleTime: 1000 * 60 * 5,
  })

  // 2. Fetch album details for each artist that has a last_release_id
  const artistsWithRelease = (followedArtists ?? []).filter((a) => a.last_release_id)

  const { data: albumDetails, isLoading: loadingAlbums } = useQuery({
    queryKey: ['hero-albums', artistsWithRelease.map((a) => a.last_release_id)],
    queryFn: async () => {
      const results = await Promise.all(
        artistsWithRelease.map((a) =>
          getAlbum(a.last_release_id).then((album) => ({ artist: a, album })).catch(() => null)
        )
      )
      return results.filter(Boolean)
    },
    enabled: artistsWithRelease.length > 0,
    staleTime: 1000 * 60 * 30,
  })

  // 3. Slideshow state
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)

  const slides = albumDetails ?? []
  const total = slides.length

  const goTo = useCallback((index) => {
    setCurrent(index)
    setProgress(0)
  }, [])

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total)
    setProgress(0)
  }, [total])

  // Auto-advance + progress bar
  useEffect(() => {
    if (total === 0) return

    setProgress(0)
    const startTime = Date.now()

    const frame = () => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100)
      setProgress(pct)
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(frame)
      }
    }
    const rafRef = { current: requestAnimationFrame(frame) }

    const timer = setTimeout(advance, SLIDE_DURATION)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timer)
    }
  }, [current, total, advance])

  // ── Loading state ──────────────────────────────────────────────
  if (loadingArtists || (artistsWithRelease.length > 0 && loadingAlbums)) {
    return (
      <div className="h-[70vh] min-h-[400px] flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  // ── No releases → return null (fall back to feed title) ────────
  if (!slides.length) return null

  const slide = slides[current]
  const { artist: artistRow, album } = slide

  return (
    <div className="relative h-[70vh] min-h-[400px] overflow-hidden mb-0 select-none">
      {/* Full-bleed blurred background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${album.cover_url})`, filter: 'blur(28px) brightness(0.45)', transform: 'scale(1.08)' }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Slide content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-5 px-6 text-center">
        {/* Album art */}
        {album.cover_url && (
          <img
            key={album.cover_url}
            src={album.cover_url}
            alt={album.title}
            className="w-48 h-48 rounded-2xl shadow-2xl object-cover animate-fade-in"
          />
        )}

        {/* Text */}
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/60">
            {artistRow.artist_name}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
            {album.title}
          </h2>
          {album.release_date && (
            <p className="text-sm text-white/50">{formatItalianDate(album.release_date)}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
        <div
          className="h-full bg-accent transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* "Nuove Uscite" pill button */}
      <Link
        to="/nuove-uscite"
        className="absolute bottom-5 right-5 z-20 bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg transition-colors"
      >
        Nuove Uscite →
      </Link>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuthStore()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      {!user && <HeroSection onSignIn={() => setShowAuth(true)} />}

      {user ? (
        <>
          <ReleasesHero userId={user.id} />
          <div id="feed" className="max-w-2xl mx-auto mt-6">
            <Feed />
          </div>
        </>
      ) : (
        <div id="feed" className="max-w-2xl mx-auto">
          <div className="mb-5 flex items-center justify-between animate-fade-in-up">
            <h2 className="text-lg font-semibold text-gray-100">Latest Reviews</h2>
          </div>
          <Feed />
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
