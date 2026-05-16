import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, UserPlus, Heart, MessageCircle, Music2, X, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { fetchNotifications, markNotificationsRead, getUnreadNotificationsCount } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { showBrowserNotification, buildNotificationPayload } from '../../lib/webPush'
import Avatar from './Avatar'
import Spinner from './Spinner'

// ── Toast for incoming real-time notifications ────────────────────

function NotificationToast({ notification, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const msg =
    notification.type === 'follow'  ? 'ha iniziato a seguirti' :
    notification.type === 'like'    ? 'ha messo like alla tua recensione' :
                                      'ha commentato la tua recensione'

  const linkTo = notification.post_id
    ? `/post/${notification.post_id}`
    : `/profile/${notification.actor?.username}`

  return (
    <Link
      to={linkTo}
      onClick={onDismiss}
      className="fixed top-16 right-4 z-[60] max-w-xs w-full bg-surface-100 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 p-3 flex items-center gap-3 animate-fade-in-up"
    >
      <Avatar src={notification.actor?.avatar_url} username={notification.actor?.username} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-100 leading-snug">
          <span className="font-semibold">{notification.actor?.username}</span>{' '}
          {msg}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss() }}
        className="text-muted hover:text-white shrink-0"
      >
        <X size={13} />
      </button>
    </Link>
  )
}

// ── Single notification row ───────────────────────────────────────

function NotificationIcon({ type }) {
  if (type === 'follow')      return <UserPlus      size={14} className="text-blue-400"   />
  if (type === 'like')        return <Heart         size={14} className="text-red-400"    />
  if (type === 'comment')     return <MessageCircle size={14} className="text-green-400"  />
  if (type === 'new_release') return <Music2        size={14} className="text-accent"     />
  return null
}

function NotificationItem({ notification, onClose }) {
  const { type, actor, post_id, read, created_at, metadata } = notification

  if (type === 'new_release' && metadata) {
    return (
      <a
        href={metadata.spotify_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-200/50 transition-colors ${
          !read ? 'bg-accent/5 border-l-2 border-accent' : ''
        }`}
      >
        {metadata.cover_url
          ? <img src={metadata.cover_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
          : <div className="w-8 h-8 rounded-md bg-surface-200 flex items-center justify-center shrink-0"><Music2 size={14} className="text-accent" /></div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            <span className="font-semibold">{metadata.artist_name}</span>: <span className="text-accent">{metadata.release_title}</span>
          </p>
          <p className="text-xs text-muted mt-0.5">
            {formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: it })}
          </p>
        </div>
        <NotificationIcon type="new_release" />
      </a>
    )
  }

  const msg =
    type === 'follow'  ? 'ha iniziato a seguirti' :
    type === 'like'    ? 'ha messo like alla tua recensione' :
                         'ha commentato la tua recensione'

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
          {msg}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: it })}
        </p>
      </div>
      <NotificationIcon type={type} />
    </Link>
  )
}

// ── Main component ────────────────────────────────────────────────

export default function NotificationBell({ userId }) {
  const [open, setOpen]               = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread]           = useState(0)
  const [loading, setLoading]         = useState(false)
  const [toast, setToast]             = useState(null)
  const panelRef = useRef(null)
  const openRef  = useRef(open)
  openRef.current = open

  const loadNotifications = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await fetchNotifications(userId)
      setNotifications(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Initial unread count + realtime subscription
  useEffect(() => {
    if (!userId) return

    getUnreadNotificationsCount(userId).then(setUnread).catch(() => {})

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          if (openRef.current) {
            // Panel is open: prepend and mark read immediately
            const newRow = payload.new
            // Fetch actor details (the payload row has no join)
            const { data: actor } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', newRow.actor_id)
              .single()
            const enriched = { ...newRow, actor, read: false }
            setNotifications((prev) => [enriched, ...prev])
            markNotificationsRead(userId).catch(() => {})
          } else {
            // Panel closed: bump count + in-app toast + native push
            setUnread((n) => n + 1)
            const { data: actor } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', payload.new.actor_id)
              .single()
            const enriched = { ...payload.new, actor }
            setToast(enriched)
            const pushPayload = buildNotificationPayload(enriched, actor)
            showBrowserNotification(pushPayload.title, {
              body: pushPayload.body,
              data: { url: pushPayload.url },
            })
          }
        },
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
    const next = !open
    setOpen(next)
    if (next && userId) {
      await loadNotifications()
      if (unread > 0) {
        markNotificationsRead(userId).catch(() => {})
        setUnread(0)
      }
    }
  }

  return (
    <>
      {/* Toast for background notifications */}
      {toast && (
        <NotificationToast
          notification={toast}
          onDismiss={() => setToast(null)}
        />
      )}

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
          <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] max-h-[420px] overflow-y-auto bg-surface border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 bg-surface z-10">
              <span className="font-semibold text-sm">Notifiche</span>
              <div className="flex items-center gap-1">
                {notifications.some((n) => !n.read) && (
                  <button
                    onClick={async () => {
                      await markNotificationsRead(userId)
                      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
                      setUnread(0)
                    }}
                    className="btn-ghost p-1 text-xs flex items-center gap-1 text-muted hover:text-accent"
                    title="Segna tutto come letto"
                  >
                    <Check size={13} /> Letti
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="btn-ghost p-1">
                  <X size={14} />
                </button>
              </div>
            </div>

            {loading && (
              <div className="py-8 flex justify-center">
                <Spinner className="w-5 h-5" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto text-muted mb-2 opacity-40" />
                <p className="text-sm text-muted">Nessuna notifica</p>
              </div>
            )}

            {!loading && notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onClose={() => setOpen(false)} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
