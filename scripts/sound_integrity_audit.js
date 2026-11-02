'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/audio.manifest.js'), 'utf8'), sandbox);
const bank = sandbox.window.DRAFTI_SFX;
const ui = fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8');
const direct = [...ui.matchAll(/SFX_BANK\.play\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
const missing = [...new Set(direct)].filter(id => !bank[id] && !['move','capture','select','king','illegal','undo','levelup','relief','trap_snap'].includes(id));
const categories = {};
const oversized = [];
const encoding = [];
const durations = [];
const { parseBuffer } = require('./tooling/node_modules/music-metadata/lib/index.js');
(async () => {
for (const [id, clip] of Object.entries(bank)) {
  categories[clip.c] = (categories[clip.c] || 0) + 1;
  if (!clip.d.startsWith('data:audio/')) throw Error('Non-embedded audio: ' + id);
  const buffer = Buffer.from(clip.d.split(',')[1], 'base64');
  const bytes = buffer.length;
  const {format} = await parseBuffer(buffer, {mimeType:'audio/mpeg'}, {duration:true});
  if (!Number.isFinite(format.duration) || format.duration > 6.1) durations.push({id,seconds:format.duration});
  if (format.sampleRate !== 22050 || format.numberOfChannels !== 1 || format.bitrate > 56500) encoding.push({id,sampleRate:format.sampleRate,channels:format.numberOfChannels,bitrate:format.bitrate});
  if (bytes > 61440) oversized.push({id, bytes});
}
console.log(JSON.stringify({clips: Object.keys(bank).length, categories, directReferences: direct.length, missing, oversized, durations, encoding, limitations: 'All clips measured for duration, encoding and size. Static references currently cover direct literal calls; dynamic pools and browser playback still require verification.'}, null, 2));
if (missing.length || oversized.length || durations.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
