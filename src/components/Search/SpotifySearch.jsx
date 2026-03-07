import { useState, useCallback, useRef } from 'react'
import { Search, Music, Disc3, Loader2, Play } from 'lucide-react'
import { searchSpotify } from '../../lib/spotify'

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function SpotifySearch({ onSelect, searchType = 'both' }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState({ tracks: [], albums: [] })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const audioRef                = useRef(null)
  const [playingId, setPlayingId] = useState(null)

  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q.trim()) { setResults({ tracks: [], albums: [] }); return }
      setLoading(true)
      setError(null)
      try {
        const data = await searchSpotify(q, searchType)
        setResults(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }, 400),
    [searchType]
  )

  const handleChange = (e) => {
    setQuery(e.target.value)
    doSearch(e.target.value)
  }

  const playPreview = (e, item) => {
    e.stopPropagation()
    if (!item.preview_url) return
    if (playingId === item.spotify_id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(item.preview_url)
    audioRef.current.play()
    audioRef.current.onended = () => setPlayingId(null)
    setPlayingId(item.spotify_id)
  }

  const allResults = [...results.tracks, ...results.albums]
  const hasResults = allResults.length > 0

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search tracks or albums on Spotify…"
          className="input pl-10"
          autoFocus
        />
        {loading && <Loader2 size={16} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted" />}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {hasResults && (
        <ul className="space-y-1 max-h-80 overflow-y-auto">
          {allResults.map((item) => (
            <li key={`${item.spotify_type}-${item.spotify_id}`}>
              <button
                onClick={() => { onSelect(item); setQuery(''); setResults({ tracks: [], albums: [] }) }}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-200 transition-colors text-left"
              >
                {item.cover_url ? (
                  <img src={item.cover_url} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-surface-300 flex items-center justify-center text-muted shrink-0">
                    {item.spotify_type === 'track' ? <Music size={20} /> : <Disc3 size={20} />}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-sm text-muted truncate">{item.artist}</p>
                  <span className="text-xs text-muted uppercase tracking-wide">{item.spotify_type}</span>
                </div>

                {item.preview_url && (
                  <button
                    onClick={(e) => playPreview(e, item)}
                    className={`shrink-0 p-1.5 rounded-full transition-colors ${playingId === item.spotify_id ? 'bg-accent text-white' : 'text-muted hover:text-gray-100'}`}
                  >
                    <Play size={14} className={playingId === item.spotify_id ? 'fill-white' : ''} />
                  </button>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {query && !loading && !hasResults && (
        <p className="text-muted text-sm text-center py-4">No results for "{query}"</p>
      )}
    </div>
  )
}
