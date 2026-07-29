self.addEventListener('push', (event) => {
  let data = { title: 'Golan Digital', body: 'Ada notifikasi baru.', url: '/employee/notifications' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) { /* Keep the fallback payload. */ }

  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/assets/icon_golan.png',
    badge: '/assets/icon_golan.png',
    data: { url: data.url }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/employee/notifications';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    for (const client of windowClients) {
      if ('focus' in client) {
        client.navigate(url);
        return client.focus();
      }
    }
    return clients.openWindow(url);
  }));
});
