import { useState, useEffect } from 'react'
import { Home, Search, PlusCircle, User, Bell } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getUnreadNotificationsCount } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'

export default function BottomNav() {
  const { user, profile } = useAuthStore()
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    getUnreadNotificationsCount(user.id).then(setUnread).catch(() => {})

    const channel = supabase
      .channel(`bn-notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setUnread((n) => n + 1),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

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

        {user && (
          <Link
            to="/notifications"
            onClick={() => setUnread(0)}
            className={`relative flex flex-col items-center gap-0.5 flex-1 min-h-[56px] py-3 transition-colors ${isActive('/notifications') ? 'text-accent' : 'text-muted'}`}
          >
            <Bell size={22} strokeWidth={isActive('/notifications') ? 2.5 : 2} />
            {unread > 0 && (
              <span className="absolute top-2 left-1/2 translate-x-1 min-w-[15px] h-[15px] rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
            <span className="text-xs font-medium">Alert</span>
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
