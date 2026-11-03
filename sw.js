// sw.js — بيخلّي التطبيق يفتح بدون نت، وبيستقبل الإشعارات.
// رقم الإصدار بيجي من config.js وقت التسجيل (sw.js?v=2.0.0)، فما في داعي تعدّل هالملف.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'alameer-' + VERSION;
const SHELL = [
  './', './index.html', './app.css', './app.js', './util.js', './store.js', './xlsx.js', './config.js',
  './manifest.webmanifest', './guide.txt',
  './icons/logo.png', './icons/icon-192.png', './icons/badge-96.png', './icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('alameer-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // ملفات التطبيق: من النت أولاً (عشان التحديثات توصل)، وإذا ما في نت من الكاش
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await withTimeout(fetch(req), 4500);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') { const idx = await cache.match('./index.html'); if (idx) return idx; }
        throw err;
      }
    })());
    return;
  }
  // الخطوط ومكتبة Firebase: نسخ ثابتة، من الكاش أولاً
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    e.respondWith((async () => {
      const cache = await caches.open('alameer-static');
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })());
  }
});

// الإشعارات اليومية من السيرفر
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'الأمير جيم';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-96.png',
    dir: 'rtl', lang: 'ar',
    tag: d.tag || 'alameer',
    renotify: true,
    data: { url: d.url || './#/reminders' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './#/reminders', self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.registration.scope)) {
        c.postMessage({ type: 'navigate', url: target });
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
