/* Private notification payloads deliberately contain no names or feelings. */
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch {}
  event.waitUntil(self.registration.showNotification('Unsaid', {
    body: 'هناك نشاط تواصل جديد في الحساب المرتبط.',
    tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    data: { url: new URL('family', self.registration.scope).href },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL('family', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
    const client = windows.find((w) => w.url.startsWith(self.registration.scope));
    if (client) { await client.navigate(url); return client.focus(); }
    return self.clients.openWindow(url);
  }));
});