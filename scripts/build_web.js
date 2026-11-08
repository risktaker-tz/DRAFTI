'use strict';
// Portable equivalent of build_web.py for installations with Node only.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
let html = read(path.join(root, 'src/index.template.html'));
for (const [token, file] of [['STYLES','styles.css'], ['AUDIO','audio.manifest.js'], ['ENGINE','engine.js'], ['AUDIENCE','audience.js'], ['STREAMER_PACK','streamer_pack.js'], ['UI','ui.js'], ['UPDATES','app_updates.js'], ['CINEMA_STYLES','cinematic_preview.css'], ['CEREMONY_FLAG_DATA','ceremony_flags.data.js'], ['CEREMONY_FLAGS','ceremony_flags.js'], ['CINEMA_DIRECTOR','cinematic_director.js'], ['CINEMA','cinematic_preview.js']]) {
  const marker = '/*__' + token + '__*/';
  if (!html.includes(marker)) throw Error('Missing ' + marker);
  html = html.replace(marker, () => read(path.join(root, 'src', file)));
}
const sw = read(path.join(root, 'src/sw.template.js'));
const streamerCount=syncStreamerVocabulary();
const hash = crypto.createHash('sha256').update(html).update('\0sw\0' + sw);
for (const file of ['manifest.webmanifest','icon.svg','icon-192.png','icon-512.png']) {
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
if(streamerCount)console.log('Synced streamer vocabulary:',streamerCount,'verified clips');

function syncStreamerVocabulary(){
  const sourceRoot=path.join(root,'streamer-pack'),manifestFile=path.join(sourceRoot,'manifest.json');
  if(!fs.existsSync(manifestFile))return 0;
  const manifest=JSON.parse(read(manifestFile)),clips=manifest.clips;
  if(!Array.isArray(clips)||manifest.total!==clips.length)throw Error('Invalid streamer-pack manifest totals');
  const counts={female:0,male:0,funny:0},ids=new Set(),published=[];
  let totalBytes=0;
  for(const clip of clips){
    if(!/^s[fjm]2_\d{3}$/.test(clip.id)||ids.has(clip.id))throw Error('Invalid or duplicate streamer clip ID: '+clip.id);
    if(!Object.hasOwn(counts,clip.mode))throw Error('Invalid streamer mode for '+clip.id);
    ids.add(clip.id);counts[clip.mode]++;
    if(!(clip.durationSec>0&&clip.durationSec<=6)||!(clip.bytes>0&&clip.bytes<=60*1024))
      throw Error('Streamer clip exceeds duration or size limits: '+clip.id);
    const sourceFile=path.resolve(sourceRoot,clip.file);
    if(!sourceFile.startsWith(sourceRoot+path.sep))throw Error('Streamer clip path escapes its pack: '+clip.id);
    const bytes=fs.readFileSync(sourceFile),sha=crypto.createHash('sha256').update(bytes).digest('hex');
    if(bytes.length!==clip.bytes||sha!==clip.sha256)throw Error('Streamer source does not match manifest: '+clip.id);
    writeAtomic('web/streamer-vocabulary/'+clip.id+'.mp3',bytes);
    published.push({...clip,file:clip.id+'.mp3'});totalBytes+=bytes.length;
  }
  for(const mode of Object.keys(counts))if(manifest.counts?.[mode]!==counts[mode])
    throw Error('Streamer per-mode count mismatch: '+mode);
  if(manifest.totalBytes!==totalBytes)throw Error('Streamer total byte count mismatch');
  writeAtomic('web/streamer-vocabulary/manifest.json',JSON.stringify(published,null,2)+'\n');
  return clips.length;
}
