'use strict';
// Portable equivalent of build_web.py for installations with Node only.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
let html = read(path.join(root, 'src/index.template.html'));
for (const [token, file] of [['STYLES','styles.css'], ['AUDIO','audio.manifest.js'], ['ENGINE','engine.js'], ['AUDIENCE','audience.js'], ['UI','ui.js']]) {
  const marker = '/*__' + token + '__*/';
  if (!html.includes(marker)) throw Error('Missing ' + marker);
  html = html.replace(marker, () => read(path.join(root, 'src', file)));
}
const output=path.join(root,'web/index.html'),temporary=output+'.'+process.pid+'.tmp';
fs.writeFileSync(temporary,html);
try {
  for(let attempt=0;;attempt++){
    try {fs.renameSync(temporary,output);break;}
    catch(error){if(attempt>=19)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}
  }
} finally {if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
console.log('Built web/index.html:', Buffer.byteLength(html), 'bytes');
