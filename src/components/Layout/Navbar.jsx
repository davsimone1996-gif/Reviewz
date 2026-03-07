import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, PlusSquare, LogOut, User, Music2 } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import AuthModal from '../Auth/AuthModal'
import Avatar from '../UI/Avatar'
import ScoreBadge from '../UI/ScoreBadge'

export default function Navbar() {
  const [showAuth, setShowAuth]   = useState(false)
  const [searchQ, setSearchQ]     = useState('')
  const { user, profile, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQ.trim()) navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-surface-200 bg-surface/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-gray-100 shrink-0">
            <Music2 size={22} className="text-accent" />
            <span>Reviewz</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-sm">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search music…"
                className="input pl-9 py-1.5 text-sm"
              />
            </div>
          </form>

          <div className="flex-1" />

          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/create" className="btn-primary flex items-center gap-1.5 py-1.5 text-sm">
                <PlusSquare size={15} />
                <span className="hidden sm:block">Review</span>
              </Link>
              <Link to={`/profile/${profile?.username ?? ''}`} className="flex items-center gap-2 group">
                <Avatar src={profile?.avatar_url} username={profile?.username} size="sm" />
                <div className="hidden sm:block">
                  <p className="text-sm font-medium leading-none">{profile?.username}</p>
                  {profile && <ScoreBadge score={profile.social_score} />}
                </div>
              </Link>
              <button onClick={logout} title="Sign out" className="btn-ghost p-2">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="btn-primary text-sm py-1.5">
              Sign In
            </button>
          )}
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
