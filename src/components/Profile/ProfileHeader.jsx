import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit2, Check, X, UserCheck, UserPlus, Music2, Headphones, LogOut, Camera } from 'lucide-react'
import { followUser, unfollowUser, updateProfile, updateNowPlaying, uploadAvatar, uploadCover } from '../../lib/supabase'
import { startSpotifyAuth, isSpotifyConnected, getCurrentlyPlaying, clearSpotifyTokens } from '../../lib/spotifyAuth'
import useAuthStore from '../../store/authStore'
import Avatar from '../UI/Avatar'
import ScoreBadge from '../UI/ScoreBadge'

function StatPill({ value, label }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 bg-surface-200/50 rounded-xl border border-surface-300/30">
      <span className="text-lg font-bold text-gray-100">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

function NowPlayingBadge({ track }) {
  if (!track) return null
  return (
    <a
      href={track.now_playing_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1 group"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <Headphones size={12} className="text-green-400 shrink-0" />
      {track.now_playing_cover_url && (
        <img
          src={track.now_playing_cover_url}
          alt=""
          className="w-5 h-5 rounded object-cover shrink-0"
        />
      )}
      <span className="text-xs text-green-400 truncate max-w-[130px] sm:max-w-[200px] group-hover:underline">
        {track.now_playing_title} · {track.now_playing_artist}
      </span>
    </a>
  )
}

export default function ProfileHeader({ profile, isFollowing, isOwn, postCount = 0 }) {
  const { user, setProfile: setStoreProfile, logout } = useAuthStore()
  const qc = useQueryClient()
  const [editing, setEditing]         = useState(false)
  const [bio, setBio]                 = useState(profile.bio ?? '')
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const avatarInputRef = useRef(null)
  const coverInputRef  = useRef(null)

  // Check Spotify connection status on mount (only for own profile)
  useEffect(() => {
    if (!isOwn) return
    setSpotifyConnected(isSpotifyConnected())
  }, [isOwn])

  // Fetch + store currently playing (only when viewing own profile)
  useEffect(() => {
    if (!isOwn || !user) return
    if (!isSpotifyConnected()) return

    let cancelled = false

    const sync = async () => {
      try {
        const track = await getCurrentlyPlaying()
        if (!cancelled) {
          await updateNowPlaying(user.id, track)
          qc.invalidateQueries({ queryKey: ['profile', profile.username] })
        }
      } catch (e) {
        console.error('Currently playing sync error:', e)
      }
    }

    sync()
    const interval = setInterval(sync, 30_000) // refresh every 30s
    return () => { cancelled = true; clearInterval(interval) }
  }, [isOwn, user, profile.username, qc])

  const followMut = useMutation({
    mutationFn: () =>
      isFollowing
        ? unfollowUser(user.id, profile.id)
        : followUser(user.id, profile.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['following', user?.id, profile.id] })
      const prev = qc.getQueryData(['following', user?.id, profile.id])
      qc.setQueryData(['following', user?.id, profile.id], !isFollowing)
      return { prev }
    },
    onError: (_err, _vars, context) => {
      qc.setQueryData(['following', user?.id, profile.id], context?.prev)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', profile.username] })
      qc.invalidateQueries({ queryKey: ['following', user?.id, profile.id] })
      qc.invalidateQueries({ queryKey: ['feed', user?.id] })
      qc.invalidateQueries({ queryKey: ['trending', user?.id] })
    },
  })

  const editMut = useMutation({
    mutationFn: () => updateProfile(user.id, { bio }),
    onSuccess: (updated) => {
      setStoreProfile({ ...profile, ...updated })
      qc.invalidateQueries({ queryKey: ['profile', profile.username] })
      setEditing(false)
    },
  })

  const avatarMut = useMutation({
    mutationFn: (file) => uploadAvatar(user.id, file),
    onSuccess: (updated) => {
      setStoreProfile({ ...profile, ...updated })
      qc.invalidateQueries({ queryKey: ['profile', profile.username] })
    },
  })

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    avatarMut.mutate(file)
    e.target.value = ''
  }

  const coverMut = useMutation({
    mutationFn: (file) => uploadCover(user.id, file),
    onSuccess: (updated) => {
      setStoreProfile({ ...profile, ...updated })
      qc.invalidateQueries({ queryKey: ['profile', profile.username] })
    },
  })

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    coverMut.mutate(file)
    e.target.value = ''
  }

  const handleDisconnectSpotify = () => {
    clearSpotifyTokens()
    setSpotifyConnected(false)
    updateNowPlaying(user.id, null).catch(() => {})
    qc.invalidateQueries({ queryKey: ['profile', profile.username] })
  }

  const nowPlaying = profile.now_playing_title
    ? profile
    : null

  return (
    <div className="card animate-fade-in-up overflow-visible">
      {/* Cover banner */}
      <div className="h-28 sm:h-36 relative overflow-hidden rounded-t-2xl">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-surface-200 to-surface-100" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent" />
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />
          </>
        )}

        {/* Upload overlay — only for own profile */}
        {isOwn && (
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={coverMut.isPending}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group rounded-t-2xl"
            title="Cambia immagine di copertina"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              {coverMut.isPending
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={13} />}
              {coverMut.isPending ? 'Caricamento…' : 'Cambia copertina'}
            </span>
          </button>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverChange}
        />
      </div>

      <div className="px-5 pb-5">
        {/* Avatar + actions row */}
        <div className="flex items-end justify-between -mt-10 mb-4">
          <div className="ring-4 ring-surface-100 rounded-full relative z-10">
            {isOwn ? (
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarMut.isPending}
                className="relative group rounded-full focus:outline-none"
                title="Cambia foto profilo"
              >
                <Avatar src={profile.avatar_url} username={profile.username} size="xl" />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarMut.isPending
                    ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={20} className="text-white" />}
                </span>
              </button>
            ) : (
              <Avatar src={profile.avatar_url} username={profile.username} size="xl" />
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex gap-2 mt-2">
            {isOwn && !editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
                >
                  <Edit2 size={13} /> Edit profile
                </button>
                {/* Logout — visible on mobile only (hidden on sm+ where navbar logout is shown) */}
                <button
                  onClick={logout}
                  title="Sign out"
                  className="sm:hidden btn-secondary p-2 text-muted hover:text-red-400"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
            {!isOwn && user && (
              <button
                onClick={() => followMut.mutate()}
                disabled={followMut.isPending}
                className={`flex items-center gap-1.5 text-sm py-1.5 ${
                  isFollowing ? 'btn-secondary' : 'btn-primary'
                }`}
              >
                {isFollowing
                  ? <><UserCheck size={14} /> Following</>
                  : <><UserPlus size={14} /> Follow</>}
              </button>
            )}
          </div>
        </div>

        {/* Name + score */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          <ScoreBadge score={profile.social_score} />
        </div>

        {/* Spotify profile link */}
        {profile.spotify_profile_url && (
          <a
            href={profile.spotify_profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-1 mb-0.5 text-xs font-medium text-[#1DB954] hover:text-[#1ed760] transition-colors group"
            title="Apri profilo Spotify"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <span className="group-hover:underline">Spotify</span>
          </a>
        )}

        {/* Now Playing */}
        <NowPlayingBadge track={nowPlaying} />

        {/* Spotify Connect / Disconnect (solo profilo proprio) */}
        {isOwn && (
          <div className="mt-2 mb-2">
            {spotifyConnected ? (
              <button
                onClick={handleDisconnectSpotify}
                className="text-xs text-muted hover:text-red-400 underline transition-colors"
              >
                Disconnetti Spotify
              </button>
            ) : (
              <button
                onClick={startSpotifyAuth}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-colors"
              >
                <Music2 size={12} />
                Connetti Spotify per mostrare cosa stai ascoltando
              </button>
            )}
          </div>
        )}

        {/* Bio */}
        {editing ? (
          <div className="flex gap-2 mb-4 mt-2">
            <input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input text-sm flex-1"
              placeholder="Tell us about yourself…"
              maxLength={200}
              autoFocus
            />
            <button onClick={() => editMut.mutate()} className="btn-primary px-3 py-2">
              <Check size={14} />
            </button>
            <button onClick={() => { setEditing(false); setBio(profile.bio ?? '') }} className="btn-secondary px-3 py-2">
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="text-muted text-sm mb-4 min-h-[1.25rem]">
            {profile.bio || (isOwn ? 'No bio yet — click Edit profile to add one.' : '')}
          </p>
        )}

        {/* Stats row */}
        <div className="flex gap-3 flex-wrap">
          <StatPill value={postCount}               label="Reviews"   />
          <StatPill value={profile.followers_count} label="Followers"  />
          <StatPill value={profile.following_count} label="Following"  />
          <StatPill value={profile.social_score}    label="Score"      />
        </div>
      </div>
    </div>
  )
}
