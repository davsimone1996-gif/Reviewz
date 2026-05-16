// ─────────────────────────────────────────────────────────────────
// Spotify OAuth – PKCE flow (no backend required)
// Scopes: user-read-currently-playing
// Tokens are stored in localStorage (per-device)
// ─────────────────────────────────────────────────────────────────

const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com'
const SPOTIFY_API_BASE  = 'https://api.spotify.com/v1'
const SCOPES = 'user-read-currently-playing user-read-playback-state'
const LS_PREFIX = 'reviewz_sp_'

// ─── PKCE helpers ────────────────────────────────────────────────

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64urlEncode(array)
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64urlEncode(digest)
}

// ─── Token storage ────────────────────────────────────────────────

function saveTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem(LS_PREFIX + 'access_token', access_token)
  localStorage.setItem(LS_PREFIX + 'refresh_token', refresh_token)
  localStorage.setItem(LS_PREFIX + 'expires_at', Date.now() + expires_in * 1000 - 60_000)
}

export function getStoredTokens() {
  return {
    accessToken:  localStorage.getItem(LS_PREFIX + 'access_token'),
    refreshToken: localStorage.getItem(LS_PREFIX + 'refresh_token'),
    expiresAt:    parseInt(localStorage.getItem(LS_PREFIX + 'expires_at') ?? '0', 10),
  }
}

export function clearSpotifyTokens() {
  localStorage.removeItem(LS_PREFIX + 'access_token')
  localStorage.removeItem(LS_PREFIX + 'refresh_token')
  localStorage.removeItem(LS_PREFIX + 'expires_at')
}

export function isSpotifyConnected() {
  const { accessToken, refreshToken } = getStoredTokens()
  return !!(accessToken && refreshToken)
}

// ─── OAuth initiation ─────────────────────────────────────────────

export async function startSpotifyAuth() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  if (!clientId) throw new Error('Missing VITE_SPOTIFY_CLIENT_ID')

  const verifier = await generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('spotify_pkce_verifier', verifier)

  // CSRF protection: random state param validated in the callback
  const state = base64urlEncode(crypto.getRandomValues(new Uint8Array(16)))
  sessionStorage.setItem('spotify_oauth_state', state)

  const redirectUri = `${window.location.origin}/spotify-callback`
  const params = new URLSearchParams({
    client_id:             clientId,
    response_type:         'code',
    redirect_uri:          redirectUri,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
    scope:                 SCOPES,
    state,
  })

  window.location.href = `${SPOTIFY_AUTH_BASE}/authorize?${params}`
}

// ─── Token exchange (called in callback page) ─────────────────────

export async function exchangeCodeForTokens(code) {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  const verifier = sessionStorage.getItem('spotify_pkce_verifier')
  const redirectUri = `${window.location.origin}/spotify-callback`

  const body = new URLSearchParams({
    client_id:     clientId,
    grant_type:    'authorization_code',
    code,
    redirect_uri:  redirectUri,
    code_verifier: verifier,
  })

  const res = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) throw new Error('Failed to exchange code for tokens')
  const json = await res.json()
  saveTokens(json)
  sessionStorage.removeItem('spotify_pkce_verifier')
  return json
}

// ─── Token refresh ────────────────────────────────────────────────

async function refreshAccessToken() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  const { refreshToken } = getStoredTokens()
  if (!refreshToken) throw new Error('No refresh token stored')

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    client_id:     clientId,
  })

  const res = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) throw new Error('Failed to refresh token')
  const json = await res.json()
  saveTokens({ ...json, refresh_token: json.refresh_token ?? refreshToken })
  return json.access_token
}

// ─── Authenticated fetch with auto-refresh ────────────────────────

async function userSpotifyFetch(endpoint) {
  let { accessToken, expiresAt } = getStoredTokens()

  if (!accessToken) throw new Error('Spotify not connected')
  if (Date.now() > expiresAt) {
    accessToken = await refreshAccessToken()
  }

  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 204) return null   // No content = not playing
  if (res.status === 401) {
    // Token might be invalid, try refresh once
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

// ─── Currently Playing ────────────────────────────────────────────

export async function getCurrentlyPlaying() {
  const data = await userSpotifyFetch('/me/player/currently-playing')
  if (!data || !data.item || !data.is_playing) return null

  const item = data.item
  return {
    title:     item.name,
    artist:    item.artists?.map((a) => a.name).join(', ') ?? item.show?.name ?? '',
    cover_url: item.album?.images?.[0]?.url ?? item.images?.[0]?.url ?? null,
    spotify_url: item.external_urls?.spotify ?? null,
    is_episode: item.type === 'episode',
  }
}
