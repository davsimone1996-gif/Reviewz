import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, PlusCircle, LogOut, Music2, X } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import AuthModal from '../Auth/AuthModal'
import Avatar from '../UI/Avatar'
import ScoreBadge from '../UI/ScoreBadge'

export default function Navbar() {
  const [showAuth, setShowAuth] = useState(false)
  const [searchQ, setSearchQ]   = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, profile, logout } = useAuthStore()
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile search on route change
  useEffect(() => { setSearchOpen(false) }, [location])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQ.trim()) navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`)
  }

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'glass shadow-2xl shadow-black/50' : 'bg-surface/80 backdrop-blur-md'
      } border-b border-white/5`}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center shadow-lg shadow-accent/30 group-hover:shadow-accent/50 transition-shadow">
              <Music2 size={16} className="text-white" />
            </div>
            <span className="font-bold text-base text-gradient hidden sm:block">Reviewz</span>
          </Link>

          {/* Desktop search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xs">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search music…"
                className="input pl-9 py-1.5 text-sm h-9"
              />
            </div>
          </form>

          <div className="flex-1" />

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="md:hidden btn-ghost p-2"
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {/* Create review button */}
              <Link
                to="/create"
                className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-sm"
              >
                <PlusCircle size={15} />
                <span className="hidden sm:block">Review</span>
              </Link>

              {/* User menu */}
              <Link
                to={`/profile/${profile?.username ?? ''}`}
                className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-surface-200 transition-colors group"
              >
                <Avatar src={profile?.avatar_url} username={profile?.username} size="sm" />
                <div className="hidden sm:block leading-none">
                  <p className="text-sm font-medium">{profile?.username}</p>
                  {profile && <ScoreBadge score={profile.social_score} />}
                </div>
              </Link>

              <button
                onClick={logout}
                title="Sign out"
                className="btn-ghost p-2 text-muted hover:text-red-400"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="btn-primary text-sm py-1.5 px-4"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3 animate-fade-in">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search tracks or albums…"
                  className="input pl-9 py-2 text-sm"
                  autoFocus
                />
              </div>
            </form>
          </div>
        )}
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
