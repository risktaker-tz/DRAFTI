const BUILD = '45b12b7fca94f7bd2273dcebf79899df7ff300dd789e378575c65ba579ea7730';
const CACHE = 'drafti-install-' + BUILD;
const VOCAB_CACHE = 'drafti-streamer-vocabulary-v1';
const vocabularyRoot = new URL('./streamer-vocabulary/', self.registration.scope).href;
const isVocabulary = url => url.startsWith(vocabularyRoot) &&
  /^(manifest\.json|s[fjm]2_\d{3}\.mp3)$/.test(url.slice(vocabularyRoot.length));
const ASSETS = ['./index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(asset =>
    new Request(new URL(asset, self.registration.scope), { cache: 'reload' })
  ))).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const previous = (await caches.keys()).filter(key => key.startsWith('drafti-install-') && key !== CACHE).reverse();
  const vocabulary = await caches.open(VOCAB_CACHE);
  for (const name of previous) {
    const old = await caches.open(name);
    for (const request of await old.keys()) {
      if (!isVocabulary(request.url) || await vocabulary.match(request)) continue;
      const response = await old.match(request);
      if (response) await vocabulary.put(request, response);
    }
    await caches.delete(name);
  }
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data?.type === 'DRAFTI_BUILD_REQUEST' && event.ports?.[0])
    event.ports[0].postMessage({ type: 'DRAFTI_BUILD_RESPONSE', build: BUILD });
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const navigation = event.request.mode === 'navigate' && event.request.url.startsWith(self.registration.scope);
  const vocabulary = isVocabulary(event.request.url);
  event.respondWith(fetch(event.request, { cache: navigation || vocabulary ? 'no-cache' : 'default' }).then(response => {
    if (navigation && !response.ok) throw Error('Keep the cached game during a server outage');
    if (response.ok && (navigation || vocabulary || ASSETS.some(asset => new URL(asset, self.registration.scope).href === event.request.url))) {
      const copy = response.clone();
      const key = navigation ? new URL('./index.html', self.registration.scope).href : event.request;
      event.waitUntil(caches.open(vocabulary ? VOCAB_CACHE : CACHE).then(cache => cache.put(key, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached ||
    (navigation ? caches.match(new URL('./index.html', self.registration.scope).href) : Response.error()))));
});
