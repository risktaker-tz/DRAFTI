'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const c={URL,Response,TextDecoder};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/audience.js'),'utf8')+'this.api={validateAudiencePack,createAudienceVibes};',c);
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const boot={G:{board:null},gameEpoch:1,drawerOpen:false,document:{hidden:false},$:()=>({hidden:true}),IVORY:1,EBONY:-1,
  countSide:()=>{throw Error('Board not initialized');}};
const contextStart=ui.indexOf('    context:()=>({epoch:gameEpoch');
vm.runInNewContext('this.read={'+ui.slice(contextStart,ui.indexOf('    status:',contextStart))+'}.context;',boot);
assert.equal(boot.read().tension,false,'Crowd context must be safe before the first board is constructed');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=new Map(),clips=[];
for(const crowd of ['A','B'])for(const event of ['cheer','applause','venue_bed']){
  const id='avpb-'+(clips.length+1),bytes=Buffer.from('fixture-audio-'+id);files.set('https://game.test/audience-vibes/audio/'+id+'.mp3',bytes);
  clips.push({id,sourceId:'source-'+id,file:'audio/'+id+'.mp3',crowd,event,durationSec:event.endsWith('_bed')?10:2,bytes:bytes.length,sha256:hash(bytes),review:{verdict:'approved'},loudnessLufs:-24});
}
let manifest={schema:'drafti-audience-pack/1',clips},now=0,context={epoch:1,menu:false,hidden:false,paused:false,conflict:false,ceremony:false,over:false};
let fetches=0,saveCount=0;const cacheData=new Map(),played=[],sources=[],messages=[],gains=[];
const caches={has:async name=>cacheData.has(name),delete:async name=>cacheData.delete(name),open:async name=>{
  if(!cacheData.has(name))cacheData.set(name,new Map());const map=cacheData.get(name);
  return {match:async key=>map.get(String(key))?.clone(),put:async(key,r)=>map.set(String(key),r.clone()),delete:async key=>map.delete(String(key))};
}};
const ctx={currentTime:0,destination:{},decodeAudioData:async()=>({duration:2}),
  createBufferSource(){const s={playbackRate:{value:1},connect(){},disconnect(){},start(){this.started=true;sources.push(this);},stop(){this.stopped=true;this.onended?.();}};return s;},
  createGain(){const gain={value:0,setTargetAtTime(v){this.value=v;}};gains.push(gain);return {gain,connect(){},disconnect(){}};},
  createStereoPanner(){return {pan:{value:0},connect(){},disconnect(){}};}};
const env={settings:{sound:true,audienceEnabled:false,audienceVolume:.35},now:()=>now,random:()=>0,context:()=>context,
  location:{href:'https://game.test/',protocol:'https:'},crypto:crypto.webcrypto,caches,fx:{ctx,ensure:()=>ctx,out:{}},
  bank:{sceneLockUntil:0,activeSources:new Map()},status:s=>messages.push(s),save:()=>saveCount++,played:r=>played.push(r),
  fetch:async url=>{fetches++;return url.endsWith('manifest.json')?new Response(JSON.stringify(manifest)):new Response(files.get(url)||'',{status:files.has(url)?200:404});}};
(async()=>{
  assert(c.api.validateAudiencePack(manifest));
  for(const altered of [{...clips[0],file:'../bad.mp3'},{...clips[0],review:{verdict:'pending'}},{...clips[0],durationSec:99}]){
    assert.throws(()=>c.api.validateAudiencePack({...manifest,clips:[altered]}));
  }
  assert.throws(()=>c.api.validateAudiencePack({...manifest,clips:[clips[0],{...clips[1],sourceId:clips[0].sourceId}]}),'One recording cannot be shared by both crowds');
  const a=c.api.createAudienceVibes(env);await a.init();assert.equal(fetches,0);assert.equal(a.installed(),false);
  assert(await a.install());assert(a.installed());assert.equal(env.settings.audienceEnabled,false,'Installing never enables crowds by itself');
  await a.pulse();assert.equal(played.length,0,'Off default is silent');
  env.settings.audienceEnabled=true;a.reset();now=3000;a.move(1,2,false,8);await a.pulse();
  assert(played.some(p=>p.event==='cheer'&&p.side===1&&p.crowd==='A'),'The capturing side gets its own crowd');
  assert(played.some(p=>p.bed&&p.side===1));assert(played.some(p=>p.bed&&p.side===-1),'Both sides have distinct beds');
  assert(sources.length<=3);assert(sources.every(s=>s.playbackRate.value===1),'Original recordings keep their natural speed');
  assert.equal(gains[0].value,.24*.35,'The default reaction gain is preserved');
  env.settings.audienceVolume=1;await a.pulse();
  assert.equal(gains[0].value,.78,'Full volume boosts reactions within their gain cap');
  assert(gains[1].value>.12,'Both crowd beds are raised at full volume');
  env.bank.activeSources.set('voice',{spoken:true});await a.pulse();
  assert.equal(gains[0].value,.78*.12,'The louder crowd still ducks under speech');
  env.bank.activeSources.clear();env.settings.audienceVolume=0;await a.pulse();
  assert(gains.every(gain=>gain.value===0),'Zero volume silences all crowd channels');
  context.menu=true;await a.pulse();assert(sources.every(s=>s.stopped),'Menus silence crowds without discarding the installed pack');
  context.menu=false;env.bank.sceneLockUntil=now+15000;a.move(-1,2,false,4);await a.pulse();assert.equal(played.length,3,'Retirement speech owns the scene');
  env.bank.sceneLockUntil=0;context.epoch=2;await a.pulse();assert.equal(played.length,3,'A new game cannot inherit the old capture reaction');
  const before=[...cacheData.get('drafti-audience-index-v1').values()][0].clone();
  const broken=Buffer.from('wrong');manifest={...manifest,clips:clips.map((x,i)=>i?x:{...x,sha256:hash(broken)})};
  assert.equal(await a.install(),false,'Corrupt or mismatched bytes cannot be installed');
  assert(a.installed());assert.deepEqual(await[...cacheData.get('drafti-audience-index-v1').values()][0].clone().json(),await before.json(),'A failed update leaves the previous complete pack active');
  const reopened=c.api.createAudienceVibes({...env,fetch:async()=>{throw Error('offline');}});await reopened.init();assert(reopened.installed(),'A complete pack reopens without network');
  cacheData.set('drafti-install-v3',new Map());await a.remove();assert(cacheData.has('drafti-install-v3'),'Removing crowds never deletes the installed core game');
  assert.equal(env.settings.audienceEnabled,false);assert.equal(saveCount,1);
  console.log('PASS optional/off-default install, file validation and hashes, atomic rollback, offline reopen, both crowd identities, original rate, bounded sources, menu/scene/epoch guards and scoped removal');
})().catch(error=>{console.error(error);process.exitCode=1;});
