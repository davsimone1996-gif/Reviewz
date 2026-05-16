import { Home, Search, PlusCircle, User, Disc3 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function BottomNav() {
  const { user, profile } = useAuthStore()
  const location = useLocation()

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-100/95 backdrop-blur-xl border-t border-white/5">
      {/* paddingBottom covers the iOS home indicator area */}
      <div
        className="flex items-center justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 flex-1 min-h-[56px] py-3 transition-colors ${isActive('/') ? 'text-accent' : 'text-muted'}`}
        >
          <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} />
          <span className="text-xs font-medium">Home</span>
        </Link>

        <Link
          to="/search"
          className={`flex flex-col items-center gap-0.5 flex-1 min-h-[56px] py-3 transition-colors ${isActive('/search') ? 'text-accent' : 'text-muted'}`}
        >
          <Search size={22} strokeWidth={isActive('/search') ? 2.5 : 2} />
          <span className="text-xs font-medium">Search</span>
        </Link>

        <Link
          to="/nuove-uscite"
          className={`flex flex-col items-center gap-0.5 flex-1 min-h-[56px] py-3 transition-colors ${isActive('/nuove-uscite') ? 'text-accent' : 'text-muted'}`}
        >
          <Disc3 size={22} strokeWidth={isActive('/nuove-uscite') ? 2.5 : 2} />
          <span className="text-xs font-medium">Uscite</span>
        </Link>

        {user && (
          <Link
            to="/create"
            className={`flex flex-col items-center gap-0.5 flex-1 min-h-[56px] py-3 transition-colors ${isActive('/create') ? 'text-accent' : 'text-muted'}`}
          >
            <PlusCircle size={22} strokeWidth={isActive('/create') ? 2.5 : 2} />
            <span className="text-xs font-medium">Review</span>
          </Link>
        )}

        {user && profile ? (
          <Link
            to={`/profile/${profile.username}`}
            className={`flex flex-col items-center gap-0.5 flex-1 min-h-[56px] py-3 transition-colors ${isActive('/profile') ? 'text-accent' : 'text-muted'}`}
          >
            <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
            <span className="text-xs font-medium">Profile</span>
          </Link>
        ) : !user ? (
          <div className="flex-1" />
        ) : null}
      </div>
    </nav>
  )
}
