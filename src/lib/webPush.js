// ─────────────────────────────────────────────────────────────────
// Web Push Notifications — VAPID + Service Worker
// Works on Android Chrome and iOS Safari ≥16.4 (installed as PWA).
// ─────────────────────────────────────────────────────────────────

import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const SW_PATH          = '/sw.js'

// ── Service Worker ─────────────────────────────────────────────

let _sw = null

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null
  if (_sw) return _sw
  try {
    _sw = await navigator.serviceWorker.register(SW_PATH)
    return _sw
  } catch (e) {
    console.error('SW registration failed:', e)
    return null
  }
}

// ── Permission ─────────────────────────────────────────────────

export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager'   in window &&
    'Notification'  in window
  )
}

export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

// ── VAPID subscription ─────────────────────────────────────────

function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64  = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

// Subscribe this device to push and persist the subscription in Supabase.
// Safe to call multiple times — uses upsert.
export async function subscribeToPush(userId) {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') return null

  const sw = await registerSW()
  if (!sw) return null

  try {
    // Re-use existing subscription or create a new one
    let sub = await sw.pushManager.getSubscription()
    if (!sub) {
      sub = await sw.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    // Persist in Supabase (upsert by user_id + endpoint)
    await supabase.from('push_subscriptions').upsert(
      {
        user_id:      userId,
        endpoint:     sub.endpoint,
        subscription: sub.toJSON(),
      },
      { onConflict: 'user_id,endpoint' }
    )

    return sub
  } catch (e) {
    console.error('Push subscription failed:', e)
    return null
  }
}

// Remove this device's subscription from Supabase and the browser.
export async function unsubscribeFromPush(userId) {
  const sw = await registerSW()
  if (!sw) return

  const sub = await sw.pushManager.getSubscription()
  if (!sub) return

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', sub.endpoint)

  await sub.unsubscribe()
}

// ── In-app / background notifications ─────────────────────────

export function showBrowserNotification(title, options = {}) {
  if (!isPushSupported() || Notification.permission !== 'granted') return
  const opts = { icon: '/logo.png', badge: '/logo.png', ...options }
  if (_sw) {
    _sw.showNotification(title, opts).catch(() => new Notification(title, opts))
  } else {
    new Notification(title, opts)
  }
}

export function buildNotificationPayload(notification, actor) {
  const name = actor?.username ?? 'Qualcuno'
  const body =
    notification.type === 'follow'  ? `${name} ha iniziato a seguirti` :
    notification.type === 'like'    ? `${name} ha messo like alla tua recensione` :
                                      `${name} ha commentato la tua recensione`
  const url = notification.post_id
    ? `/post/${notification.post_id}`
    : `/profile/${name}`
  return { title: 'Reviewz', body, url }
}
