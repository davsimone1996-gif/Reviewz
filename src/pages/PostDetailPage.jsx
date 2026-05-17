import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, ExternalLink, Trash2, Music, Disc3, ArrowLeft, Loader2, Share2, Bookmark } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { usePost } from '../hooks/usePost'
import { likePost, unlikePost, deletePost } from '../lib/supabase'
import { isSpotifyConnected, getStoredTokens } from '../lib/spotifyAuth'
import useAuthStore from '../store/authStore'
import CommentSection from '../components/Post/CommentSection'
import ShareCardModal from '../components/Post/ShareCardModal'
import Avatar from '../components/UI/Avatar'
import StarRating from '../components/UI/StarRating'
import Spinner from '../components/UI/Spinner'
import ScoreBadge from '../components/UI/ScoreBadge'

function ratingColor(r) {
  if (r >= 8) return 'from-emerald-500/30'
  if (r >= 6) return 'from-amber-500/30'
  if (r >= 4) return 'from-orange-500/30'
  return 'from-red-500/30'
}

export default function PostDetailPage() {
  const { id }            = useParams()
  const { user }          = useAuthStore()
  const navigate          = useNavigate()
  const qc                = useQueryClient()
  const { data: post, isLoading } = usePost(id)

  const [liked, setLiked]       = useState(false)
  const [heartAnim, setHeartAnim] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [saved, setSaved]         = useState(false)

  const saveToSpotify = async () => {
    const { accessToken } = getStoredTokens()
    if (!accessToken) return
    await fetch(`https://api.spotify.com/v1/me/tracks?ids=${post.spotify_id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [post.spotify_id] }),
    })
  }

  const handleLike = async () => {
    if (!user || !post) return
    setHeartAnim(false)
    requestAnimationFrame(() => setHeartAnim(true))
    if (liked) {
      await unlikePost(user.id, post.id)
      setLiked(false)
    } else {
      await likePost(user.id, post.id)
      setLiked(true)
    }
  }

  const handleShare = () => setShowShare(true)

  const deleteMut = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feed'] }); navigate('/') },
  })

  if (isLoading) return (
    <div className="flex justify-center py-24"><Spinner className="w-8 h-8" /></div>
  )
  if (!post) return (
    <div className="text-center py-24">
      <p className="text-5xl mb-4">🎵</p>
      <p className="text-muted">Review not found.</p>
      <Link to="/" className="btn-primary mt-4 inline-flex">Back to Feed</Link>
    </div>
  )

  const p = post.profiles

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in-up">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-muted hover:text-gray-100 text-sm transition-colors">
        <ArrowLeft size={15} /> Back to Feed
      </Link>

      {/* Main card */}
      <div className="card overflow-hidden">
        {/* Cinematic hero */}
        <div className="relative h-56 sm:h-64 overflow-hidden">
          {post.cover_url ? (
            <>
              <img
                src={post.cover_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-40"
              />
              {/* Rating tint overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${ratingColor(post.rating)} to-transparent opacity-60`} />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-100 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-surface-200 to-surface-100" />
          )}

          {/* Content over hero */}
          <div className="absolute inset-0 flex items-end p-5 gap-4">
            {post.cover_url && (
              <img
                src={post.cover_url}
                alt={post.title}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-2xl object-cover border-2 border-white/10 shrink-0"
              />
            )}
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="badge bg-black/40 text-white/70 backdrop-blur-sm text-xs">
                  {post.spotify_type === 'track' ? <><Music size={10}/> Track</> : <><Disc3 size={10}/> Album</>}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight drop-shadow-lg truncate">
                {post.title}
              </h1>
              <Link
                to={`/artist/${encodeURIComponent(post.artist)}`}
                className="text-white/70 hover:text-white mt-0.5 drop-shadow truncate block transition-colors"
              >
                {post.artist}
              </Link>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Rating + Spotify link */}
          <div className="flex items-center justify-between">
            <StarRating value={post.rating} size="lg" />
            <div className="flex items-center gap-3">
              <a
                href={post.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-[#1DB954] hover:text-[#1ed760] transition-colors"
              >
                <ExternalLink size={14} /> Open in Spotify
              </a>
              {user && post.spotify_type === 'track' && isSpotifyConnected() && (
                <button
                  onClick={async () => { await saveToSpotify(); setSaved(true); setTimeout(() => setSaved(false), 2000) }}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-green-400 transition-colors"
                >
                  <Bookmark size={14} className={saved ? 'fill-green-400 text-green-400' : ''} />
                  {saved ? 'Salvato!' : 'Salva'}
                </button>
              )}
            </div>
          </div>

          {/* Review */}
          <div className="bg-surface-200/40 rounded-xl p-4 border border-surface-300/30">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-[15px]">{post.review_text}</p>
          </div>

          {/* Author row */}
          <div className="flex items-center justify-between pt-1">
            <Link to={`/profile/${p?.username}`} className="flex items-center gap-3 group">
              <Avatar src={p?.avatar_url} username={p?.username} size="md" />
              <div>
                <p className="font-semibold group-hover:text-accent transition-colors">{p?.username}</p>
                <div className="flex items-center gap-2">
                  <ScoreBadge score={p?.social_score ?? 0} />
                  <span className="text-xs text-muted">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {/* Delete */}
              {user?.id === post.user_id && (
                <button
                  onClick={() => { if (confirm('Delete this review?')) deleteMut.mutate() }}
                  disabled={deleteMut.isPending}
                  className="btn-ghost p-2 text-muted hover:text-red-400"
                >
                  {deleteMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              )}
            </div>
          </div>

          {/* Like */}
          <div className="flex items-center gap-4 pt-1 border-t border-surface-200/40">
            <button
              onClick={handleLike}
              disabled={!user}
              className={`flex items-center gap-2 font-semibold text-sm transition-colors disabled:opacity-40
                ${liked ? 'text-red-400' : 'text-muted hover:text-red-400'}`}
            >
              <Heart
                size={18}
                className={`transition-all ${liked ? 'fill-red-400' : ''} ${heartAnim ? 'animate-heart' : ''}`}
                onAnimationEnd={() => setHeartAnim(false)}
              />
              {post.likes_count + (liked ? 1 : 0)} likes
            </button>
          </div>
        </div>
      </div>

      {/* Comments */}
      <CommentSection postId={id} />

      {showShare && (
        <ShareCardModal
          post={post}
          profile={p}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
