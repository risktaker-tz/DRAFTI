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
assert(map.clips.sorry_dontcry.events.includes('last_piece_loss')&&map.clips.dont_cry.events.includes('last_piece_loss'),
  'The existing, reviewed consolation recordings are available for a final-piece loss without replacing their original mapping');
assert(ui.includes("SFX_BANK.directOwner('last_piece_loss', { winner, loserSide: -winner })")&&
  ui.includes('r.winner !== null && finalMove?.caps?.length && countSide(-r.winner) === 0'),
  'Only a captured final piece with a confirmed winning side schedules the post-result reaction');
let now=100000,plays=[];
const fakeMath=Object.create(Math);fakeMath.random=()=>0;
const c={window:definitions.window,settings:{sound:true},G:{over:false,aiSpeed:1,mode:'aivai'},performance:{now:()=>now},Math:fakeMath};
vm.runInNewContext(ui.slice(ui.indexOf('  function makeDeck('),ui.indexOf('  const THINK_POOL =')),c);
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
c.G.aiSpeed=4;c.G.mode='ai';assert(d.directOwner('material_loss_sudden'),'Persisted arena speed does not suppress normal-speed human-game reactions');c.G.mode='aivai';c.G.aiSpeed=1;now+=20000;
d.on=()=>false;assert(!d.directOwner('capture_own_feast'));d.on=()=>true;
assert(d.directOwner('capture_own_feast'));assert(!d.directOwner('material_loss_sudden'),'Global rest prevents adjacent memes');
now+=20000;c.G.mode='aivai';c.G.aiSpeed=16;c.G.over=false;c.G.result=null;c.G.history=[{move:{caps:[7]}}];
c.countSide=side=>side===-1?0:4;
assert(!d.directOwner('last_piece_loss',{winner:1,loserSide:-1}), 'An ongoing game cannot trigger a final-piece reaction');
c.G.over=true;c.G.result={winner:1};c.G.history=[{move:{caps:[7]}}];
assert(d.directOwner('last_piece_loss',{winner:1,loserSide:-1}), 'A rare last-piece reaction remains eligible at high arena speed after a real elimination');
assert(['sorry_dontcry','dont_cry'].includes(plays.at(-1)), 'A final-piece reaction uses only the existing reviewed consolation clips');
d.resetGame();now+=20000;c.G.history=[{move:{caps:[]}}];
assert(!d.directOwner('last_piece_loss',{winner:1,loserSide:-1}), 'A non-capture ending cannot trigger the final-piece reaction');
c.G.history=[{move:{caps:[3]}}];c.countSide=side=>1;
assert(!d.directOwner('last_piece_loss',{winner:1,loserSide:-1}), 'A remaining losing-side piece prevents the elimination reaction');
c.countSide=side=>side===-1?0:4;
assert(!d.directOwner('last_piece_loss',{winner:-1,loserSide:-1}), 'The reaction cannot target the winning side');
for(let i=0;i<4;i++){d.defs['fixture_'+i]={event:'landing'};d.buffers.set('fixture_'+i,{});}
const samples=[];for(let i=0;i<9;i++){now+=200;d.effect('landing');samples.push(plays.at(-1));}
assert.equal(d.effect('not-an-embedded-event'),null,'Dynamic menu previews cannot resolve unknown events to an audio ID');
for(let i=1;i<samples.length;i++)assert(!samples.slice(Math.max(0,i-3),i).includes(samples[i]),'Event decks avoid three recent performances');
console.log('Owner originals passed: 18 exact cuts embedded, family quotas, rare-human-only laughter, persistent cooldown, category/mute/scene/speed guards');
