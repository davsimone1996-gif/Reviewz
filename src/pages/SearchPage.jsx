import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Music, Disc3, Search as SearchIcon, Play, PenLine, Users, Mic2, Bell, BellOff } from 'lucide-react'
import { searchSpotify, searchArtists, getArtistLatestRelease } from '../lib/spotify'
import { searchProfiles, followArtist, unfollowArtist, isFollowingArtist } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import Spinner from '../components/UI/Spinner'
import Avatar from '../components/UI/Avatar'
import ScoreBadge from '../components/UI/ScoreBadge'

// ── Music card ─────────────────────────────────────────────────────

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
          {item.spotify_type === 'track'
            ? <Music size={9} className="text-white" />
            : <Disc3  size={9} className="text-white" />}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate group-hover:text-accent transition-colors">{item.title}</p>
        <p className="text-sm text-muted truncate">{item.artist}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => navigate('/create', { state: { preselected: item } })}
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

// ── Profile card ───────────────────────────────────────────────────

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

// ── Artist card ────────────────────────────────────────────────────

function ArtistCard({ artist }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data: following = false, isLoading: checkingFollow } = useQuery({
    queryKey: ['artist-following', user?.id, artist.spotify_artist_id],
    queryFn:  () => isFollowingArtist(user.id, artist.spotify_artist_id),
    enabled:  !!user,
  })

  const followMut = useMutation({
    mutationFn: async () => {
      if (following) {
        await unfollowArtist(user.id, artist.spotify_artist_id)
      } else {
        const latest = await getArtistLatestRelease(artist.spotify_artist_id)
        await followArtist(user.id, artist, latest)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['artist-following', user?.id, artist.spotify_artist_id] })
      qc.invalidateQueries({ queryKey: ['followed-artists', user?.id] })
    },
  })

  return (
    <div className="card-hover p-4 flex items-center gap-4 animate-fade-in-up group">
      <Link
        to={`/artist/${encodeURIComponent(artist.artist_name)}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        {artist.artist_image_url ? (
          <img
            src={artist.artist_image_url}
            alt={artist.artist_name}
            className="w-14 h-14 rounded-full object-cover shadow-lg shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-surface-200 flex items-center justify-center text-muted shrink-0">
            <Mic2 size={22} />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold truncate group-hover:text-accent transition-colors">
            {artist.artist_name}
          </p>
          {artist.genres.length > 0 && (
            <p className="text-xs text-muted truncate">{artist.genres.join(' · ')}</p>
          )}
        </div>
      </Link>

      {user && (
        <button
          onClick={(e) => { e.preventDefault(); followMut.mutate() }}
          disabled={followMut.isPending || checkingFollow}
          className={`shrink-0 flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-xl font-semibold transition-all ${
            following
              ? 'bg-surface-200 border border-surface-300 text-muted hover:text-red-400 hover:border-red-400/40'
              : 'bg-accent/10 border border-accent/30 text-accent hover:bg-accent hover:text-white'
          }`}
          title={following ? 'Smetti di seguire' : 'Segui per notifiche sulle nuove uscite'}
        >
          {following ? <BellOff size={13} /> : <Bell size={13} />}
          {following ? 'Seguito' : 'Segui'}
        </button>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q     = searchParams.get('q') || ''
  const [input, setInput] = useState(q)

  const { data: musicData,   isLoading: musicLoading,   isFetching: musicFetching }   = useQuery({
    queryKey: ['spotify-search', q],
    queryFn:  () => searchSpotify(q, 'both', 10),
    enabled:  q.length > 1,
  })

  const { data: artistData,  isLoading: artistLoading,  isFetching: artistFetching }  = useQuery({
    queryKey: ['artist-search', q],
    queryFn:  () => searchArtists(q, 6),
    enabled:  q.length > 1,
  })

  const { data: profilesData, isLoading: profilesLoading, error: profilesError } = useQuery({
    queryKey: ['profiles-search', q],
    queryFn:  () => searchProfiles(q),
    enabled:  q.length > 1,
    retry:    false,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) setSearchParams({ q: input.trim() })
  }

  const tracks   = musicData?.tracks ?? []
  const albums   = musicData?.albums ?? []
  const artists  = artistData ?? []
  const profiles = profilesData ?? []
  const musicDone   = !musicLoading && !musicFetching
  const artistsDone = !artistLoading && !artistFetching
  const total = tracks.length + albums.length + artists.length + profiles.length

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">Search</h1>
        <p className="text-muted text-sm">Musica, artisti e utenti</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Artista, brano, album o username…"
            className="input pl-11 py-3 text-base"
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary px-6">Cerca</button>
      </form>

      {profilesError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          Errore ricerca utenti: {profilesError.message}
        </div>
      )}

      {!q && (
        <div className="card p-6 sm:p-10 text-center">
          <p className="text-2xl sm:text-4xl mb-3">🎵</p>
          <p className="font-semibold">Cerca qualsiasi cosa</p>
          <p className="text-muted text-sm mt-1">Brani, album, artisti o utenti — segui un artista per ricevere notifiche sulle nuove uscite</p>
        </div>
      )}

      {profilesLoading && q && (
        <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
      )}

      {!profilesLoading && q && (
        <div className="space-y-6">
          {musicDone && artistsDone && total === 0 && (
            <div className="card p-6 sm:p-10 text-center">
              <p className="text-2xl sm:text-4xl mb-3">🔍</p>
              <p className="font-semibold">Nessun risultato per "{q}"</p>
            </div>
          )}

          {/* Users */}
          {profiles.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <Users size={13} /> Utenti
              </h2>
              {profiles.map((p) => <ProfileCard key={p.id} profile={p} />)}
            </div>
          )}

          {/* Artists */}
          {(!artistsDone || artists.length > 0) && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <Mic2 size={13} /> Artisti
                <span className="text-[10px] font-normal text-muted">· segui per ricevere notifiche sulle nuove uscite</span>
              </h2>
              {!artistsDone
                ? <div className="flex items-center gap-2 text-muted text-sm py-2"><Spinner className="w-4 h-4" /><span>Ricerca artisti…</span></div>
                : artists.map((a) => <ArtistCard key={a.spotify_artist_id} artist={a} />)
              }
            </div>
          )}

          {/* Tracks */}
          {(!musicDone || tracks.length > 0) && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <Music size={13} /> Brani
              </h2>
              {!musicDone
                ? <div className="flex items-center gap-2 text-muted text-sm py-2"><Spinner className="w-4 h-4" /><span>Ricerca brani…</span></div>
                : tracks.map((item) => <MusicCard key={item.spotify_id} item={item} />)
              }
            </div>
          )}

          {/* Albums */}
          {musicDone && albums.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <Disc3 size={13} /> Album
              </h2>
              {albums.map((item) => <MusicCard key={item.spotify_id} item={item} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
