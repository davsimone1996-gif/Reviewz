import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, ExternalLink, Music, Disc3, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { likePost, unlikePost } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import Avatar from '../UI/Avatar'
import StarRating from '../UI/StarRating'
import ScoreBadge from '../UI/ScoreBadge'

// Color based on rating value
function ratingColor(r) {
  if (r >= 8) return 'text-emerald-400 bg-emerald-400/10'
  if (r >= 6) return 'text-amber-400 bg-amber-400/10'
  if (r >= 4) return 'text-orange-400 bg-orange-400/10'
  return 'text-red-400 bg-red-400/10'
}

export default function PostCard({ post, isLiked = false, compact = false }) {
  const [liked, setLiked] = useState(isLiked)
  const [likes, setLikes] = useState(post.likes_count)
  const [heartAnim, setHeartAnim] = useState(false)
  const [busy, setBusy]   = useState(false)
  const { user }          = useAuthStore()
  const qc                = useQueryClient()

  const handleLike = async (e) => {
    e.preventDefault()
    if (!user || busy) return
    setBusy(true)
    setHeartAnim(false)
    requestAnimationFrame(() => setHeartAnim(true))
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
    <article className="card-hover group animate-fade-in-up overflow-hidden">
      <Link to={`/post/${post.id}`} className="block">
        <div className="flex gap-0">
          {/* Cover art — left strip */}
          <div className="shrink-0 relative">
            {post.cover_url ? (
              <div className="relative w-24 sm:w-28 h-full min-h-[110px]">
                <img
                  src={post.cover_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                {/* Spotify type badge */}
                <span className="absolute top-2 left-2 badge bg-black/60 text-white/80 backdrop-blur-sm">
                  {post.spotify_type === 'track'
                    ? <><Music size={9} /> Track</>
                    : <><Disc3 size={9} /> Album</>}
                </span>
              </div>
            ) : (
              <div className="w-24 sm:w-28 h-full min-h-[110px] bg-surface-200 flex items-center justify-center text-muted">
                <Disc3 size={28} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
            <div>
              {/* Title row */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-100 truncate group-hover:text-accent transition-colors leading-tight">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted truncate">{post.artist}</p>
                </div>

                {/* Rating pill */}
                <span className={`badge shrink-0 font-bold text-sm px-2.5 py-1 rounded-lg ${ratingColor(post.rating)}`}>
                  {post.rating.toFixed(1)}
                </span>
              </div>

              {/* Review text */}
              {!compact && (
                <p className="mt-2 text-sm text-gray-400 line-clamp-2 leading-relaxed">
                  {post.review_text}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-200/50">
              <Link
                to={`/profile/${profile?.username}`}
                className="flex items-center gap-2 group/user"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar src={profile?.avatar_url} username={profile?.username} size="sm" />
                <div className="leading-none">
                  <span className="text-xs font-semibold group-hover/user:text-accent transition-colors">
                    {profile?.username}
                  </span>
                  <div><ScoreBadge score={profile?.social_score ?? 0} /></div>
                </div>
              </Link>
              <span className="text-xs text-muted/70">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Action bar */}
      <div className="border-t border-surface-200/40 px-4 py-2.5 flex items-center gap-5 bg-surface-50/50">
        <button
          onClick={handleLike}
          disabled={!user || busy}
          className={`like-btn flex items-center gap-1.5 text-xs font-semibold transition-colors
            ${liked ? 'text-red-400' : 'text-muted hover:text-red-400'}
            disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Heart
            size={15}
            className={`transition-all ${liked ? 'fill-red-400' : ''} ${heartAnim ? 'animate-heart' : ''}`}
            onAnimationEnd={() => setHeartAnim(false)}
          />
          {likes > 0 && likes}
        </button>

        <Link
          to={`/post/${post.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-gray-100 transition-colors"
        >
          <MessageCircle size={15} />
          {post.comments_count > 0 && post.comments_count}
        </Link>

        <div className="flex-1" />

        <a
          href={post.spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted hover:text-[#1DB954] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Play size={11} className="fill-current" />
          Spotify
        </a>
      </div>
    </article>
  )
}
