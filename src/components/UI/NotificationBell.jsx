import { useState, useEffect, useRef } from 'react'
import { Bell, UserPlus, Heart, MessageCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { fetchNotifications, markNotificationsRead, getUnreadNotificationsCount } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import Avatar from './Avatar'

function NotificationIcon({ type }) {
  if (type === 'follow')  return <UserPlus  size={14} className="text-blue-400" />
  if (type === 'like')    return <Heart     size={14} className="text-red-400"  />
  if (type === 'comment') return <MessageCircle size={14} className="text-green-400" />
  return null
}

function NotificationItem({ notification, onClose }) {
  const { type, actor, post_id, read, created_at } = notification

  const message = () => {
    if (type === 'follow')  return 'ha iniziato a seguirti'
    if (type === 'like')    return 'ha messo like alla tua recensione'
    if (type === 'comment') return 'ha commentato la tua recensione'
    return ''
  }

  const linkTo = post_id ? `/post/${post_id}` : `/profile/${actor?.username}`

  return (
    <Link
      to={linkTo}
      onClick={onClose}
      className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-200/50 transition-colors ${
        !read ? 'bg-accent/5 border-l-2 border-accent' : ''
      }`}
    >
      <Avatar src={actor?.avatar_url} username={actor?.username} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-100 leading-snug">
          <span className="font-semibold">{actor?.username}</span>{' '}
          {message()}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: it })}
        </p>
      </div>
      <NotificationIcon type={type} />
    </Link>
  )
}

export default function NotificationBell({ userId }) {
  const [open, setOpen]               = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread]           = useState(0)
  const [loading, setLoading]         = useState(false)
  const panelRef = useRef(null)

  // Load unread count on mount + realtime
  useEffect(() => {
    if (!userId) return

    getUnreadNotificationsCount(userId).then(setUnread).catch(() => {})

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => setUnread((n) => n + 1),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = async () => {
    setOpen((v) => !v)
    if (!open && userId) {
      setLoading(true)
      try {
        const data = await fetchNotifications(userId)
        setNotifications(data)
        if (unread > 0) {
          await markNotificationsRead(userId)
          setUnread(0)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="btn-ghost p-2 relative"
        title="Notifiche"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-y-auto bg-surface border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="font-semibold text-sm">Notifiche</span>
            <button onClick={() => setOpen(false)} className="btn-ghost p-1">
              <X size={14} />
            </button>
          </div>

          {loading && (
            <div className="py-8 flex justify-center text-muted text-sm">Caricamento…</div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="py-10 text-center text-muted text-sm">
              Nessuna notifica
            </div>
          )}

          {!loading && notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onClose={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  )
}
