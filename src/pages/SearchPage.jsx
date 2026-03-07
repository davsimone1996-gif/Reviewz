import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Music, Disc3, ExternalLink } from 'lucide-react'
import { searchSpotify } from '../lib/spotify'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/UI/Spinner'
import StarRating from '../components/UI/StarRating'

function SpotifyResultCard({ item }) {
  const navigate = useNavigate()

  return (
    <div className="card p-4 flex items-center gap-4">
      {item.cover_url ? (
        <img src={item.cover_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-surface-200 flex items-center justify-center text-muted shrink-0">
          {item.spotify_type === 'track' ? <Music size={24} /> : <Disc3 size={24} />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{item.title}</p>
        <p className="text-sm text-muted truncate">{item.artist}</p>
        <span className="text-xs text-muted uppercase tracking-wide">{item.spotify_type}</span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => navigate(`/create?spotify_id=${item.spotify_id}&type=${item.spotify_type}`)}
          className="btn-primary text-sm py-1.5"
        >
          Review
        </button>
        <a
          href={item.spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost p-2 text-green-400"
        >
          <ExternalLink size={15} />
        </a>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [input, setInput] = useState(q)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['spotify-search', q],
    queryFn: () => searchSpotify(q, 'both', 12),
    enabled: q.length > 0,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) setSearchParams({ q: input.trim() })
  }

  const allResults = [...(data?.tracks ?? []), ...(data?.albums ?? [])]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Search Music</h1>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search tracks or albums…"
          className="input flex-1"
          autoFocus
        />
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {isLoading || isFetching ? (
        <div className="flex justify-center py-8"><Spinner className="w-6 h-6" /></div>
      ) : allResults.length > 0 ? (
        <div className="space-y-3">
          <p className="text-muted text-sm">{allResults.length} results for "{q}"</p>
          {allResults.map((item) => (
            <SpotifyResultCard key={`${item.spotify_type}-${item.spotify_id}`} item={item} />
          ))}
        </div>
      ) : q ? (
        <p className="text-muted text-center py-8">No results for "{q}"</p>
      ) : null}
    </div>
  )
}
