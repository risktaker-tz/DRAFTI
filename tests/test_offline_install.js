'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'web/sw.js'), 'utf8');
const vocabularyRoot = path.join(root, 'web/streamer-vocabulary');
const manifestBytes = fs.readFileSync(path.join(vocabularyRoot, 'manifest.json'));
const clips = JSON.parse(manifestBytes.toString('utf8'));

async function check(scope) {
  const routes = new Map(), cachesByName = new Map();
  let online = true, streamerNetworkRequests = 0;
  const absolute = request => new URL(request.url || request, scope).href;
  const cacheFor = name => {
    if (!cachesByName.has(name)) {
      const files = new Map();
      cachesByName.set(name, {
        async addAll(paths) {
          for (const p of paths) {
            const url = absolute(p), filename = new URL(url).pathname.split('/').pop();
            files.set(url, new Response(filename === 'index.html' ? 'cached-game-build' : filename));
          }
        },
        async put(request, response) { files.set(absolute(request), response.clone()); },
        async match(request) { return files.get(absolute(request))?.clone(); },
        async keys() { return [...files.keys()].map(url => new Request(url)); },
      });
    }
    return cachesByName.get(name);
  };
  const context = {
    URL, Request, Response, TextDecoder, crypto,
    self: { location: new URL(scope), registration: { scope }, skipWaiting: async () => {},
      clients: { claim: async () => {} }, addEventListener: (name, fn) => routes.set(name, fn) },
    caches: {
      open: async name => cacheFor(name),
      keys: async () => [...cachesByName.keys()],
      delete: async name => cachesByName.delete(name),
      match: async request => {
        for (const cache of cachesByName.values()) { const result = await cache.match(request); if (result) return result; }
      },
    },
    fetch: async request => {
      if (!online) throw Error('Offline');
      const url = absolute(request);
      if (url.startsWith(new URL('./streamer-vocabulary/', scope).href)) {
        streamerNetworkRequests++;
        if (url.endsWith('/manifest.json')) return new Response(manifestBytes);
        const name = new URL(url).pathname.split('/').pop();
        const clip = clips.find(item => item.file === name);
        if (clip) return new Response(fs.readFileSync(path.join(vocabularyRoot, name)), { headers: { 'Content-Type': 'audio/mpeg' } });
        return new Response('Not found', { status: 404 });
      }
      return new Response(url);
    },
  };
  vm.runInNewContext(source, context);
  const tasks = [];
  routes.get('install')({ waitUntil: task => tasks.push(task) });
  await Promise.all(tasks.splice(0));
  routes.get('activate')({ waitUntil: task => tasks.push(task) });
  await Promise.all(tasks.splice(0));

  const vocab = cacheFor('drafti-streamer-vocabulary-v1');
  const vocabularyFiles = await vocab.keys();
  assert.equal(vocabularyFiles.length, clips.length + 1, 'install stores the manifest and every streamer recording');
  const downloaded = streamerNetworkRequests;
  online = false;
  const handle = async (p, mode = 'cors') => {
    let response;
    routes.get('fetch')({ request: { url: absolute(p), method: 'GET', mode },
      respondWith: task => { response = task; } });
    return response;
  };
  assert.equal(await (await handle('?offline', 'navigate')).text(), 'cached-game-build', 'installed game reopens offline');
  for (const clip of clips) {
    const response = await handle('streamer-vocabulary/' + clip.file);
    assert(response.ok, `${clip.id} is available offline`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, clip.bytes, `${clip.id} cached bytes match the manifest`);
  }
  assert.equal(streamerNetworkRequests, downloaded, 'offline voice playback performs no network requests');
  assert.equal((await handle('streamer-vocabulary/unexpected.mp3')).type, 'error');
}

(async () => {
  await check('https://drafti-afrika.vercel.app/');
  await check('https://risktaker-tz.github.io/DRAFTI/web/');
  console.log(`PASS offline install: core game and all ${clips.length} verified streamer clips reopen from cache on both host scopes`);
})().catch(error => { console.error(error); process.exitCode = 1; });
