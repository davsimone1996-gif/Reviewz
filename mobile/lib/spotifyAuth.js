import * as SecureStore from 'expo-secure-store'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const SS_PREFIX = 'reviewz_sp_'

// ─── Token storage (SecureStore) ─────────────────────────────────

export async function saveTokens({ access_token, refresh_token, expires_in }) {
  await SecureStore.setItemAsync(SS_PREFIX + 'access_token', access_token)
  if (refresh_token) {
    await SecureStore.setItemAsync(SS_PREFIX + 'refresh_token', refresh_token)
  }
  await SecureStore.setItemAsync(SS_PREFIX + 'expires_at', String(Date.now() + expires_in * 1000 - 60_000))
}

export async function getStoredTokens() {
  const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
    SecureStore.getItemAsync(SS_PREFIX + 'access_token'),
    SecureStore.getItemAsync(SS_PREFIX + 'refresh_token'),
    SecureStore.getItemAsync(SS_PREFIX + 'expires_at'),
  ])
  return {
    accessToken,
    refreshToken,
    expiresAt: parseInt(expiresAtStr ?? '0', 10),
  }
}

export async function clearSpotifyTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(SS_PREFIX + 'access_token'),
    SecureStore.deleteItemAsync(SS_PREFIX + 'refresh_token'),
    SecureStore.deleteItemAsync(SS_PREFIX + 'expires_at'),
  ])
}

export async function isSpotifyConnected() {
  const { accessToken, refreshToken } = await getStoredTokens()
  return !!(accessToken && refreshToken)
}

// ─── Token refresh ────────────────────────────────────────────────

async function refreshAccessToken() {
  const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID
  const { refreshToken } = await getStoredTokens()
  if (!refreshToken) throw new Error('No refresh token')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }).toString(),
  })

  if (!res.ok) throw new Error('Failed to refresh Spotify token')
  const json = await res.json()
  await saveTokens({ ...json, refresh_token: json.refresh_token ?? refreshToken })
  return json.access_token
}

// ─── Authenticated fetch ──────────────────────────────────────────

export async function userSpotifyFetch(endpoint) {
  let { accessToken, expiresAt } = await getStoredTokens()
  if (!accessToken) throw new Error('Spotify not connected')
  if (Date.now() > expiresAt) {
    accessToken = await refreshAccessToken()
  }

  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 204) return null
  if (res.status === 401) {
    accessToken = await refreshAccessToken()
    const retry = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (retry.status === 204) return null
    if (!retry.ok) throw new Error(`Spotify API error: ${retry.status}`)
    return retry.json()
  }
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
  return res.json()
}

// ─── Spotify User Profile ─────────────────────────────────────────

export async function getSpotifyUser() {
  const data = await userSpotifyFetch('/me')
  if (!data) return null
  return {
    spotify_user_id:  data.id,
    spotify_username: data.display_name ?? data.id,
    spotify_url:      data.external_urls?.spotify ?? null,
    spotify_image:    data.images?.[0]?.url ?? null,
  }
}

// ─── Currently Playing ────────────────────────────────────────────

export async function getCurrentlyPlaying() {
  const data = await userSpotifyFetch('/me/player/currently-playing')
  if (!data || !data.item || !data.is_playing) return null
  const item = data.item
  return {
    title:       item.name,
    artist:      item.artists?.map((a) => a.name).join(', ') ?? '',
    cover_url:   item.album?.images?.[0]?.url ?? null,
    spotify_url: item.external_urls?.spotify ?? null,
    is_episode:  item.type === 'episode',
  }
}

// ─── OAuth discovery (for expo-auth-session) ─────────────────────

export const spotifyDiscovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
}

export const SPOTIFY_SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-library-modify',
  'user-library-read',
]
