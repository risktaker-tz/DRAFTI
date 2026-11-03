'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { checkItem, download } = require('../scripts/audience-vibes/download_pinned');
const bytes = Buffer.from('ID3pinned research fixture');
const item = { id: 'av-fs-123', audio_url: 'https://cdn.freesound.org/previews/0/123_456-hq.mp3',
  bytes: bytes.length, sha256_preview_bytes: crypto.createHash('sha256').update(bytes).digest('hex') };
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'drafti-audience-download-'));
const response = (data = bytes, status = 200, type = 'audio/mpeg') => async () => new Response(data, { status, headers: { 'content-type': type } });
(async () => {
  for (const edit of [{ id: '../bad' }, { sha256_preview_bytes: 'bad' }, { bytes: -1 },
    { audio_url: 'https://cdn.freesound.org.evil.test/previews/0/123_456-hq.mp3' },
    { audio_url: 'https://cdn.freesound.org/previews/0/999_456-hq.mp3' },
    { audio_url: item.audio_url + '?token=unexpected' }]) assert.throws(() => checkItem({ ...item, ...edit }));
  await assert.rejects(download(item, directory, response(bytes, 302)), /HTTP 302/);
  await assert.rejects(download(item, directory, response(bytes, 200, 'text/html')), /not audio/);
  await assert.rejects(download(item, directory, response(Buffer.concat([bytes, bytes]))), /exceeds pinned/);
  await assert.rejects(download(item, directory, response(Buffer.alloc(bytes.length))), /SHA256 changed/);
  assert.equal(fs.readdirSync(directory).length, 0, 'Rejected bytes must never become reusable audio');
  const result = await download(item, directory, response());
  assert.equal(result.cached, false);
  assert.deepEqual(fs.readFileSync(path.join(directory, result.file)), bytes);
  const cached = await download(item, directory, () => { throw Error('Cache must not fetch'); });
  assert.equal(cached.cached, true);
  fs.writeFileSync(path.join(directory, result.file), Buffer.alloc(bytes.length));
  await assert.rejects(download(item, directory, response()), /SHA256 changed/, 'Corrupt cache must not be accepted');
  fs.unlinkSync(path.join(directory, result.file));
  fs.rmdirSync(directory);
  console.log('PASS audience raw downloads: source bounds, HTTP/type, exact size/hash, atomic acceptance and cache revalidation');
})().catch(error => { console.error(error); process.exitCode = 1; });
