'use strict';
// Portable equivalent of build_web.py for installations with Node only.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
let html = read(path.join(root, 'src/index.template.html'));
for (const [token, file] of [['STYLES','styles.css'], ['AUDIO','audio.manifest.js'], ['ENGINE','engine.js'], ['AUDIENCE','audience.js'], ['UI','ui.js'], ['UPDATES','app_updates.js'], ['CINEMA_STYLES','cinematic_preview.css'], ['CEREMONY_FLAG_DATA','ceremony_flags.data.js'], ['CEREMONY_FLAGS','ceremony_flags.js'], ['CINEMA_DIRECTOR','cinematic_director.js'], ['CINEMA','cinematic_preview.js']]) {
  const marker = '/*__' + token + '__*/';
  if (!html.includes(marker)) throw Error('Missing ' + marker);
  html = html.replace(marker, () => read(path.join(root, 'src', file)));
}
const sw = read(path.join(root, 'src/sw.template.js'));
const hash = crypto.createHash('sha256').update(html).update('\0sw\0' + sw);
for (const file of ['manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','streamer-vocabulary/manifest.json','audience-vibes/manifest.json']) {
  const filename=path.join(root,'web',file);
  if(fs.existsSync(filename)) hash.update('\0'+file+'\0').update(file.endsWith('.png')?fs.readFileSync(filename):read(filename));
}
const build=hash.digest('hex');
html=html.replaceAll('__DRAFTI_BUILD__',build);
function writeAtomic(filename,content){
const output=path.join(root,filename),temporary=output+'.'+process.pid+'.tmp';
fs.writeFileSync(temporary,content);
try {
  for(let attempt=0;;attempt++){
    try {fs.renameSync(temporary,output);break;}
    catch(error){if(attempt>=19)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}
  }
} finally {if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
writeAtomic('web/index.html',html);
writeAtomic('web/sw.js',sw.replaceAll('__DRAFTI_BUILD__',build));
console.log('Built web/index.html:', Buffer.byteLength(html), 'bytes');
