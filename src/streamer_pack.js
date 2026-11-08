'use strict';
// Streamer voices are optional offline data. The board, rules, core sounds and
// presentation remain inside the self-contained game; this store installs the
// larger voice pack only after the player asks for it.
function createStreamerPackStore(env) {
  const base = new URL('./streamer-vocabulary/', env.location.href);
  const manifestURL = new URL('manifest.json', base).href;
  const markerURL = new URL('installed.json', base).href;
  const indexName = 'drafti-streamer-index-v1';
  const prefix = 'drafti-streamer-pack-v1-';
  const legacyName = 'drafti-streamer-vocabulary-v1';
  let installed = null, installing = false;
  const digest = async bytes => Array.from(new Uint8Array(await env.crypto.subtle.digest('SHA-256', bytes)),
    value => value.toString(16).padStart(2, '0')).join('');
  const say = text => env.status?.(text);

  function validate(clips) {
    if (!Array.isArray(clips) || clips.length < 1 || clips.length > 1000) throw Error('Invalid voice pack');
    const ids = new Set(); let total = 0;
    for (const clip of clips) {
      if (!/^s[fjm]2_\d{3}$/.test(clip.id) || clip.file !== clip.id + '.mp3' || ids.has(clip.id) ||
          !Number.isSafeInteger(clip.bytes) || clip.bytes < 1 || clip.bytes > 60 * 1024 ||
          !/^[a-f0-9]{64}$/.test(clip.sha256) || !(clip.durationSec > 0 && clip.durationSec <= 6) ||
          !['female', 'male', 'funny'].includes(clip.mode)) throw Error('Invalid voice recording metadata');
      ids.add(clip.id); total += clip.bytes;
    }
    if (total > 32 * 1024 * 1024) throw Error('Voice pack is too large');
    return { clips, totalBytes: total };
  }

  async function readMarker() {
      const index = await env.caches.open(indexName), response = await index.match(markerURL);
    if (!response) return null;
    const marker = await response.json();
    if (typeof marker.cache !== 'string' ||
        !(marker.cache.startsWith(prefix) || marker.cache === legacyName) ||
        !(await env.caches.keys()).includes(marker.cache)) return null;
    const cache = await env.caches.open(marker.cache), manifestResponse = await cache.match(manifestURL);
    if (!manifestResponse) return null;
    const manifest = validate(await manifestResponse.json());
    if ((await cache.keys()).length < manifest.clips.length + 1) return null;
    return { cache: marker.cache, manifest: manifest.clips, totalBytes: manifest.totalBytes };
  }

  async function init() {
    try {
      installed = await readMarker();
      // Upgrades from releases that bundled this data in the service worker
      // retain the existing complete pack without downloading it again.
      if (!installed && (await env.caches.keys()).includes(legacyName)) {
        const legacy = await env.caches.open(legacyName), response = await legacy.match(manifestURL);
        if (response) {
          const manifest = validate(await response.json());
          if ((await legacy.keys()).length >= manifest.clips.length + 1) {
            installed = { cache: legacyName, manifest: manifest.clips, totalBytes: manifest.totalBytes };
            await (await env.caches.open(indexName)).put(markerURL, new Response(JSON.stringify({ cache: legacyName })));
          }
        }
      }
      report();
    } catch { installed = null; report(); }
    return installed;
  }

  function report() {
    if (installing) return;
    say(installed
      ? 'Streamer voices ready offline · ' + installed.manifest.length + ' recordings · ' +
        (installed.totalBytes / 1048576).toFixed(1) + ' MB. Download / update checks for the latest pack.'
      : 'Optional streamer voice pack · not downloaded. Core game voices and sound effects work offline.');
  }

  async function install() {
    if (installing) return false;
    if (!env.caches || !env.crypto?.subtle || !/^https?:$/.test(env.location.protocol)) {
      say('Open the game online to download offline streamer voices.'); return false;
    }
    installing = true; let stageName = '';
    try {
      const response = await env.fetch(manifestURL, { cache: 'no-store' });
      if (!response.ok) throw Error('Voice list unavailable');
      const raw = await response.arrayBuffer(), parsed = validate(JSON.parse(new TextDecoder().decode(raw)));
      const version = await digest(raw); stageName = prefix + version;
      const stage = await env.caches.open(stageName);
      const old = installed ? await env.caches.open(installed.cache) : null;
      await stage.put(manifestURL, new Response(raw, { headers: { 'Content-Type': 'application/json' } }));
      let cursor = 0, failure = null, done = 0;
      const worker = async () => {
        while (cursor < parsed.clips.length && !failure) {
          const clip = parsed.clips[cursor++], url = new URL(clip.file, base).href;
          try {
            let bytes = null, cached = old && await old.match(url);
            if (cached) {
              const candidate = await cached.arrayBuffer();
              if (candidate.byteLength === clip.bytes && await digest(candidate) === clip.sha256) bytes = candidate;
            }
            if (!bytes) {
              const fetched = await env.fetch(url, { cache: 'reload' });
              if (!fetched.ok) throw Error('Recording unavailable: ' + clip.id);
              bytes = await fetched.arrayBuffer();
              if (bytes.byteLength !== clip.bytes || await digest(bytes) !== clip.sha256)
                throw Error('Recording check failed: ' + clip.id);
            }
            await stage.put(url, new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg' } }));
            say('Downloading streamer voices · ' + (++done) + ' / ' + parsed.clips.length);
          } catch (error) { failure ||= error; throw error; }
        }
      };
      const results = await Promise.allSettled(Array.from({ length: Math.min(4, parsed.clips.length) }, worker));
      const failed = results.find(result => result.status === 'rejected');
      if (failure || failed) throw failure || failed.reason;

      const next = { cache: stageName, manifest: parsed.clips, totalBytes: parsed.totalBytes };
      await (await env.caches.open(indexName)).put(markerURL,
        new Response(JSON.stringify({ cache: stageName }), { headers: { 'Content-Type': 'application/json' } }));
      const previous = installed; installed = next;
      if (previous && previous.cache !== stageName) await env.caches.delete(previous.cache).catch(() => {});
      installing = false; report(); return true;
    } catch (error) {
      env.onError?.(error);
      if (stageName && stageName !== installed?.cache) await env.caches.delete(stageName).catch(() => {});
      say(installed
        ? 'Update paused; your previous streamer pack is safe and ready offline.'
        : 'Download paused. Retry when connected; core game sounds remain available offline.');
      return false;
    } finally { installing = false; }
  }

  async function remove() {
    if (installing) return false;
    const previous = installed; installed = null;
    await (await env.caches.open(indexName)).delete(markerURL);
    if (previous) await env.caches.delete(previous.cache).catch(() => {});
    report(); return true;
  }

  async function read(clip) {
    if (!installed) return null;
    const response = await (await env.caches.open(installed.cache)).match(new URL(clip.file, base).href);
    if (!response) return null;
    const bytes = await response.arrayBuffer();
    return bytes.byteLength === clip.bytes && await digest(bytes) === clip.sha256 ? bytes : null;
  }

  return { init, install, remove, read, installed: () => installed, installing: () => installing, report };
}
