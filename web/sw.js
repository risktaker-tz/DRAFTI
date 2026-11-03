const CACHE = 'drafti-install-v3';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('drafti-install-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    const navigation = event.request.mode === 'navigate' && event.request.url.startsWith(self.registration.scope);
    const vocabularyRoot = new URL('./streamer-vocabulary/', self.registration.scope).href;
    const vocabulary = event.request.url.startsWith(vocabularyRoot) &&
      /^(manifest\.json|s[fjm]2_\d{3}\.mp3)$/.test(event.request.url.slice(vocabularyRoot.length));
    if (response.ok && (navigation || vocabulary || ASSETS.some(path => new URL(path, self.registration.scope).href === event.request.url))) {
      const copy = response.clone();
      const key = navigation ? new URL('./index.html', self.registration.scope).href : event.request;
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
