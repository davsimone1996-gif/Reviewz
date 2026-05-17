// ─────────────────────────────────────────────────────────────────
// Spotify API integration
// Uses Client Credentials flow for search (no user auth needed)
// Token is cached in memory for its TTL
// ─────────────────────────────────────────────────────────────────

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_BASE  = 'https://api.spotify.com/v1'

let _accessToken = null
let _tokenExpiresAt = 0

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiresAt) return _accessToken

  const clientId     = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials. Set VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET.')
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) throw new Error('Failed to get Spotify access token')

  const json = await response.json()
  _accessToken = json.access_token
  _tokenExpiresAt = Date.now() + json.expires_in * 1000 - 60_000 // 1 min buffer
  return _accessToken
}

async function spotifyFetch(endpoint) {
  const token = await getAccessToken()
  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
  return res.json()
}

// ─── Normalise results to a common shape ────────────────────────

function normaliseTrack(track) {
  return {
    spotify_id:   track.id,
    spotify_type: 'track',
    title:        track.name,
    artist:       track.artists.map((a) => a.name).join(', '),
    cover_url:    track.album?.images?.[0]?.url ?? null,
    spotify_url:  track.external_urls.spotify,
    preview_url:  track.preview_url ?? null,
    duration_ms:  track.duration_ms,
  }
}

function normaliseAlbum(album) {
  return {
    spotify_id:   album.id,
    spotify_type: 'album',
    title:        album.name,
    artist:       album.artists.map((a) => a.name).join(', '),
    cover_url:    album.images?.[0]?.url ?? null,
    spotify_url:  album.external_urls.spotify,
    preview_url:  null,
    release_date: album.release_date,
    total_tracks: album.total_tracks,
  }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Search Spotify for tracks and/or albums
 * @param {string} query
 * @param {'track'|'album'|'both'} type
 * @param {number} limit
 */
export async function searchSpotify(query, type = 'both', limit = 8) {
  if (!query.trim()) return { tracks: [], albums: [] }

  const types = type === 'both' ? 'track,album' : type
  const encoded = encodeURIComponent(query)
  const data = await spotifyFetch(`/search?q=${encoded}&type=${types}&limit=${limit}&market=US`)

  return {
    tracks: type !== 'album' ? (data.tracks?.items ?? []).map(normaliseTrack) : [],
    albums: type !== 'track' ? (data.albums?.items ?? []).map(normaliseAlbum) : [],
  }
}

/**
 * Fetch a single track by Spotify ID
 */
export async function getTrack(spotifyId) {
  const data = await spotifyFetch(`/tracks/${spotifyId}`)
  return normaliseTrack(data)
}

/**
 * Fetch a single album by Spotify ID
 */
export async function getAlbum(spotifyId) {
  const data = await spotifyFetch(`/albums/${spotifyId}`)
  return normaliseAlbum(data)
}

/**
 * Fetch new releases (uses client credentials – no user auth needed)
 * @param {string} market  ISO 3166-1 alpha-2 country code (default 'IT')
 * @param {number} limit
 */
export async function getNewReleases(market = 'IT', limit = 20) {
  const data = await spotifyFetch(`/browse/new-releases?market=${market}&limit=${limit}`)
  return (data.albums?.items ?? []).map(normaliseAlbum)
}

/**
 * Search Spotify for artists
 */
export async function searchArtists(query, limit = 8) {
  if (!query.trim()) return []
  const data = await spotifyFetch(
    `/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}&market=IT`
  )
  return (data.artists?.items ?? []).map((a) => ({
    spotify_artist_id: a.id,
    artist_name:       a.name,
    artist_image_url:  a.images?.[0]?.url ?? null,
    genres:            a.genres?.slice(0, 3) ?? [],
    followers:         a.followers?.total ?? 0,
  }))
}

/**
 * Fetch a single artist by Spotify ID
 */
export async function getArtist(artistId) {
  const data = await spotifyFetch(`/artists/${artistId}`)
  return {
    spotify_artist_id: data.id,
    artist_name:       data.name,
    artist_image_url:  data.images?.[0]?.url ?? null,
    genres:            data.genres?.slice(0, 3) ?? [],
    followers:         data.followers?.total ?? 0,
    spotify_url:       data.external_urls?.spotify ?? null,
  }
}

/**
 * Fetch discography for a given Spotify artist ID
 */
export async function getArtistAlbums(artistId, limit = 20) {
  const data = await spotifyFetch(
    `/artists/${artistId}/albums?album_type=album,single,ep&market=IT&limit=${limit}`
  )
  return (data.items ?? []).map(normaliseAlbum)
}

/**
 * Fetch the most recent album/single for a given Spotify artist ID
 */
export async function getArtistLatestRelease(artistId) {
  const data = await spotifyFetch(
    `/artists/${artistId}/albums?album_type=album,single&market=IT&limit=1`
  )
  const item = data.items?.[0]
  if (!item) return null
  return {
    id:           item.id,
    title:        item.name,
    cover_url:    item.images?.[0]?.url ?? null,
    spotify_url:  item.external_urls?.spotify ?? null,
    release_date: item.release_date,
    album_type:   item.album_type,
  }
}
