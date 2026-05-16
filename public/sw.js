// Reviewz Service Worker — handles push notifications when app is closed/background

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Reviewz', body: event.data.text() }
  }

  const options = {
    body:    payload.body  ?? '',
    icon:    payload.icon  ?? '/logo.png',
    badge:   payload.badge ?? '/logo.png',
    data:    { url: payload.url ?? '/' },
    vibrate: [100, 50, 100],
    actions: payload.actions ?? [],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Reviewz', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))
