import { Home, Search, PlusCircle, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function BottomNav() {
  const { user, profile } = useAuthStore()
  const location = useLocation()

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-100/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: '56px' }}>

        <Link to="/" className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors ${isActive('/') ? 'text-accent' : 'text-muted'}`}>
          <Home size={21} strokeWidth={isActive('/') ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        <Link to="/search" className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors ${isActive('/search') ? 'text-accent' : 'text-muted'}`}>
          <Search size={21} strokeWidth={isActive('/search') ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Search</span>
        </Link>

        {user && (
          <Link to="/create" className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors ${isActive('/create') ? 'text-accent' : 'text-muted'}`}>
            <PlusCircle size={21} strokeWidth={isActive('/create') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Review</span>
          </Link>
        )}

        {user && profile ? (
          <Link
            to={`/profile/${profile.username}`}
            className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors ${isActive('/profile') ? 'text-accent' : 'text-muted'}`}
          >
            <User size={21} strokeWidth={isActive('/profile') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        ) : !user ? (
          <div className="flex-1" />
        ) : null}

      </div>
    </nav>
  )
}
