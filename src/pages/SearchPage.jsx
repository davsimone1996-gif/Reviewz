import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Music, Disc3, Search as SearchIcon, Play, PenLine, Users } from 'lucide-react'
import { searchSpotify } from '../lib/spotify'
import { searchProfiles } from '../lib/supabase'
import Spinner from '../components/UI/Spinner'
import Avatar from '../components/UI/Avatar'
import ScoreBadge from '../components/UI/ScoreBadge'

function MusicCard({ item }) {
  const navigate = useNavigate()

  return (
    <div className="card-hover p-4 flex items-center gap-4 animate-fade-in-up group">
      <div className="relative shrink-0">
        {item.cover_url ? (
          <img src={item.cover_url} alt="" className="w-14 h-14 rounded-xl object-cover shadow-lg" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-surface-200 flex items-center justify-center text-muted">
            {item.spotify_type === 'track' ? <Music size={22} /> : <Disc3 size={22} />}
          </div>
        )}
        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
          item.spotify_type === 'track' ? 'bg-blue-500' : 'bg-purple-500'
        }`}>
          {item.spotify_type === 'track' ? <Music size={9} className="text-white" /> : <Disc3 size={9} className="text-white" />}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate group-hover:text-accent transition-colors">{item.title}</p>
        <p className="text-sm text-muted truncate">{item.artist}</p>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => navigate(`/create`, { state: { preselected: item } })}
          className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
        >
          <PenLine size={12} /> Review
        </button>
        <a
          href={item.spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 text-[#1DB954] hover:text-[#1ed760]"
        >
          <Play size={11} className="fill-current" />
        </a>
      </div>
    </div>
  )
}

function ProfileCard({ profile }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/profile/${profile.username}`)}
      className="card-hover p-4 flex items-center gap-4 animate-fade-in-up cursor-pointer group"
    >
      <Avatar src={profile.avatar_url} username={profile.username} size="lg" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold group-hover:text-accent transition-colors">@{profile.username}</p>
        <ScoreBadge score={profile.social_score} />
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q     = searchParams.get('q') || ''
  const [input, setInput] = useState(q)

  const { data: musicData, isLoading: musicLoading, isFetching: musicFetching } = useQuery({
    queryKey: ['spotify-search', q],
    queryFn: () => searchSpotify(q, 'both', 12),
    enabled: q.length > 1,
  })

  const { data: profilesData, isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles-search', q],
    queryFn: () => searchProfiles(q),
    enabled: q.length > 1,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) setSearchParams({ q: input.trim() })
  }

  const tracks   = musicData?.tracks ?? []
  const albums   = musicData?.albums ?? []
  const profiles = profilesData ?? []
  const loading  = musicLoading || musicFetching || profilesLoading
  const total    = tracks.length + albums.length + profiles.length

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">Search</h1>
        <p className="text-muted text-sm">Find music to review or discover users</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Artist, track, album or username…"
            className="input pl-11 py-3 text-base"
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary px-6">Search</button>
      </form>

      {loading && (
        <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
      )}

      {!loading && q && total === 0 && (
        <div className="card p-10 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">No results for "{q}"</p>
          <p className="text-muted text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {!loading && !q && (
        <div className="card p-10 text-center">
          <p className="text-4xl mb-3">🎵</p>
          <p className="font-semibold">Search for anything</p>
          <p className="text-muted text-sm mt-1">Tracks, albums, artists — or find users by username</p>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="space-y-6">
          <p className="text-sm text-muted">{total} results for "{q}"</p>

          {profiles.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <Users size={13} /> Users
              </h2>
              {profiles.map((p) => (
                <ProfileCard key={p.id} profile={p} />
              ))}
            </div>
          )}

          {tracks.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <Music size={13} /> Tracks
              </h2>
              {tracks.map((item) => (
                <MusicCard key={item.spotify_id} item={item} />
              ))}
            </div>
          )}

          {albums.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <Disc3 size={13} /> Albums
              </h2>
              {albums.map((item) => (
                <MusicCard key={item.spotify_id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
