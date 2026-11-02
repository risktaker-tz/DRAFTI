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
for (const [id, clip] of Object.entries(bank)) {
  categories[clip.c] = (categories[clip.c] || 0) + 1;
  if (!clip.d.startsWith('data:audio/')) throw Error('Non-embedded audio: ' + id);
  const bytes = Buffer.from(clip.d.split(',')[1], 'base64').length;
  if (bytes > 61440) oversized.push({id, bytes});
}
console.log(JSON.stringify({clips: Object.keys(bank).length, categories, directReferences: direct.length, missing, oversized, limitations: 'Static direct-reference and encoded-size audit only; pooled references, duration and playback require further verification.'}, null, 2));
if (missing.length || oversized.length) process.exitCode = 1;
