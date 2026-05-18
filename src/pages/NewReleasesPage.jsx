import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Music2, Disc3, CalendarDays, RefreshCw } from 'lucide-react'
import { getNewReleases, getLastFridayDate, getNextFridayDate } from '../lib/spotify'
import Spinner from '../components/UI/Spinner'

// ── helpers ───────────────────────────────────────────────────────

function formatDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ms until next Friday midnight — used as staleTime so React Query
// auto-invalidates exactly when new releases drop
function msUntilNextFridayMidnight() {
  const now = new Date()
  const nextFriday = new Date(now)
  const day = now.getDay()
  const daysAhead = day === 5 ? 7 : (5 - day + 7) % 7
  nextFriday.setDate(now.getDate() + (daysAhead === 0 ? 7 : daysAhead))
  nextFriday.setHours(0, 5, 0, 0) // 00:05 on Friday
  return Math.max(nextFriday.getTime() - now.getTime(), 1000 * 60 * 60)
}

function isThisWeekFriday(releaseDate) {
  if (!releaseDate) return false
  return releaseDate >= getLastFridayDate()
}

// ── AlbumCard ─────────────────────────────────────────────────────

function AlbumCard({ album, isNew }) {
  return (
    <a
      href={album.spotify_url}
      target="_blank"
      rel="noopener noreferrer"
      className="card group hover:border-accent/40 hover:-translate-y-1 transition-all duration-200 flex flex-col gap-3 p-4 relative"
    >
      {isNew && (
        <span className="absolute top-2 left-2 z-10 text-[10px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
          New
        </span>
      )}

      {/* Cover */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-200">
        {album.cover_url ? (
          <img
            src={album.cover_url}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Disc3 size={40} className="text-muted" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ExternalLink size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-100 truncate">{album.title}</p>
        <p className="text-xs text-muted truncate">{album.artist}</p>
        {album.release_date && (
          <p className="text-xs text-muted/50 mt-1">{formatDate(album.release_date)}</p>
        )}
      </div>
    </a>
  )
}

// ── Page ─────────────────────────────────────────────────────────

export default function NewReleasesPage() {
  const lastFriday = getLastFridayDate()
  const nextFriday = getNextFridayDate()
  const isToday = new Date().getDay() === 5

  const { data: albums, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['new-releases', lastFriday],  // key changes every Friday → auto-refetch
    queryFn: () => getNewReleases('IT', 50),
    staleTime: msUntilNextFridayMidnight(),  // stays fresh until next Friday midnight
    gcTime: msUntilNextFridayMidnight() + 1000 * 60 * 60,
  })

  const thisWeek  = (albums ?? []).filter(a => isThisWeekFriday(a.release_date))
  const older     = (albums ?? []).filter(a => !isThisWeekFriday(a.release_date))

  return (
    <div className="max-w-5xl mx-auto py-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-orange-400 flex items-center justify-center shadow-lg shadow-accent/30 shrink-0">
            <Music2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gradient leading-tight">Nuove Uscite Musicali</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CalendarDays size={12} className="text-muted" />
              <p className="text-xs text-muted">
                {isToday
                  ? `Uscite di oggi — venerdì ${formatDate(lastFriday)}`
                  : `Settimana del ${formatDate(lastFriday)} · prossime il ${formatDate(nextFriday)}`}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Aggiorna"
          className="btn-ghost p-2 shrink-0"
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin text-accent' : 'text-muted'} />
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8" />
        </div>
      )}

      {isError && (
        <div className="card p-6 text-center space-y-3">
          <p className="text-red-400 font-medium">Errore nel caricamento delle nuove uscite.</p>
          <button onClick={() => refetch()} className="btn-secondary text-sm">Riprova</button>
        </div>
      )}

      {!isLoading && albums && (
        <>
          {/* This week's releases */}
          {thisWeek.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                Uscite di questa settimana
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {thisWeek.map(album => (
                  <AlbumCard key={album.spotify_id} album={album} isNew />
                ))}
              </div>
            </section>
          )}

          {/* Older releases also returned by tag:new (up to ~2 weeks back) */}
          {older.length > 0 && (
            <section>
              {thisWeek.length > 0 && (
                <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-surface-300 inline-block" />
                  Settimana precedente
                </h2>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {older.map(album => (
                  <AlbumCard key={album.spotify_id} album={album} isNew={false} />
                ))}
              </div>
            </section>
          )}

          {albums.length === 0 && (
            <div className="card p-10 text-center">
              <Disc3 size={36} className="mx-auto text-muted mb-3" />
              <p className="font-semibold">Nessuna uscita trovata</p>
              <p className="text-muted text-sm mt-1">Le release del venerdì appariranno qui.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
