import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, CheckCircle2, Search, Star, FileText, Rocket } from 'lucide-react'
import { createPost } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import SpotifySearch from '../components/Search/SpotifySearch'
import RatingPicker from '../components/UI/RatingPicker'
import AuthModal from '../components/Auth/AuthModal'

const STEPS = [
  { id: 1, icon: Search,   label: 'Find music'  },
  { id: 2, icon: Star,     label: 'Rate it'     },
  { id: 3, icon: FileText, label: 'Write review' },
]

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const done    = current > step.id
        const active  = current === step.id
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className={`flex flex-col items-center gap-1 flex-1 ${i === 0 ? 'items-start' : i === STEPS.length - 1 ? 'items-end' : 'items-center'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                done   ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                active ? 'bg-accent/20 text-accent border border-accent/50 shadow-lg shadow-accent/20' :
                         'bg-surface-200 text-muted border border-surface-300'
              }`}>
                {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-accent' : done ? 'text-emerald-400' : 'text-muted'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-2 mb-5 transition-colors duration-500 ${done ? 'bg-emerald-500/40' : 'bg-surface-300'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CreatePostPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [showAuth, setShowAuth] = useState(false)

  const [step, setStep]         = useState(1)
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
    <>
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center shadow-xl shadow-accent/30">
          <Rocket size={28} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-1">Sign in to write a review</h2>
          <p className="text-muted text-sm">Join the community and share your musical takes.</p>
        </div>
        <button onClick={() => setShowAuth(true)} className="btn-primary px-8 py-3">Sign In</button>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )

  const canGoStep2 = !!selected
  const canGoStep3 = rating > 0
  const canSubmit  = review.trim().length >= 10

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Write a Review</h1>
        <p className="text-muted text-sm mt-0.5">Share your honest take on a track or album</p>
      </div>

      <StepIndicator current={step} />

      {/* Step 1: Search */}
      {step === 1 && (
        <div className="card p-6 space-y-5 animate-scale-in">
          <div>
            <h2 className="font-bold text-lg mb-0.5">Find your music</h2>
            <p className="text-muted text-sm">Search tracks or albums on Spotify</p>
          </div>

          {selected ? (
            <div className="flex items-center gap-4 p-4 bg-accent/10 border border-accent/30 rounded-xl">
              {selected.cover_url && (
                <img src={selected.cover_url} alt="" className="w-16 h-16 rounded-xl object-cover shadow-lg" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{selected.title}</p>
                <p className="text-sm text-muted">{selected.artist}</p>
                <span className="badge bg-accent/20 text-accent mt-1">{selected.spotify_type}</span>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost text-sm shrink-0">Change</button>
            </div>
          ) : (
            <SpotifySearch onSelect={(item) => { setSelected(item); }} />
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canGoStep2}
              className="btn-primary px-8"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Rating */}
      {step === 2 && (
        <div className="card p-6 space-y-5 animate-scale-in">
          {selected && (
            <div className="flex items-center gap-3 pb-4 border-b border-surface-200">
              {selected.cover_url && (
                <img src={selected.cover_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
              )}
              <div>
                <p className="font-semibold">{selected.title}</p>
                <p className="text-sm text-muted">{selected.artist}</p>
              </div>
            </div>
          )}

          <div>
            <h2 className="font-bold text-lg mb-0.5">How good is it?</h2>
            <p className="text-muted text-sm mb-4">Rate from 1 (terrible) to 10 (masterpiece)</p>
            <RatingPicker value={rating} onChange={setRating} />
          </div>

          <div className="flex gap-3 justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
            <button onClick={() => setStep(3)} disabled={!canGoStep3} className="btn-primary px-8">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="card p-6 space-y-5 animate-scale-in">
          {selected && (
            <div className="flex items-center gap-3 pb-4 border-b border-surface-200">
              {selected.cover_url && (
                <img src={selected.cover_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{selected.title}</p>
                <p className="text-sm text-muted">{selected.artist}</p>
              </div>
              <span className={`text-xl font-bold ${rating >= 8 ? 'text-emerald-400' : rating >= 6 ? 'text-amber-400' : 'text-orange-400'}`}>
                {rating}/10
              </span>
            </div>
          )}

          <div>
            <h2 className="font-bold text-lg mb-0.5">Write your review</h2>
            <p className="text-muted text-sm mb-3">Tell the community what you think</p>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What makes this track special? How does it make you feel? Is the production noteworthy?…"
              rows={7}
              className="input resize-none text-[15px] leading-relaxed"
              maxLength={2000}
              autoFocus
            />
            <div className="flex justify-between text-xs text-muted mt-1.5">
              <span className={review.trim().length < 10 ? 'text-red-400' : 'text-emerald-400'}>
                {review.trim().length < 10 ? `${10 - review.trim().length} more chars needed` : '✓ Looks good'}
              </span>
              <span>{review.length}/2000</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-between">
            <button onClick={() => setStep(2)} className="btn-secondary">← Back</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!canSubmit || mutation.isPending}
              className="btn-primary px-8 flex items-center gap-2"
            >
              {mutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Publishing…</>
                : <><Rocket size={15} /> Publish Review</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
