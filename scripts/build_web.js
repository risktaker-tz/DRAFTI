'use strict';
// Portable equivalent of build_web.py for installations with Node only.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
for (const [token, file] of [['STYLES','styles.css'], ['AUDIO','audio.manifest.js'], ['ENGINE','engine.js'], ['UI','ui.js']]) {
  const marker = '/*__' + token + '__*/';
  if (!html.includes(marker)) throw Error('Missing ' + marker);
  html = html.replace(marker, () => fs.readFileSync(path.join(root, 'src', file), 'utf8'));
}
fs.writeFileSync(path.join(root, 'web/index.html'), html);
console.log('Built web/index.html:', Buffer.byteLength(html), 'bytes');
