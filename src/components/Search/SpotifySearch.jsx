import { useState, useCallback, useRef } from 'react'
import { Search, Music, Disc3, Loader2, Play, Square } from 'lucide-react'
import { searchSpotify } from '../../lib/spotify'

function debounce(fn, delay) {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}

export default function SpotifySearch({ onSelect, searchType = 'both' }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState({ tracks: [], albums: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const audioRef              = useRef(null)
  const [playingId, setPlayingId] = useState(null)

  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q.trim()) { setResults({ tracks: [], albums: [] }); return }
      setLoading(true); setError(null)
      try {
        setResults(await searchSpotify(q, searchType))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 400),
    [searchType]
  )

  const handleChange = (e) => { setQuery(e.target.value); doSearch(e.target.value) }

  const playPreview = (e, item) => {
    e.stopPropagation()
    if (!item.preview_url) return
    if (playingId === item.spotify_id) {
      audioRef.current?.pause(); setPlayingId(null); return
    }
    audioRef.current?.pause()
    audioRef.current = new Audio(item.preview_url)
    audioRef.current.play()
    audioRef.current.onended = () => setPlayingId(null)
    setPlayingId(item.spotify_id)
  }

  const allResults = [...results.tracks, ...results.albums]

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search tracks or albums…"
          className="input pl-9"
          autoFocus
        />
        {loading && <Loader2 size={15} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted" />}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {allResults.length > 0 && (
        <ul className="space-y-1 max-h-72 overflow-y-auto -mx-1 px-1">
          {allResults.map((item) => (
            <li key={`${item.spotify_type}-${item.spotify_id}`}>
              <button
                onClick={() => { onSelect(item); setQuery(''); setResults({ tracks: [], albums: [] }) }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-200 transition-colors text-left group"
              >
                <div className="relative shrink-0">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt="" className="w-11 h-11 rounded-lg object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-surface-300 flex items-center justify-center text-muted">
                      {item.spotify_type === 'track' ? <Music size={18} /> : <Disc3 size={18} />}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm group-hover:text-accent transition-colors">{item.title}</p>
                  <p className="text-xs text-muted truncate">{item.artist}</p>
                </div>

                {item.preview_url && (
                  <button
                    onClick={(e) => playPreview(e, item)}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      playingId === item.spotify_id
                        ? 'bg-accent text-white scale-110'
                        : 'bg-surface-300 text-muted hover:bg-accent hover:text-white'
                    }`}
                  >
                    {playingId === item.spotify_id
                      ? <Square size={11} className="fill-white" />
                      : <Play size={11} className="fill-current ml-0.5" />}
                  </button>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {query && !loading && allResults.length === 0 && (
        <p className="text-muted text-sm text-center py-6">No results for "{query}"</p>
      )}
    </div>
  )
}
