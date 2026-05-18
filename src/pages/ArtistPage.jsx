import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Music2, Disc3, ArrowLeft, ExternalLink,
  Trophy, CalendarDays, MapPin, Star,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { searchArtists, getArtist, getArtistAlbums } from '../lib/spotify'
import {
  fetchPostsByArtistName,
  isFollowingArtist, followArtist, unfollowArtist,
  getFollowedArtists,
} from '../lib/supabase'
import { getArtistLatestRelease } from '../lib/spotify'
import useAuthStore from '../store/authStore'
import Spinner from '../components/UI/Spinner'
import Avatar from '../components/UI/Avatar'
import StarRating from '../components/UI/StarRating'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFollowers(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

// rank songs by number of reviews
function rankSongs(posts, topN = 5) {
  const map = {}
  for (const p of posts) {
    if (p.spotify_type !== 'track') continue
    if (!map[p.spotify_id]) {
      map[p.spotify_id] = { spotify_id: p.spotify_id, title: p.title, cover_url: p.cover_url, spotify_url: p.spotify_url, count: 0, totalRating: 0 }
    }
    map[p.spotify_id].count++
    map[p.spotify_id].totalRating += p.rating ?? 0
  }
  return Object.values(map)
    .sort((a, b) => b.count - a.count || b.totalRating - a.totalRating)
    .slice(0, topN)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FollowButton({ user, artist, posts }) {
  const qc = useQueryClient()
  const [optimistic, setOptimistic] = useState(null)

  const { data: following, isLoading } = useQuery({
    queryKey: ['artist-following', user?.id, artist?.spotify_artist_id],
    queryFn: () => isFollowingArtist(user.id, artist.spotify_artist_id),
    enabled: !!user && !!artist,
    staleTime: 1000 * 60 * 5,
  })

  const mutFollow = useMutation({
    mutationFn: async () => {
      const latest = await getArtistLatestRelease(artist.spotify_artist_id)
      await followArtist(user.id, artist, latest)
    },
    onMutate: () => setOptimistic(true),
    onSettled: () => { setOptimistic(null); qc.invalidateQueries({ queryKey: ['artist-following', user.id, artist.spotify_artist_id] }); qc.invalidateQueries({ queryKey: ['followed-artists', user.id] }) },
  })

  const mutUnfollow = useMutation({
    mutationFn: () => unfollowArtist(user.id, artist.spotify_artist_id),
    onMutate: () => setOptimistic(false),
    onSettled: () => { setOptimistic(null); qc.invalidateQueries({ queryKey: ['artist-following', user.id, artist.spotify_artist_id] }); qc.invalidateQueries({ queryKey: ['followed-artists', user.id] }) },
  })

  if (!user) return null
  if (isLoading) return <div className="w-24 h-9 rounded-full bg-white/10 animate-pulse" />

  const isFollowing = optimistic !== null ? optimistic : following

  return isFollowing ? (
    <button
      onClick={() => mutUnfollow.mutate()}
      disabled={mutUnfollow.isPending}
      className="px-5 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors border border-white/30"
    >
      Following
    </button>
  ) : (
    <button
      onClick={() => mutFollow.mutate()}
      disabled={mutFollow.isPending}
      className="px-5 py-2 rounded-full bg-accent hover:bg-accent/90 text-white text-sm font-semibold transition-colors shadow-lg shadow-accent/30"
    >
      Follow
    </button>
  )
}

function RankedSongs({ songs }) {
  if (!songs.length) return (
    <p className="text-muted text-sm text-center py-8">No track reviews yet for this artist.</p>
  )
  return (
    <ol className="space-y-3">
      {songs.map((song, i) => (
        <li key={song.spotify_id} className="flex items-center gap-3">
          <span className={`w-7 text-center font-bold text-lg shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted'}`}>
            {i + 1}
          </span>
          {song.cover_url && (
            <img src={song.cover_url} alt={song.title} className="w-11 h-11 rounded-lg object-cover shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate text-gray-100">{song.title}</p>
            <p className="text-xs text-muted">{song.count} {song.count === 1 ? 'review' : 'reviews'}</p>
          </div>
          <a href={song.spotify_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-[#1DB954] transition-colors shrink-0">
            <ExternalLink size={14} />
          </a>
        </li>
      ))}
    </ol>
  )
}

function AlbumGrid({ albums }) {
  if (!albums.length) return (
    <p className="text-muted text-sm text-center py-8">No albums found.</p>
  )
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {albums.map((album) => (
        <a
          key={album.spotify_id}
          href={album.spotify_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-surface-200">
            {album.cover_url
              ? <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              : <div className="w-full h-full flex items-center justify-center"><Disc3 size={32} className="text-muted" /></div>
            }
          </div>
          <p className="text-sm font-semibold text-gray-100 truncate">{album.title}</p>
          <p className="text-xs text-muted">{album.release_date?.slice(0, 4) ?? ''} · {album.spotify_type?.toUpperCase()}</p>
        </a>
      ))}
    </div>
  )
}

function TourSection({ artistName }) {
  const [tab, setTab] = useState('upcoming')
  return (
    <div>
      <div className="flex gap-1 bg-surface-200/60 p-1 rounded-xl mb-5 w-fit">
        {['upcoming', 'past'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-accent text-white' : 'text-muted hover:text-gray-100'}`}
          >
            {t === 'upcoming' ? 'Upcoming' : 'Past'}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CalendarDays size={36} className="text-muted" />
        <p className="font-semibold text-gray-200">No {tab} concerts found</p>
        <p className="text-sm text-muted max-w-xs">
          Concert data isn't available yet. Check{' '}
          <a
            href={`https://www.songkick.com/search?query=${encodeURIComponent(artistName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Songkick
          </a>{' '}
          or{' '}
          <a
            href={`https://www.bandsintown.com/a/${encodeURIComponent(artistName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Bandsintown
          </a>{' '}
          for live dates.
        </p>
      </div>
    </div>
  )
}

function RecentReviews({ posts }) {
  if (!posts.length) return null
  return (
    <div className="space-y-3">
      {posts.slice(0, 6).map((post) => {
        const p = post.profiles
        return (
          <Link
            key={post.id}
            to={`/post/${post.id}`}
            className="card p-4 flex gap-3 hover:border-accent/30 transition-colors"
          >
            {post.cover_url && (
              <img src={post.cover_url} alt={post.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-100 truncate">{post.title}</p>
                <StarRating value={post.rating} size="sm" />
              </div>
              <p className="text-xs text-muted mt-0.5 line-clamp-2">{post.review_text}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Avatar src={p?.avatar_url} username={p?.username} size="xs" />
                <span className="text-xs text-muted">{p?.username}</span>
                <span className="text-xs text-muted">·</span>
                <span className="text-xs text-muted">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArtistPage() {
  const { name: encodedName } = useParams()
  const artistName = decodeURIComponent(encodedName)
  const { user } = useAuthStore()

  // 1. Resolve artist from Spotify via name search
  const { data: artistData, isLoading: loadingArtist, error: artistError } = useQuery({
    queryKey: ['spotify-artist-by-name', artistName],
    queryFn: async () => {
      const results = await searchArtists(artistName, 1)
      if (!results.length) return null
      // fetch full artist info (includes follower count)
      return getArtist(results[0].spotify_artist_id)
    },
    staleTime: 1000 * 60 * 30,
  })

  // 2. Discography
  const { data: albums = [], isLoading: loadingAlbums } = useQuery({
    queryKey: ['artist-albums', artistData?.spotify_artist_id],
    queryFn: () => getArtistAlbums(artistData.spotify_artist_id),
    enabled: !!artistData,
    staleTime: 1000 * 60 * 30,
  })

  // 3. All reviews for this artist from Supabase
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['artist-posts', artistName],
    queryFn: () => fetchPostsByArtistName(artistName),
    staleTime: 1000 * 60 * 5,
  })

  const rankedSongs = rankSongs(posts)
  const reviewCount = posts.length

  if (loadingArtist) return (
    <div className="flex justify-center py-24"><Spinner className="w-8 h-8" /></div>
  )

  if (!artistData || artistError) return (
    <div className="text-center py-24">
      <p className="text-3xl sm:text-5xl mb-4">🎵</p>
      <p className="text-muted">Artist not found.</p>
      <Link to="/" className="btn-primary mt-4 inline-flex">Back to Feed</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-muted hover:text-gray-100 text-sm transition-colors">
        <ArrowLeft size={15} /> Back
      </Link>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="relative h-48 sm:h-56">
          {artistData.artist_image_url ? (
            <>
              <img
                src={artistData.artist_image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-100 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-surface-100" />
          )}

          <div className="absolute inset-0 flex items-end p-5 gap-4">
            {artistData.artist_image_url && (
              <img
                src={artistData.artist_image_url}
                alt={artistData.artist_name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-2xl object-cover border-2 border-white/10 shrink-0"
              />
            )}
            <div className="min-w-0 pb-1 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg leading-tight">
                {artistData.artist_name}
              </h1>
              {artistData.genres.length > 0 && (
                <p className="text-white/60 text-sm mt-0.5">{artistData.genres.join(' · ')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Stats row */}
          <div className="flex items-center gap-3 sm:gap-5 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <Users size={14} />
              <span>{formatFollowers(artistData.followers)} followers</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <Star size={14} />
              <span>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'} on Reviewz</span>
            </div>
            <a
              href={artistData.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-[#1DB954] hover:text-[#1ed760] transition-colors ml-auto"
            >
              <ExternalLink size={14} /> Open in Spotify
            </a>
          </div>

          <FollowButton user={user} artist={artistData} />
        </div>
      </div>

      {/* ── Most reviewed songs ───────────────────────────────────── */}
      {(loadingPosts || rankedSongs.length > 0) && (
        <div className="card p-5">
          <h2 className="text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" /> Most Reviewed Songs
          </h2>
          {loadingPosts
            ? <div className="flex justify-center py-6"><Spinner className="w-6 h-6" /></div>
            : <RankedSongs songs={rankedSongs} />
          }
        </div>
      )}

      {/* ── Discography ───────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
          <Disc3 size={16} className="text-accent" /> Discography
        </h2>
        {loadingAlbums
          ? <div className="flex justify-center py-6"><Spinner className="w-6 h-6" /></div>
          : <AlbumGrid albums={albums} />
        }
      </div>

      {/* ── Recent reviews ────────────────────────────────────────── */}
      {posts.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Music2 size={16} className="text-blue-400" /> Recent Reviews
          </h2>
          <RecentReviews posts={posts} />
        </div>
      )}

      {/* ── Tour ─────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-gray-100 mb-4 flex items-center gap-2">
          <MapPin size={16} className="text-pink-400" /> Tour
        </h2>
        <TourSection artistName={artistData.artist_name} />
      </div>
    </div>
  )
}
