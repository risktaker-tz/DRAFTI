'use strict';
// Portable equivalent of build_web.py for installations with Node only.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
let html = read(path.join(root, 'src/index.template.html'));
for (const [token, file] of [['STYLES','styles.css'], ['AUDIO','audio.manifest.js'], ['ENGINE','engine.js'], ['UI','ui.js']]) {
  const marker = '/*__' + token + '__*/';
  if (!html.includes(marker)) throw Error('Missing ' + marker);
  html = html.replace(marker, () => read(path.join(root, 'src', file)));
}
if (process.platform === 'win32') html = html.replace(/\n/g, '\r\n');
fs.writeFileSync(path.join(root, 'web/index.html'), html);
console.log('Built web/index.html:', Buffer.byteLength(html), 'bytes');
