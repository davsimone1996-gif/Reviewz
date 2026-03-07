import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Music, Disc3, Loader2 } from 'lucide-react'
import { createPost } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import SpotifySearch from '../components/Search/SpotifySearch'
import RatingPicker from '../components/UI/RatingPicker'

export default function CreatePostPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const [selected, setSelected] = useState(null)
  const [review, setReview]     = useState('')
  const [rating, setRating]     = useState(0)
  const [error, setError]       = useState(null)

  const mutation = useMutation({
    mutationFn: () =>
      createPost({
        user_id:      user.id,
        spotify_id:   selected.spotify_id,
        spotify_type: selected.spotify_type,
        title:        selected.title,
        artist:       selected.artist,
        cover_url:    selected.cover_url,
        spotify_url:  selected.spotify_url,
        preview_url:  selected.preview_url ?? null,
        review_text:  review,
        rating,
      }),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: ['feed'] })
      navigate(`/post/${post.id}`)
    },
    onError: (e) => setError(e.message),
  })

  if (!user) return (
    <div className="text-center py-16 text-muted">Sign in to write a review.</div>
  )

  const canSubmit = selected && review.trim().length >= 10 && rating > 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Write a Review</h1>

      {/* Step 1: Search */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">1. Find Music</h2>
        {selected ? (
          <div className="flex items-center gap-4 p-3 bg-surface-200 rounded-lg">
            {selected.cover_url && (
              <img src={selected.cover_url} alt="" className="w-16 h-16 rounded object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{selected.title}</p>
              <p className="text-sm text-muted">{selected.artist}</p>
              <span className="text-xs text-muted uppercase">{selected.spotify_type}</span>
            </div>
            <button onClick={() => setSelected(null)} className="btn-ghost text-sm">Change</button>
          </div>
        ) : (
          <SpotifySearch onSelect={setSelected} />
        )}
      </div>

      {/* Step 2: Rating */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">2. Your Rating</h2>
        <RatingPicker value={rating} onChange={setRating} />
      </div>

      {/* Step 3: Review */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">3. Write Your Review</h2>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Share your thoughts on this track or album…"
          rows={6}
          className="input resize-none"
          maxLength={2000}
        />
        <div className="flex justify-between text-xs text-muted">
          <span>Min. 10 characters</span>
          <span>{review.length}/2000</span>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
      >
        {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
        Publish Review
      </button>
    </div>
  )
}
