import { useRef, useState, useEffect } from 'react'
import { X, Download, Share2, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'

/* ─── Helpers ────────────────────────────────────────────────── */
function ratingColor(r) {
  if (r >= 8) return '#34D399'
  if (r >= 6) return '#FBBF24'
  if (r >= 4) return '#F97316'
  return '#F87171'
}

// JS truncation — no webkit needed (html2canvas doesn't support it)
function trunc(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str
}

/* ─── Printable card (all inline styles for html2canvas) ──────── */
function ReviewCard({ post, profile, cardRef }) {
  const rc   = ratingColor(post.rating)
  const SIZE = 540

  const title  = trunc(post.title, 36)
  const artist = trunc(post.artist, 40)
  const review = trunc(post.review_text, 180)

  return (
    <div
      ref={cardRef}
      style={{
        width: SIZE, height: SIZE,
        position: 'relative', overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#0F0F12',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Blurred background */}
      {post.cover_url && (
        <img
          src={post.cover_url}
          crossOrigin="anonymous"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'blur(28px) brightness(0.22) saturate(1.4)',
            transform: 'scale(1.15)',
          }}
          alt=""
        />
      )}

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(160deg, rgba(15,15,18,0.85) 0%, rgba(15,15,18,0.70) 100%)',
      }} />

      {/* Content wrapper */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 36,
        boxSizing: 'border-box',
      }}>

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24,
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 11, fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase',
          }}>
            {post.spotify_type === 'track' ? 'Track Review' : 'Album Review'}
          </span>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,107,0,0.15)',
            border: '1px solid rgba(255,107,0,0.40)',
            borderRadius: 20, padding: '4px 12px',
          }}>
            <span style={{ color: '#FF6B00', fontSize: 13, lineHeight: 1 }}>♪</span>
            <span style={{ color: '#FF6B00', fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
              Reviewz
            </span>
          </div>
        </div>

        {/* ── Cover + info ── */}
        <div style={{
          display: 'flex', gap: 22, alignItems: 'flex-start',
          marginBottom: 22,
        }}>
          {/* Cover image */}
          {post.cover_url ? (
            <img
              src={post.cover_url}
              crossOrigin="anonymous"
              style={{
                width: 156, height: 156, flexShrink: 0,
                objectFit: 'cover', borderRadius: 14,
                boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
              }}
              alt=""
            />
          ) : (
            <div style={{
              width: 156, height: 156, flexShrink: 0,
              borderRadius: 14, background: '#1C1C20',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 44,
            }}>🎵</div>
          )}

          {/* Title / artist / rating */}
          <div style={{
            flex: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', height: 156,
          }}>
            {/* Title */}
            <p style={{
              color: '#ffffff',
              fontSize: 19, fontWeight: 800, lineHeight: 1.3,
              margin: 0, marginBottom: 6,
              whiteSpace: 'normal', wordBreak: 'break-word',
            }}>
              {title}
            </p>

            {/* Artist */}
            <p style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 13, margin: 0, marginBottom: 16,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {artist}
            </p>

            {/* Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: rc + '25', color: rc,
                fontSize: 24, fontWeight: 900,
                padding: '3px 14px', borderRadius: 10,
                border: '1px solid ' + rc + '50',
                lineHeight: 1.4,
              }}>
                {post.rating.toFixed(1)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>/10</span>
            </div>
          </div>
        </div>

        {/* ── Review text ── */}
        {review ? (
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.055)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: '3px solid ' + rc,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            overflow: 'hidden',
          }}>
            <p style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 13, lineHeight: 1.65,
              fontStyle: 'italic', margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              "{review}"
            </p>
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* ── Author footer ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
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
            <span style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13, fontWeight: 600,
            }}>
              @{profile?.username}
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>reviewz.app</span>
        </div>

      </div>
    </div>
  )
}

/* ─── Modal ──────────────────────────────────────────────────── */
export default function ShareCardModal({ post, profile, onClose }) {
  const cardRef              = useRef(null)
  const [busy, setBusy]      = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    try {
      setCanShare(
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] })
      )
    } catch { /* ignore */ }
  }, [])

  const capture = () =>
    html2canvas(cardRef.current, {
      useCORS: true,
      allowTaint: false,
      scale: 2,
      backgroundColor: '#0F0F12',
      logging: false,
    })

  const handleDownload = async () => {
    setBusy(true)
    try {
      const canvas = await capture()
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
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'review.png', { type: 'image/png' })
        try {
          await navigator.share({
            title: `${post.title} — Reviewz`,
            text: `Ho recensito "${post.title}" di ${post.artist} su Reviewz!`,
            files: [file],
          })
        } catch {
          // Cancelled or unsupported → fallback download
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

  /* Scale 540 → 290 for modal preview */
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
          className="bg-surface-200/30 flex justify-center"
          style={{ height: PREVIEW + 16, paddingTop: 8 }}
        >
          <div style={{
            width: PREVIEW, height: PREVIEW,
            overflow: 'hidden', borderRadius: 8, flexShrink: 0,
          }}>
            <div style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: 540,
            }}>
              <ReviewCard post={post} profile={profile} cardRef={cardRef} />
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-muted px-4 pt-3 pb-1">
          Salva e condividi su Instagram, WhatsApp o dove vuoi
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
