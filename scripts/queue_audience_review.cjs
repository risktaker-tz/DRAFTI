'use strict';
// Inventory actual processed bytes before independent local speech review.
// Queue membership is never a content approval or permission to ship a clip.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),pack=path.join(root,'audience-pack');
const state=path.join(pack,'review_state/clips');
const transcripts=JSON.parse(fs.readFileSync(path.join(pack,'review_state/transcripts.json'),'utf8'));
const queue=[],missing=[];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const name of fs.readdirSync(state).filter(name=>/^\d+\.json$/.test(name)).sort()){
  const clip=JSON.parse(fs.readFileSync(path.join(state,name),'utf8'));
  assert.match(clip.id,/^avpb-\d+$/);
  assert.equal(clip.file,'audio/'+clip.id+'.mp3');
  assert.match(clip.sha256,/^[a-f0-9]{64}$/);
  const filename=path.join(pack,clip.file);
  if(!fs.existsSync(filename)){missing.push({id:clip.id,file:clip.file,reason:'Measured file absent from received archive'});continue;}
  const bytes=fs.readFileSync(filename);
  assert.equal(bytes.length,clip.bytes,clip.id+' changed size');
  assert.equal(sha(bytes),clip.sha256,clip.id+' changed bytes');
  queue.push({id:clip.id,file:clip.file,sha256:clip.sha256,
    zai:transcripts[clip.id]?.ok?transcripts[clip.id].text:null,
    windowSpeechFlag:clip.windowSpeechFlag,sourceUrl:clip.sourceUrl});
}
assert.equal(new Set(queue.map(item=>item.id)).size,queue.length);
const target=path.join(__dirname,'tooling/audience-asr-all-queue.json');
fs.writeFileSync(target,JSON.stringify(queue,null,2)+'\n');
const report={at:new Date().toISOString(),scope:'Actual byte/hash inventory for local ASR review, not content approval or a completed audience pack',
  queued:queue.length,priorSuccessfulTranscripts:queue.filter(item=>item.zai!==null).length,
  queueSha256:sha(fs.readFileSync(target)),missing};
fs.writeFileSync(path.join(root,'docs/audience-vibes/full-review-input.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
