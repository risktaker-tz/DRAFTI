'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../web/sw.js'), 'utf8');

async function check(scope) {
  const routes = new Map();
  const files = new Map();
  let online = true;
  const absolute = request => new URL(request.url || request, scope).href;
  const cache = {
    async addAll(paths) { for (const p of paths) files.set(absolute(p), new Response(p)); },
    async put(request, response) { files.set(absolute(request), response); },
  };
  vm.runInNewContext(source, {
    URL, Response,
    self: {location: new URL(scope), registration: {scope}, addEventListener: (name, fn) => routes.set(name, fn)},
    caches: {open: async () => cache, match: async request => files.get(absolute(request))?.clone()},
    fetch: async request => {
      if (!online) throw Error('Offline');
      return new Response(request.url);
    },
  });
  let installing;
  routes.get('install')({waitUntil: task => { installing = task; }});
  await installing;
  const handle = async (p, mode = 'cors') => {
    let response;
    const tasks = [];
    routes.get('fetch')({request: {url: absolute(p), method: 'GET', mode},
      respondWith: task => { response = task; }, waitUntil: task => tasks.push(task)});
    const result = await response;
    await Promise.all(tasks);
    return result;
  };
  const clip = 'streamer-vocabulary/sj2_049.mp3';
  await handle(clip);
  await handle('streamer-vocabulary/unexpected.mp3');
  online = false;
  assert.equal(await (await handle('?offline', 'navigate')).text(), './index.html');
  assert.equal(await (await handle(clip)).text(), absolute(clip));
  assert.equal((await handle('streamer-vocabulary/unexpected.mp3')).type, 'error');
  assert.equal(await (await handle('icon-512.png')).text(), './icon-512.png');
}
(async () => {
  await check('https://drafti-afrika.vercel.app/');
  await check('https://risktaker-tz.github.io/DRAFTI/web/');
  console.log('Offline navigation, install icons and vocabulary caching passed for both hosting scopes');
})().catch(error => { console.error(error); process.exitCode = 1; });
