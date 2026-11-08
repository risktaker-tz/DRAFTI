const BUILD = '__DRAFTI_BUILD__';
const CACHE = 'drafti-install-' + BUILD;
const VOCAB_CACHE = 'drafti-streamer-vocabulary-v1';
const VOCAB_INDEX = 'drafti-streamer-index-v1';
const vocabularyRoot = new URL('./streamer-vocabulary/', self.registration.scope).href;
const vocabularyMarker = new URL('installed.json', vocabularyRoot).href;
const isVocabulary = url => url.startsWith(vocabularyRoot) &&
  /^(manifest\.json|s[fjm]2_\d{3}\.mp3)$/.test(url.slice(vocabularyRoot.length));
const ASSETS = ['./index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(asset =>
    new Request(new URL(asset, self.registration.scope), { cache: 'reload' })
  ))).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  for (const name of names.filter(key => key.startsWith(VOCAB_CACHE + '-stage-'))) await caches.delete(name);
  const previous = names.filter(key => key.startsWith('drafti-install-') && key !== CACHE).reverse();
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
  if (vocabulary) {
    event.respondWith((async () => {
      const index = await caches.open(VOCAB_INDEX), marker = await index.match(vocabularyMarker);
      let installed = null;
      if (marker) try {
        const value = await marker.json();
        if (typeof value.cache === 'string' && value.cache.startsWith('drafti-streamer-pack-v1-') &&
            (await caches.keys()).includes(value.cache)) installed = await caches.open(value.cache);
      } catch { /* fall back to the preserved legacy pack or network */ }
      const cache = installed || await caches.open(VOCAB_CACHE);
      const cached = await cache.match(event.request);
      const forceNetwork = event.request.cache === 'reload' || event.request.cache === 'no-store';
      if (cached && !forceNetwork) return cached;
      try {
        const response = await fetch(event.request, { cache: 'no-cache' });
        return response.ok || !cached ? response : cached;
      } catch { return cached || Response.error(); }
    })());
    return;
  }
  event.respondWith((async () => {
    const canonical = navigation ? new URL('./index.html', self.registration.scope).href : event.request;
    const cached = await caches.match(canonical);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && (navigation || ASSETS.some(asset => new URL(asset, self.registration.scope).href === event.request.url))) {
        const key = navigation ? canonical : event.request;
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, response.clone())));
      }
      return response;
    } catch { return Response.error(); }
  })());
});
