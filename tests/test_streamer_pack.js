'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const root=path.join(__dirname,'..'),packRoot=path.join(root,'streamer-pack'),webRoot=path.join(root,'web','streamer-vocabulary');
const source=JSON.parse(fs.readFileSync(path.join(packRoot,'manifest.json'),'utf8'));
const published=JSON.parse(fs.readFileSync(path.join(webRoot,'manifest.json'),'utf8'));
const ids=new Set(),counts={female:0,male:0,funny:0};
assert.equal(source.total,source.clips.length,'Source pack total matches its clip records');
assert.equal(published.length,source.clips.length,'Every accepted source clip is published');
for(const clip of source.clips){
  assert.match(clip.id,/^s[fjm]2_\d{3}$/,'Clip IDs use the streamer vocabulary contract');
  assert(!ids.has(clip.id),'Clip IDs are unique: '+clip.id);ids.add(clip.id);
  assert(Object.hasOwn(counts,clip.mode),'Known streamer mode: '+clip.id);counts[clip.mode]++;
  assert(clip.durationSec>0&&clip.durationSec<=6,'Clip duration is within the approved limit: '+clip.id);
  assert(clip.bytes>0&&clip.bytes<=60*1024,'Clip size is within the approved limit: '+clip.id);
  const sourceFile=path.resolve(packRoot,clip.file);
  assert(sourceFile.startsWith(packRoot+path.sep),'Source clip path stays inside streamer-pack: '+clip.id);
  const sourceBytes=fs.readFileSync(sourceFile);
  assert.equal(sourceBytes.length,clip.bytes,'Source byte count matches manifest: '+clip.id);
  assert.equal(crypto.createHash('sha256').update(sourceBytes).digest('hex'),clip.sha256,'Source hash matches manifest: '+clip.id);
  const webFile=path.join(webRoot,clip.id+'.mp3');
  const webBytes=fs.readFileSync(webFile);
  assert.equal(webBytes.length,clip.bytes,'Published byte count matches source: '+clip.id);
  assert.equal(crypto.createHash('sha256').update(webBytes).digest('hex'),clip.sha256,'Published clip matches source: '+clip.id);
  const deployed=published.find(item=>item.id===clip.id);
  assert(deployed,'Published manifest includes '+clip.id);
  assert.equal(deployed.file,clip.id+'.mp3','Published manifest path matches runtime fetch: '+clip.id);
  for(const field of ['mode','text','role','durationSec','bytes','sha256'])
    assert.equal(deployed[field],clip[field],`Published ${field} matches source: ${clip.id}`);
}
assert.deepEqual(counts,source.counts,'Per-voice totals match the source manifest');
const ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
assert(ui.includes("fetch('./streamer-vocabulary/' + clip.id + '.mp3')"),'Runtime fetch path matches published asset names');
console.log(`PASS streamer vocabulary source/deployment parity: ${source.total} clips (${counts.female} female, ${counts.male} male, ${counts.funny} funny), ${source.totalBytes} bytes`);
