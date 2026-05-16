// Reviewz – send-push Edge Function
// Triggered by a DB webhook when a row is inserted in public.notifications.
// Fetches the target user's push subscriptions and sends a Web Push payload.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@reviewz.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
)

Deno.serve(async (req: Request) => {
  // Allow only POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Validate internal secret to avoid public invocations
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  let notification: Record<string, unknown>
  try {
    notification = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const { user_id, actor_id, type, post_id } = notification as {
    user_id:  string
    actor_id: string
    type:     'follow' | 'like' | 'comment'
    post_id:  string | null
  }

  // Fetch actor profile for notification copy
  const { data: actor } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', actor_id)
    .single()

  const actorName = actor?.username ?? 'Qualcuno'
  const body =
    type === 'follow'  ? `${actorName} ha iniziato a seguirti` :
    type === 'like'    ? `${actorName} ha messo like alla tua recensione` :
                         `${actorName} ha commentato la tua recensione`

  const url = post_id ? `/post/${post_id}` : `/profile/${actorName}`

  // Fetch all active push subscriptions for the recipient
  const { data: rows, error: fetchErr } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, subscription')
    .eq('user_id', user_id)

  if (fetchErr) {
    console.error('Failed to fetch subscriptions:', fetchErr)
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 })
  }

  if (!rows?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
  }

  const payload = JSON.stringify({ title: 'Reviewz', body, url, icon: '/logo.png', badge: '/logo.png' })

  const results = await Promise.allSettled(
    rows.map(({ subscription }) => webpush.sendNotification(subscription, payload))
  )

  // Clean up expired / invalid subscriptions (HTTP 410 Gone from push service)
  const expiredIds: string[] = []
  results.forEach((result, i) => {
    if (
      result.status === 'rejected' &&
      (result.reason?.statusCode === 410 || result.reason?.statusCode === 404)
    ) {
      expiredIds.push(rows[i].id)
    }
  })

  if (expiredIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds)
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length
  console.log(`Push sent: ${sent}/${rows.length}, expired removed: ${expiredIds.length}`)

  return new Response(JSON.stringify({ sent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
