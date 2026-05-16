// Reviewz – check-new-releases Edge Function
// Scheduled every 6 hours via Deno.cron.
// For each distinct artist followed by at least one user:
//   1. Fetch the artist's latest release from Spotify
//   2. If it's newer than what we stored, notify all followers
//   3. Update last_release_id in followed_artists

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_BASE  = 'https://api.spotify.com/v1'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
)

// ── Spotify helpers ───────────────────────────────────────────────

async function getSpotifyToken(): Promise<string> {
  const clientId     = Deno.env.get('SPOTIFY_CLIENT_ID')!
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')!

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Spotify token error: ${res.status}`)
  const { access_token } = await res.json()
  return access_token
}

interface SpotifyRelease {
  id:           string
  name:         string
  cover_url:    string | null
  spotify_url:  string
  release_date: string
  album_type:   string
}

async function getLatestRelease(artistId: string, token: string): Promise<SpotifyRelease | null> {
  const url = `${SPOTIFY_API_BASE}/artists/${artistId}/albums`
    + `?album_type=album,single&market=IT&limit=1`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null

  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null

  return {
    id:           item.id,
    name:         item.name,
    cover_url:    item.images?.[0]?.url ?? null,
    spotify_url:  item.external_urls?.spotify ?? '',
    release_date: item.release_date,
    album_type:   item.album_type,
  }
}

// ── Core logic ────────────────────────────────────────────────────

async function checkNewReleases() {
  console.log('[check-new-releases] Starting…')

  // Fetch all followed artists with their last known release
  const { data: rows, error } = await supabase
    .from('followed_artists')
    .select('id, user_id, spotify_artist_id, artist_name, last_release_id')

  if (error) { console.error('DB fetch error:', error); return }
  if (!rows?.length) { console.log('No followed artists found.'); return }

  // Deduplicate by Spotify artist ID to minimise API calls
  const artistMap = new Map<string, { name: string; lastReleaseId: string | null }>()
  for (const row of rows) {
    if (!artistMap.has(row.spotify_artist_id)) {
      artistMap.set(row.spotify_artist_id, {
        name:          row.artist_name,
        lastReleaseId: row.last_release_id,
      })
    }
  }

  const token = await getSpotifyToken()
  let notified = 0

  for (const [artistId, { name, lastReleaseId }] of artistMap) {
    const latest = await getLatestRelease(artistId, token)
    if (!latest)                        continue
    if (latest.id === lastReleaseId)    continue   // nothing new

    console.log(`New release for ${name}: "${latest.name}" (${latest.id})`)

    // All users who follow this artist
    const followers = rows
      .filter((r) => r.spotify_artist_id === artistId)
      .map((r) => r.user_id)

    // Insert a notification for each follower
    const notifications = followers.map((userId) => ({
      user_id:  userId,
      actor_id: null,
      type:     'new_release',
      metadata: {
        artist_id:      artistId,
        artist_name:    name,
        release_id:     latest.id,
        release_title:  latest.name,
        release_type:   latest.album_type,
        release_date:   latest.release_date,
        cover_url:      latest.cover_url,
        spotify_url:    latest.spotify_url,
      },
    }))

    const { error: notifErr } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notifErr) {
      console.error(`Notification insert error for ${name}:`, notifErr)
      continue
    }

    // Update last_release_id for all rows of this artist
    await supabase
      .from('followed_artists')
      .update({ last_release_id: latest.id, last_release_title: latest.name })
      .eq('spotify_artist_id', artistId)

    notified += followers.length
  }

  console.log(`[check-new-releases] Done. Notifications sent: ${notified}`)
}

// ── Schedule: every 6 hours ───────────────────────────────────────

Deno.cron('check-new-releases', '0 */6 * * *', checkNewReleases)

// ── HTTP handler: manual trigger (protected) ──────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }
  await checkNewReleases()
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
