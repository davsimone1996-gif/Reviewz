import { useRef, useState, useEffect } from 'react'
import { X, Download, Share2, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'

/* ─── Rating helpers ─────────────────────────────────────────── */
function ratingColor(r) {
  if (r >= 8) return '#34D399'
  if (r >= 6) return '#FBBF24'
  if (r >= 4) return '#F97316'
  return '#F87171'
}

/* ─── The printable card (all inline styles for html2canvas) ─── */
function ReviewCard({ post, profile, cardRef }) {
  const rc   = ratingColor(post.rating)
  const SIZE = 540

  return (
    <div
      ref={cardRef}
      style={{
        width: SIZE, height: SIZE,
        position: 'relative', overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#0F0F12',
        flexShrink: 0,
      }}
    >
      {/* Blurred cover background */}
      {post.cover_url && (
        <img
          src={post.cover_url}
          crossOrigin="anonymous"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'blur(28px) brightness(0.22) saturate(1.4)',
            transform: 'scale(1.15)',
          }}
          alt=""
        />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, rgba(15,15,18,0.80) 0%, rgba(15,15,18,0.60) 100%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        height: '100%', padding: 36, boxSizing: 'border-box',
      }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <span style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 11,
            fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase',
          }}>
            {post.spotify_type === 'track' ? 'Track Review' : 'Album Review'}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,107,0,0.15)',
            border: '1px solid rgba(255,107,0,0.35)',
            borderRadius: 20, padding: '3px 11px',
          }}>
            <span style={{ color: '#FF6B00', fontSize: 13 }}>♪</span>
            <span style={{ color: '#FF6B00', fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>Reviewz</span>
          </div>
        </div>

        {/* Cover + title row */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24 }}>
          {post.cover_url ? (
            <img
              src={post.cover_url}
              crossOrigin="anonymous"
              style={{
                width: 160, height: 160, flexShrink: 0,
                objectFit: 'cover', borderRadius: 14,
                boxShadow: `0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)`,
              }}
              alt={post.title}
            />
          ) : (
            <div style={{
              width: 160, height: 160, flexShrink: 0,
              borderRadius: 14, background: '#1C1C20',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48,
            }}>🎵</div>
          )}

          <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
            <h2 style={{
              color: '#fff', fontSize: 21, fontWeight: 800,
              lineHeight: 1.25, margin: '0 0 6px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {post.title}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: '0 0 18px' }}>
              {post.artist}
            </p>

            {/* Rating pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                background: `${rc}20`, color: rc,
                fontSize: 26, fontWeight: 900,
                padding: '2px 14px', borderRadius: 10,
                border: `1px solid ${rc}40`,
              }}>
                {post.rating.toFixed(1)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>/ 10</span>
            </div>
          </div>
        </div>

        {/* Review excerpt */}
        {post.review_text && (
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderLeft: `3px solid ${rc}`,
            borderRadius: 12, padding: '13px 16px',
            marginBottom: 24,
          }}>
            <p style={{
              color: 'rgba(255,255,255,0.72)', fontSize: 13,
              lineHeight: 1.65, fontStyle: 'italic',
              margin: 0,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
            }}>
              "{post.review_text}"
            </p>
          </div>
        )}

        {/* Footer: author + site */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                crossOrigin="anonymous"
                style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
                alt=""
              />
            ) : (
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#FF6B00',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13,
              }}>
                {(profile?.username ?? '?')[0].toUpperCase()}
              </div>
            )}
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>
              @{profile?.username}
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>reviewz.app</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Modal ──────────────────────────────────────────────────── */
export default function ShareCardModal({ post, profile, onClose }) {
  const cardRef  = useRef(null)
  const [busy, setBusy]       = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    // Check if native share with files is supported (mobile browsers)
    setCanShare(
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] })
    )
  }, [])

  const capture = async () => {
    if (!cardRef.current) return null
    return html2canvas(cardRef.current, {
      useCORS: true,
      allowTaint: false,
      scale: 2,          // → 1080×1080 px output
      backgroundColor: '#0F0F12',
      logging: false,
    })
  }

  const handleDownload = async () => {
    setBusy(true)
    try {
      const canvas = await capture()
      if (!canvas) return
      const a = document.createElement('a')
      a.download = `reviewz-${post.title.replace(/\s+/g, '-').toLowerCase()}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } finally {
      setBusy(false)
    }
  }

  const handleShare = async () => {
    setBusy(true)
    try {
      const canvas = await capture()
      if (!canvas) return
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'review.png', { type: 'image/png' })
        try {
          await navigator.share({
            title: `${post.title} — Reviewz`,
            text: `Ho recensito "${post.title}" di ${post.artist} su Reviewz!`,
            files: [file],
          })
        } catch {
          // Cancelled or unsupported → fall back to download
          const a = document.createElement('a')
          a.download = 'review.png'
          a.href = canvas.toDataURL('image/png')
          a.click()
        }
        setBusy(false)
      }, 'image/png')
    } catch {
      setBusy(false)
    }
  }

  /* Scale 540 → ~290 for preview */
  const PREVIEW = 290
  const scale   = PREVIEW / 540

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-xs card animate-scale-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200/50">
          <h3 className="font-bold text-sm">Condividi recensione</h3>
          <button onClick={onClose} className="text-muted hover:text-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Card preview */}
        <div
          className="bg-surface-200/30 flex items-start justify-center"
          style={{ height: PREVIEW + 24, paddingTop: 12 }}
        >
          <div style={{ width: PREVIEW, height: PREVIEW, overflow: 'hidden', borderRadius: 10, flexShrink: 0 }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 540 }}>
              <ReviewCard post={post} profile={profile} cardRef={cardRef} />
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-muted px-4 pt-3 pb-1">
          Salva l'immagine e condividila su Instagram o WhatsApp
        </p>

        {/* Buttons */}
        <div className="p-4 space-y-2">
          {canShare && (
            <button
              onClick={handleShare}
              disabled={busy}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              Condividi (Instagram, WhatsApp…)
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={busy}
            className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Scarica immagine
          </button>
        </div>
      </div>
    </div>
  )
}
