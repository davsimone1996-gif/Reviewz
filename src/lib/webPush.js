// ─────────────────────────────────────────────────────────────────
// Web Push Notifications
// Uses the browser Notification API + Service Worker.
// Works on Android Chrome and iOS Safari ≥16.4 (when installed as PWA).
// ─────────────────────────────────────────────────────────────────

const SW_PATH = '/sw.js'

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'Notification' in window
}

export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

// Register service worker once
let _swRegistration = null

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null
  if (_swRegistration) return _swRegistration
  try {
    _swRegistration = await navigator.serviceWorker.register(SW_PATH)
    return _swRegistration
  } catch (e) {
    console.error('SW registration failed:', e)
    return null
  }
}

// Request notification permission from the user
export async function requestNotificationPermission() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied')  return 'denied'
  const result = await Notification.requestPermission()
  return result
}

// Show a native browser notification (works when tab is in background)
export function showBrowserNotification(title, options = {}) {
  if (!isPushSupported() || Notification.permission !== 'granted') return

  const opts = {
    icon:    '/logo.png',
    badge:   '/logo.png',
    silent:  false,
    ...options,
  }

  if (_swRegistration) {
    // Show via SW — persists even if tab is closed (briefly)
    _swRegistration.showNotification(title, opts).catch(() => {
      new Notification(title, opts)
    })
  } else {
    new Notification(title, opts)
  }
}

// Build notification content from a Supabase notification row + actor
export function buildNotificationPayload(notification, actor) {
  const actorName = actor?.username ?? 'Qualcuno'
  const body =
    notification.type === 'follow'  ? `${actorName} ha iniziato a seguirti` :
    notification.type === 'like'    ? `${actorName} ha messo like alla tua recensione` :
                                      `${actorName} ha commentato la tua recensione`

  const url = notification.post_id
    ? `/post/${notification.post_id}`
    : `/profile/${actorName}`

  return { title: 'Reviewz', body, url, icon: '/logo.png' }
}
