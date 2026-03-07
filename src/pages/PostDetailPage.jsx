import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, ExternalLink, Trash2, Music, Disc3, ArrowLeft, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { usePost } from '../hooks/usePost'
import { likePost, unlikePost, deletePost } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import CommentSection from '../components/Post/CommentSection'
import Avatar from '../components/UI/Avatar'
import StarRating from '../components/UI/StarRating'
import Spinner from '../components/UI/Spinner'
import ScoreBadge from '../components/UI/ScoreBadge'

export default function PostDetailPage() {
  const { id }  = useParams()
  const { user, profile } = useAuthStore()
  const navigate  = useNavigate()
  const qc        = useQueryClient()

  const { data: post, isLoading } = usePost(id)

  const [liked, setLiked]   = useState(false)
  const [likes, setLikes]   = useState(0)

  // Sync like state when post loads
  const initialized = post && !isLoading

  const handleLike = async () => {
    if (!user || !post) return
    if (liked) {
      await unlikePost(user.id, post.id)
      setLiked(false)
      setLikes((l) => l - 1)
    } else {
      await likePost(user.id, post.id)
      setLiked(true)
      setLikes((l) => l + 1)
    }
  }

  const deleteMut = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] })
      navigate('/')
    },
  })

  if (isLoading) return (
    <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
  )
  if (!post) return <div className="text-center py-16 text-muted">Review not found.</div>

  const p = post.profiles

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link to="/" className="flex items-center gap-1.5 text-muted hover:text-gray-100 text-sm transition-colors">
        <ArrowLeft size={15} /> Back to Feed
      </Link>

      {/* Main card */}
      <div className="card overflow-hidden">
        {/* Album art header */}
        {post.cover_url && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={post.cover_url}
              alt=""
              className="w-full h-full object-cover blur-sm scale-110 brightness-50"
            />
            <div className="absolute inset-0 flex items-end p-5 gap-4">
              <img src={post.cover_url} alt={post.title} className="w-24 h-24 rounded-xl shadow-2xl object-cover" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {post.spotify_type === 'track' ? <Music size={14} className="text-white/70" /> : <Disc3 size={14} className="text-white/70" />}
                  <span className="text-xs text-white/70 uppercase tracking-wide">{post.spotify_type}</span>
                </div>
                <h1 className="text-xl font-bold text-white truncate">{post.title}</h1>
                <p className="text-white/80 truncate">{post.artist}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Rating */}
          <div className="flex items-center justify-between">
            <StarRating value={post.rating} size="lg" />
            <a
              href={post.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              <ExternalLink size={14} /> Open in Spotify
            </a>
          </div>

          {/* Review text */}
          <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{post.review_text}</p>

          {/* Author */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-200">
            <Link to={`/profile/${p?.username}`} className="flex items-center gap-2 group">
              <Avatar src={p?.avatar_url} username={p?.username} size="md" />
              <div>
                <p className="font-medium group-hover:text-accent transition-colors">{p?.username}</p>
                <ScoreBadge score={p?.social_score ?? 0} />
              </div>
            </Link>
            <span className="text-xs text-muted">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={handleLike}
              disabled={!user}
              className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-400' : 'text-muted hover:text-red-400'} disabled:opacity-50`}
            >
              <Heart size={16} className={liked ? 'fill-red-400' : ''} />
              {post.likes_count + (liked ? 1 : 0)} likes
            </button>

            {user?.id === post.user_id && (
              <button
                onClick={() => {
                  if (confirm('Delete this review?')) deleteMut.mutate()
                }}
                disabled={deleteMut.isPending}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-red-400 transition-colors ml-auto"
              >
                {deleteMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <CommentSection postId={id} />
    </div>
  )
}
