const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_BASE  = 'https://api.spotify.com/v1'

let _accessToken = null
let _tokenExpiresAt = 0

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiresAt) return _accessToken

  const clientId     = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials in .env')
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
  _tokenExpiresAt = Date.now() + json.expires_in * 1000 - 60_000
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

export async function getTrack(spotifyId) {
  const data = await spotifyFetch(`/tracks/${spotifyId}`)
  return normaliseTrack(data)
}

export async function getAlbum(spotifyId) {
  const data = await spotifyFetch(`/albums/${spotifyId}`)
  return normaliseAlbum(data)
}

const NMF_PLAYLISTS = {
  IT: '37i9dQZF1DX4JAvHpjipBk',
  GLOBAL: '37i9dQZF1DXcBWIGoYBM5M',
}

export function getLastFridayDate() {
  const now = new Date()
  const day = now.getDay()
  const daysBack = day === 5 ? 0 : (day + 2) % 7
  const friday = new Date(now)
  friday.setDate(now.getDate() - daysBack)
  return friday.toISOString().slice(0, 10)
}

export function getNextFridayDate() {
  const now = new Date()
  const day = now.getDay()
  const daysAhead = day === 5 ? 7 : (5 - day + 7) % 7
  const friday = new Date(now)
  friday.setDate(now.getDate() + (daysAhead === 0 ? 7 : daysAhead))
  return friday.toISOString().slice(0, 10)
}

export async function getNewReleases(market = 'IT', limit = 50) {
  const seen = new Set()
  const results = []

  const addAlbum = (album) => {
    if (!seen.has(album.spotify_id)) {
      seen.add(album.spotify_id)
      results.push(album)
    }
  }

  const playlistIds = market === 'IT'
    ? [NMF_PLAYLISTS.IT, NMF_PLAYLISTS.GLOBAL]
    : [NMF_PLAYLISTS.GLOBAL]

  for (const pid of playlistIds) {
    try {
      const data = await spotifyFetch(
        `/playlists/${pid}/tracks?limit=50&market=${market}&fields=items(track(album(id,name,artists,images,external_urls,release_date,total_tracks,album_type)))`
      )
      for (const item of data.items ?? []) {
        const album = item?.track?.album
        if (album?.id) addAlbum(normaliseAlbum(album))
      }
    } catch { /* playlist unavailable */ }
  }

  try {
    const data = await spotifyFetch(`/search?q=tag:new&type=album&market=${market}&limit=50`)
    for (const album of data.albums?.items ?? []) {
      addAlbum(normaliseAlbum(album))
    }
  } catch { /* search unavailable */ }

  return results
    .sort((a, b) => {
      const da = a.release_date ? new Date(a.release_date) : new Date(0)
      const db = b.release_date ? new Date(b.release_date) : new Date(0)
      return db - da
    })
    .slice(0, limit)
}

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

export async function getArtistAlbums(artistId, limit = 20) {
  const data = await spotifyFetch(
    `/artists/${artistId}/albums?album_type=album,single,ep&market=IT&limit=${limit}`
  )
  return (data.items ?? []).map(normaliseAlbum)
}

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
