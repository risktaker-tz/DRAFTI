'use strict';
// Preserve the existing sound library. The blueprint explicitly permits only
// four original-clip replacements and processing fixes for audit violations.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {execFileSync}=require('child_process');
const {createHash}=require('crypto');
const root=path.resolve(__dirname,'..');
function bank(text){const c={window:{}};vm.runInNewContext(text,c);return c.window.DRAFTI_SFX;}
const baseline=bank(execFileSync('git',['show','b9486e1:src/audio.manifest.js'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024}));
const current=bank(fs.readFileSync(path.join(root,'src/audio.manifest.js'),'utf8'));
const replacements=new Set(['shrimp1','shrimp2','v_retire1','v_retire2']);
const fixes=JSON.parse(fs.readFileSync(path.join(root,'scripts/audio_processing_fixes.json'),'utf8'));
const hash=clip=>createHash('sha256').update(Buffer.from(clip.d.split(',')[1],'base64')).digest('hex');
let preserved=0;const changed=[];
for(const [id,clip] of Object.entries(baseline)){
 assert(current[id],'Existing clip removed: '+id);
 if(current[id].d!==clip.d){
  if(!replacements.has(id)) {
   // Processing-only corrections must be explicitly recorded by name with
   // the measured original violation and a reversible original-file backup.
   const fix=fixes.findLast(f=>f.id===id);
   assert(fix && fix.reason && fix.backup,'Unrequested audio change: '+id);
   if(fix.backup==='b9486e1:src/audio.manifest.js'){
    assert.equal(hash(clip),fix.sourceSha256,'Original backup hash: '+id);
    assert.equal(hash(current[id]),fix.processedSha256,'Processed recording hash: '+id);
   }else assert(fs.existsSync(path.resolve(root,fix.backup)),'Missing original backup: '+id);
  }
  changed.push(id);
 } else preserved++;
}
console.log(preserved+' existing clips preserved byte-for-byte; '+changed.length+' authorized changes');
console.log('Changed IDs:',changed.length?changed.join(', '):'none');
