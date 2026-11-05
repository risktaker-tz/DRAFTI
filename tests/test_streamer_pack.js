'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'streamer-pack/manifest.json'), 'utf8'));
const runtime = JSON.parse(fs.readFileSync(path.join(root, 'web/streamer-vocabulary/manifest.json'), 'utf8'));
const runtimeById = new Map(runtime.map(clip => [clip.id, clip]));
const counts = { female: 0, male: 0, funny: 0 };
const ids = new Set();
let bytesTotal = 0;

assert.equal(source.schema, 'drafti-streamer-pack/1');
assert.equal(source.total, source.clips.length);
assert.equal(runtime.length, source.clips.length, 'public runtime manifest includes every source clip');

for (const clip of source.clips) {
  assert(!ids.has(clip.id), `unique clip id ${clip.id}`);
  ids.add(clip.id);
  assert.match(clip.id, /^s[fjm]2_\d{3}$/);
  assert(['female', 'male', 'funny'].includes(clip.mode), `${clip.id} has a supported voice mode`);
  assert(clip.text && clip.role && clip.predicate, `${clip.id} has transcript and event gate`);
  assert(clip.source && clip.license && clip.processing, `${clip.id} has source and processing attribution`);
  assert(clip.durationSec > 0 && clip.durationSec <= 6, `${clip.id} duration is within the pack limit`);
  assert(clip.bytes > 0 && clip.bytes <= 60 * 1024, `${clip.id} size is within the pack limit`);

  const original = fs.readFileSync(path.join(root, 'streamer-pack', clip.file));
  const publicFile = fs.readFileSync(path.join(root, 'web/streamer-vocabulary', `${clip.id}.mp3`));
  assert.equal(original.length, clip.bytes, `${clip.id} source byte count`);
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'), clip.sha256, `${clip.id} source SHA-256`);
  assert(publicFile.equals(original), `${clip.id} public MP3 exactly matches its source`);
  assert.deepStrictEqual(runtimeById.get(clip.id), { ...clip, file: `${clip.id}.mp3` },
    `${clip.id} public metadata matches its source`);

  counts[clip.mode]++;
  bytesTotal += original.length;
}

assert.equal(source.totalBytes, bytesTotal, 'manifest aggregate byte count');
assert.deepStrictEqual(counts, source.counts, 'manifest voice counts');
assert.equal(runtimeById.size, source.clips.length, 'no duplicate or unexpected public clip IDs');
console.log(`PASS ${source.total} streamer clips: source/public bytes, hashes, attribution and event metadata (${JSON.stringify(counts)}, ${bytesTotal} bytes)`);
