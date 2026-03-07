import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, ExternalLink, Music, Disc3 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { likePost, unlikePost } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import Avatar from '../UI/Avatar'
import StarRating from '../UI/StarRating'
import ScoreBadge from '../UI/ScoreBadge'

export default function PostCard({ post, isLiked = false, compact = false }) {
  const [liked, setLiked]   = useState(isLiked)
  const [likes, setLikes]   = useState(post.likes_count)
  const [busy, setBusy]     = useState(false)
  const { user }            = useAuthStore()
  const qc                  = useQueryClient()

  const handleLike = async (e) => {
    e.preventDefault()
    if (!user || busy) return
    setBusy(true)
    try {
      if (liked) {
        await unlikePost(user.id, post.id)
        setLiked(false)
        setLikes((l) => l - 1)
      } else {
        await likePost(user.id, post.id)
        setLiked(true)
        setLikes((l) => l + 1)
      }
      qc.invalidateQueries({ queryKey: ['feed'] })
    } finally {
      setBusy(false)
    }
  }

  const profile = post.profiles

  return (
    <article className="card hover:border-surface-300 transition-colors duration-150">
      <Link to={`/post/${post.id}`} className="block">
        <div className="flex gap-4 p-4">
          {/* Album cover */}
          <div className="shrink-0">
            {post.cover_url ? (
              <img
                src={post.cover_url}
                alt={post.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-surface-200 flex items-center justify-center text-muted">
                <Disc3 size={32} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Song info */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {post.spotify_type === 'track' ? (
                    <Music size={12} className="text-muted shrink-0" />
                  ) : (
                    <Disc3 size={12} className="text-muted shrink-0" />
                  )}
                  <span className="text-xs text-muted uppercase tracking-wide">{post.spotify_type}</span>
                </div>
                <h3 className="font-semibold text-gray-100 truncate">{post.title}</h3>
                <p className="text-sm text-muted truncate">{post.artist}</p>
              </div>
              <StarRating value={post.rating} />
            </div>

            {/* Review preview */}
            {!compact && (
              <p className="mt-2 text-sm text-gray-300 line-clamp-2">{post.review_text}</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3">
              <Link
                to={`/profile/${profile?.username}`}
                className="flex items-center gap-2 group"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar src={profile?.avatar_url} username={profile?.username} size="sm" />
                <div>
                  <span className="text-sm font-medium group-hover:text-accent transition-colors">
                    {profile?.username}
                  </span>
                  <ScoreBadge score={profile?.social_score ?? 0} />
                </div>
              </Link>

              <div className="flex items-center gap-4 text-muted text-sm">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Action bar */}
      <div className="border-t border-surface-200 px-4 py-2 flex items-center gap-4">
        <button
          onClick={handleLike}
          disabled={!user || busy}
          className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-400' : 'text-muted hover:text-red-400'} disabled:opacity-50`}
        >
          <Heart size={15} className={liked ? 'fill-red-400' : ''} />
          {likes}
        </button>

        <Link to={`/post/${post.id}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-gray-100 transition-colors">
          <MessageCircle size={15} />
          {post.comments_count}
        </Link>

        <a
          href={post.spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-green-400 transition-colors ml-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={13} />
          Spotify
        </a>
      </div>
    </article>
  )
}
