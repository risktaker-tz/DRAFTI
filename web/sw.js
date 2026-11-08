const BUILD = '5476bbb026012874e32a1fa783e685ccfd9937e1f2d73322850242b22e5477fa';
const CACHE = 'drafti-install-' + BUILD;
const VOCAB_CACHE = 'drafti-streamer-vocabulary-v1';
const VOCAB_STAGE = VOCAB_CACHE + '-stage-' + BUILD;
const vocabularyRoot = new URL('./streamer-vocabulary/', self.registration.scope).href;
const isVocabulary = url => url.startsWith(vocabularyRoot) &&
  /^(manifest\.json|s[fjm]2_\d{3}\.mp3)$/.test(url.slice(vocabularyRoot.length));
const ASSETS = ['./index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
const streamerDigest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  value => value.toString(16).padStart(2, '0')).join('');

async function stageStreamerVocabulary() {
  const stage = await caches.open(VOCAB_STAGE);
  try {
    const manifestURL = new URL('manifest.json', vocabularyRoot).href;
    const manifestResponse = await fetch(manifestURL, { cache: 'reload' });
    if (!manifestResponse.ok) throw Error('Streamer manifest unavailable');
    const manifestBytes = await manifestResponse.clone().arrayBuffer();
    const clips = JSON.parse(new TextDecoder().decode(manifestBytes));
    if (!Array.isArray(clips) || clips.length < 300 || clips.length > 999) throw Error('Invalid streamer manifest');
    const ids = new Set();
    for (const clip of clips) {
      if (!/^s[fjm]2_\d{3}$/.test(clip.id) || clip.file !== clip.id + '.mp3' || ids.has(clip.id) ||
          !Number.isSafeInteger(clip.bytes) || clip.bytes < 1 || clip.bytes > 60 * 1024 ||
          !/^[a-f0-9]{64}$/.test(clip.sha256) || !(clip.durationSec > 0 && clip.durationSec <= 6))
        throw Error('Invalid streamer recording metadata');
      ids.add(clip.id);
    }
    await stage.put(manifestURL, new Response(manifestBytes, { headers: { 'Content-Type': 'application/json' } }));

    const installed = await caches.open(VOCAB_CACHE);
    let cursor = 0, failure = null;
    const worker = async () => {
      while (cursor < clips.length && !failure) {
        const clip = clips[cursor++], url = new URL(clip.file, vocabularyRoot).href;
        try {
          let response = await installed.match(url);
          let bytes = response ? await response.clone().arrayBuffer() : null;
          if (!bytes || bytes.byteLength !== clip.bytes || await streamerDigest(bytes) !== clip.sha256) {
            response = await fetch(url, { cache: 'reload' });
            if (!response.ok) throw Error('Streamer recording unavailable: ' + clip.id);
            bytes = await response.clone().arrayBuffer();
            if (bytes.byteLength !== clip.bytes || await streamerDigest(bytes) !== clip.sha256)
              throw Error('Streamer recording integrity check failed: ' + clip.id);
          }
          await stage.put(url, response);
        } catch (error) {
          failure ||= error;
          throw error;
        }
      }
    };
    const results = await Promise.allSettled(Array.from({ length: Math.min(6, clips.length) }, worker));
    const failed = results.find(result => result.status === 'rejected');
    if (failure || failed) throw failure || failed.reason;
  } catch (error) {
    await caches.delete(VOCAB_STAGE);
    throw error;
  }
}

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(asset =>
    new Request(new URL(asset, self.registration.scope), { cache: 'reload' })
  ))).then(stageStreamerVocabulary).then(() => self.skipWaiting())
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
  const staged = await caches.open(VOCAB_STAGE);
  for (const request of await staged.keys()) {
    const response = await staged.match(request);
    if (response) await vocabulary.put(request, response);
  }
  await caches.delete(VOCAB_STAGE);
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
    event.respondWith(caches.open(VOCAB_CACHE).then(cache => cache.match(event.request)).then(cached =>
      cached || Response.error()));
    return;
  }
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
