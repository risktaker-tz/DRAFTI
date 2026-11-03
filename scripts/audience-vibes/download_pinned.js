#!/usr/bin/env node
'use strict';
// Research only: never imported by the game. Raw recordings stay outside Git.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function checkItem(item) {
  if (!/^av-fs-\d+$/.test(item.id) || !/^[a-f0-9]{64}$/.test(item.sha256_preview_bytes))
    throw Error('Invalid recording ID or SHA256');
  const url = new URL(item.audio_url);
  if (url.origin !== 'https://cdn.freesound.org' || url.username || url.password ||
      !new RegExp('^/previews/\\d+/' + item.id.slice(6) + '_\\d+-hq\\.mp3$').test(url.pathname) || url.search || url.hash)
    throw Error('Unexpected source URL');
  if (!Number.isSafeInteger(item.bytes) || item.bytes < 1 || item.bytes > 64 * 1024 * 1024)
    throw Error('Source size outside research bounds');
}

function verifyBytes(item, bytes) {
  if (bytes.length !== item.bytes) throw Error('Source byte size changed');
  if (digest(bytes) !== item.sha256_preview_bytes) throw Error('Source SHA256 changed');
}

async function download(item, directory, fetcher = fetch) {
  checkItem(item);
  const name = item.id + '-' + item.sha256_preview_bytes.slice(0, 12) + '.mp3';
  const filename = path.join(directory, name);
  if (fs.existsSync(filename)) {
    verifyBytes(item, fs.readFileSync(filename));
    return { file: name, cached: true };
  }
  const response = await fetcher(item.audio_url, { redirect: 'manual', signal: AbortSignal.timeout(90000) });
  if (response.status !== 200) throw Error('Source HTTP ' + response.status);
  const contentType = response.headers.get('content-type') || '';
  if (!/^(audio\/|application\/octet-stream)/i.test(contentType)) throw Error('Source is not audio');
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > item.bytes) throw Error('Source exceeds pinned size');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  verifyBytes(item, bytes);
  const temporary = filename + '.' + process.pid + '.part';
  fs.writeFileSync(temporary, bytes, { flag: 'wx' });
  fs.renameSync(temporary, filename);
  return { file: name, cached: false, contentType };
}

async function main() {
  const manifestFile = path.join(root, 'docs/audience-vibes/download-manifest.json');
  const manifestBytes = fs.readFileSync(manifestFile);
  const items = JSON.parse(manifestBytes).items.sort((a, b) => a.bytes - b.bytes);
  items.forEach(checkItem);
  const arg = process.argv.find(x => x.startsWith('--limit='));
  const limit = arg ? Number(arg.slice(8)) : items.length;
  if (!Number.isInteger(limit) || limit < 1 || limit > items.length) throw Error('Invalid limit');
  const selected = items.slice(0, limit);
  const directory = path.join(root, 'scripts/research_media/audience_raw');
  fs.mkdirSync(directory, { recursive: true });
  const needed = selected.filter(i => !fs.existsSync(path.join(directory, i.id + '-' + i.sha256_preview_bytes.slice(0, 12) + '.mp3')))
    .reduce((sum, i) => sum + i.bytes, 0);
  const disk = fs.statfsSync(directory);
  if (disk.bavail * disk.bsize < needed + 256 * 1024 * 1024) throw Error('Insufficient disk space for pinned research audio');
  const lock = path.join(directory, 'download.lock');
  if (fs.existsSync(lock)) {
    const pid = Number(fs.readFileSync(lock, 'utf8'));
    if (!Number.isSafeInteger(pid) || pid < 1) throw Error('Unrecognized download lock; inspect before resuming');
    let alive = true;
    try { process.kill(pid, 0); } catch (e) { if (e.code === 'ESRCH') alive = false; else throw e; }
    if (alive) throw Error('Download process ' + pid + ' is already running');
    fs.unlinkSync(lock); // Only the known, terminal process lock is removed.
  }
  fs.writeFileSync(lock, String(process.pid), { flag: 'wx' });
  const report = { schema: 1, pid: process.pid, manifestSha256: digest(manifestBytes), startedAt: new Date().toISOString(),
    scope: 'Pinned raw downloads only; content listening, decoding, license review and natural cuts remain separate.',
    selected: selected.length, totalSourceBytes: selected.reduce((s, i) => s + i.bytes, 0), entries: {}, failures: {} };
  const save = () => fs.writeFileSync(path.join(directory, 'download-progress.json'), JSON.stringify(report, null, 2) + '\n');
  let next = 0;
  try {
    save();
    console.log('PID ' + process.pid + ': downloading/verifying ' + selected.length + ' pinned recordings; ' + needed + ' bytes missing');
    async function worker() {
      while (next < selected.length) {
        const item = selected[next++];
        try {
          const result = await download(item, directory);
          report.entries[item.id] = { ...result, bytes: item.bytes, sha256: item.sha256_preview_bytes, verifiedAt: new Date().toISOString() };
        } catch (error) { report.failures[item.id] = error.message; }
        save();
        const count = Object.keys(report.entries).length + Object.keys(report.failures).length;
        if (count % 10 === 0 || count === selected.length) console.log(count + '/' + selected.length + ', pinned ' + Object.keys(report.entries).length + ', failed ' + Object.keys(report.failures).length);
      }
    }
    await Promise.all(Array.from({ length: 4 }, worker));
    report.completedAt = new Date().toISOString();
    save();
    if (Object.keys(report.failures).length) process.exitCode = 1;
  } finally { fs.unlinkSync(lock); }
}

module.exports = { checkItem, verifyBytes, download };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
