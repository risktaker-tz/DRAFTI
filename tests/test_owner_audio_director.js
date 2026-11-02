'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..'),ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
const definitions={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/audio.manifest.js'),'utf8'),definitions);
const bank=definitions.window.DRAFTI_SFX,map=definitions.window.DRAFTI_OWNER_AUDIO;
assert.equal(Object.keys(map.clips).length,18);
const cuts=JSON.parse(fs.readFileSync(path.join(root,'docs/owner-audio-cuts.json'),'utf8'));
const crypto=require('crypto');
for(const [id,meta] of Object.entries(map.clips)){
  assert(bank[id],id+' resolves');const bytes=Buffer.from(bank[id].d.split(',')[1],'base64');
  assert(bytes.equals(fs.readFileSync(path.join(root,'src/audio',id+'.mp3'))),id+' embedded bytes');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),cuts.cuts[id].sha256,id+' reviewed cut preserved');
  assert(bytes.length<=61440&&cuts.cuts[id].seconds<=3.5,id+' source size/duration');
  assert(meta.maxPerGame>0&&meta.cooldownSec>=60&&meta.chancePerEvent<=.3,id+' bounded');
}
let now=100000,plays=[];
const fakeMath=Object.create(Math);fakeMath.random=()=>0;
const c={window:definitions.window,settings:{sound:true},G:{over:false,aiSpeed:1},performance:{now:()=>now},Math:fakeMath};
vm.runInNewContext('this.bank={'+ui.slice(ui.indexOf('    defs: window.DRAFTI_SFX'),ui.indexOf('    decoding: false,'))+'};',c);
const d=c.bank;d.sceneLockUntil=0;d.on=()=>true;d.buffers=new Map(Object.keys(bank).map(id=>[id,{}]));d.play=id=>{plays.push(id);return {};};
assert(!d.directOwner('human_blunder_flagrant',{human:false,delta:500}));
assert(!d.directOwner('human_blunder_flagrant',{human:true,forced:true,delta:500}));
assert(!d.directOwner('human_blunder_flagrant',{human:true,delta:200}));
assert(d.directOwner('human_blunder_flagrant',{human:true,delta:500}));assert.equal(plays.length,1);
now+=400000;assert(!d.directOwner('human_blunder_flagrant',{human:true,delta:500}),'Both laugh cuts share one per-game quota');
d.resetGame();assert(d.directOwner('human_blunder_flagrant',{human:true,delta:500}));
d.resetGame();now+=20000;assert(!d.directOwner('human_blunder_flagrant',{human:true,delta:500}),'Five-minute laugh cooldown survives a new game');
now+=400000;d.sceneLockUntil=now+1000;assert(!d.directOwner('capture_own_feast'));d.sceneLockUntil=0;
c.G.aiSpeed=2;assert(!d.directOwner('capture_own_feast'));c.G.aiSpeed=1;
d.on=()=>false;assert(!d.directOwner('capture_own_feast'));d.on=()=>true;
assert(d.directOwner('capture_own_feast'));assert(!d.directOwner('material_loss_sudden'),'Global rest prevents adjacent memes');
for(let i=0;i<4;i++){d.defs['fixture_'+i]={event:'landing'};d.buffers.set('fixture_'+i,{});}
const samples=[];for(let i=0;i<9;i++){now+=200;d.effect('landing');samples.push(plays.at(-1));}
for(let i=1;i<samples.length;i++)assert(!samples.slice(Math.max(0,i-3),i).includes(samples[i]),'Event decks avoid three recent performances');
console.log('Owner originals passed: 18 exact cuts embedded, family quotas, rare-human-only laughter, persistent cooldown, category/mute/scene/speed guards');
