import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, UserPlus, Heart, MessageCircle, Music2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { fetchNotifications, markNotificationsRead } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import Avatar from '../components/UI/Avatar'
import Spinner from '../components/UI/Spinner'

function NotificationIcon({ type }) {
  if (type === 'follow')      return <UserPlus     size={15} className="text-blue-400"   />
  if (type === 'like')        return <Heart        size={15} className="text-red-400"    />
  if (type === 'comment')     return <MessageCircle size={15} className="text-green-400" />
  if (type === 'new_release') return <Music2       size={15} className="text-accent"     />
  return null
}

function NotificationRow({ notification }) {
  const { type, actor, post_id, read, created_at, metadata } = notification

  if (type === 'new_release' && metadata) {
    return (
      <a
        href={metadata.spotify_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-start gap-3 px-4 py-4 hover:bg-surface-200/50 transition-colors border-b border-white/5 ${
          !read ? 'bg-accent/5 border-l-2 border-l-accent' : ''
        }`}
      >
        {metadata.cover_url
          ? <img src={metadata.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-lg bg-surface-200 flex items-center justify-center shrink-0"><Music2 size={16} className="text-accent" /></div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-100 leading-snug">
            <span className="font-semibold">{metadata.artist_name}</span> ha pubblicato:{' '}
            <span className="text-accent">{metadata.release_title}</span>
          </p>
          <p className="text-xs text-muted mt-1">
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
      className={`flex items-start gap-3 px-4 py-4 hover:bg-surface-200/50 transition-colors border-b border-white/5 ${
        !read ? 'bg-accent/5 border-l-2 border-l-accent' : ''
      }`}
    >
      <Avatar src={actor?.avatar_url} username={actor?.username} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-100 leading-snug">
          <span className="font-semibold">{actor?.username}</span>{' '}
          {msg}
        </p>
        <p className="text-xs text-muted mt-1">
          {formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: it })}
        </p>
      </div>
      <NotificationIcon type={type} />
    </Link>
  )
}

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/'); return }

    fetchNotifications(user.id)
      .then((data) => {
        setNotifications(data)
        // Mark all as read
        if (data.some((n) => !n.read)) markNotificationsRead(user.id).catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Realtime: prepend new notifications
    const channel = supabase
      .channel(`notif-page:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const { data: actor } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', payload.new.actor_id)
            .single()
          setNotifications((prev) => [{ ...payload.new, actor, read: true }, ...prev])
          markNotificationsRead(user.id).catch(() => {})
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, navigate])

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-5">
        <h1 className="text-xl font-bold">Notifiche</h1>
        <p className="text-muted text-sm mt-0.5">Aggiornamenti su follow, like e commenti</p>
      </div>

      <div className="card overflow-hidden">
        {loading && (
          <div className="flex justify-center py-16">
            <Spinner className="w-6 h-6" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Bell size={32} className="text-muted opacity-40" />
            <p className="font-semibold">Nessuna notifica</p>
            <p className="text-muted text-sm">Le riceverai quando qualcuno ti segue, mette like o commenta</p>
          </div>
        )}

        {!loading && notifications.map((n) => (
          <NotificationRow key={n.id} notification={n} />
        ))}
      </div>
    </div>
  )
}
