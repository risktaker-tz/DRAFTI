'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.join(__dirname,'..'),c={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'src/audio.manifest.js'),'utf8'),c);
const report=JSON.parse(fs.readFileSync(path.join(root,'docs/physical-audio-generation.json'),'utf8'));
const hashes=new Set(),families=new Map();
for(const [id,record] of Object.entries(report)){
  const def=c.window.DRAFTI_SFX[id];assert(def&&def.event&&def.family,id+' has an event and family');
  const bytes=Buffer.from(def.d.split(',')[1],'base64');
  assert(bytes.equals(fs.readFileSync(path.join(root,'src/audio',id+'.mp3'))),id+' embedded bytes');
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash,record.sha256);assert(!hashes.has(hash),'Duplicate synthesized recording');hashes.add(hash);
  assert(record.peakDbFS<=-1.5&&record.peakDbFS>=-2.5,id+' decoded peak stays below the ceiling and within 1 dB of its target');
  assert(record.seconds<=3.5&&record.bytes<=61440,id+' duration/size');
  families.set(def.event,(families.get(def.event)||0)+1);
}
assert(hashes.size>=100);assert([...families.values()].every(count=>count===4));
console.log(hashes.size+' distinct authored effects across '+families.size+' event families: exact embedding, decoded-peak reports, duration, size and four performances each passed');
