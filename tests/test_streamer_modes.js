'use strict';
// Live streamer modes: additive-by-default gating, exclusive selection,
// pool/bank integrity, cooldowns, quotas and category respect.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
const html=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const audio={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/audio.manifest.js'),'utf8'),audio);
const bank=audio.window.DRAFTI_SFX;
const catalog=JSON.parse(fs.readFileSync(path.join(root,'scripts/audio_catalog.json'),'utf8'));

// template: exactly one selector, four exclusive options, Off listed first (default disabled)
assert.equal((html.match(/id="segStreamer"/g)||[]).length,1,'one streamer selector');
const seg=html.slice(html.indexOf('id="segStreamer"'),html.indexOf('id="segStreamer"')+900);
for (const v of ['off','female','male','funny']) assert(seg.includes('data-v="'+v+'"'),'option '+v);
assert(seg.indexOf('data-v="off"')<seg.indexOf('data-v="female"'),'Off first');

// settings: default off, sanitized on load, wired through wireSeg, reset per game
assert(ui.includes("streamer: 'off'"),'settings default streamer off');
assert(ui.includes("settings.streamer !== 'female' && settings.streamer !== 'male' && settings.streamer !== 'funny'"),'sanitized');
assert(ui.includes("wireSeg('segStreamer'"),'selector wired');
assert(ui.includes('STREAMER.reset();'),'per-game / per-switch reset');
assert(ui.includes('STREAMER.openGame();'),'game-open greeting hook');

// module: slice STREAMER out and exercise the gates deterministically
const s=ui.indexOf('const STREAMER ='),e=ui.indexOf('function flashLabel',s);
assert(s>0&&e>s,'STREAMER module present');
const plays=[];
const sandbox={settings:{streamer:'off',sound:true,sfx:{voice:true}},
  SFX_BANK:{defs:bank,buffers:new Map(Object.keys(bank).map((k)=>[k,{filled:true}])),activeSources:new Map(),sceneLockUntil:0,
    play:(id,opts)=>{plays.push({id,opts});return {id};}},
  performance:{now:()=>1000},Math:{random:()=>0,min:(a,b)=>a<b?a:b,max:(a,b)=>a>b?a:b}};
vm.createContext(sandbox);
vm.runInContext(ui.slice(s,e)+'\nthis.STREAMER=STREAMER;',sandbox);
const S=sandbox.STREAMER;

// every gendered pool id exists, is family-tagged, role-tagged, event-tagged
for (const mode of ['female','male']) {
  for (const [role,pool] of Object.entries(S.POOLS[mode])) {
    assert(pool.length,'pool non-empty: '+mode+' '+role);
    for (const id of pool) {
      assert(bank[id],'bank has '+id);
      assert.equal(bank[id].family,'streamer-'+mode,'family '+id);
      assert.equal(bank[id].role,role,'role '+id);
      assert(bank[id].event&&bank[id].event.startsWith('stream_'),'event '+id);
      assert(catalog[id].source&&catalog[id].license&&catalog[id].use,'catalog metadata '+id);
      assert(/z-ai TTS/.test(catalog[id].source)&&/MIT/.test(catalog[id].license),'honest TTS provenance '+id);
      assert.equal(bank[id].c,'voice','category voice '+id);
    }
  }
}
// funny mode reuses existing credited bank clips only — no fabricated audio
for (const [role,pool] of Object.entries(S.POOLS.funny)) {
  assert(pool.length,'funny pool non-empty: '+role);
  for (const id of pool) assert(bank[id],'funny pool id exists: '+id);
}
const funnyIds=Object.values(S.POOLS.funny).flat();
assert(funnyIds.every((id)=>bank[id].family!=='streamer-female'&&bank[id].family!=='streamer-male'),'funny reuses non-streamer clips');

// off by default: nothing ever plays, whatever the role
for (const role of Object.keys(S.ROLES)) assert.equal(S.say(role),false,'off gate: '+role);
assert.equal(plays.length,0,'no playback while off');

// female mode: plays, goes busy, then drops (never queues or interrupts)
sandbox.settings.streamer='female';
assert.equal(S.say('greeting'),true,'female greeting plays');
assert(plays.length===1&&plays[0].id==='sf_greet1','sf line played');
assert.equal(S.say('greeting'),false,'busy after speaking');
assert.equal(S.say('feast'),false,'one streamer voice at a time');
// voice category chip and master sound gates
S.busyUntil=0;
sandbox.settings.sfx.voice=false; assert.equal(S.say('praise'),false,'voice chip respected'); sandbox.settings.sfx.voice=true;
sandbox.settings.sound=false; assert.equal(S.say('praise'),false,'master sound respected'); sandbox.settings.sound=true;
// per-role cooldown, per-game quota, at-map bookkeeping
S.busyUntil=0; assert.equal(S.say('greeting'),false,'cooldown holds');
for (let i=0;i<S.ROLES.capture.perGame;i++){ S.busyUntil=0; S.at.clear(); S.lastLine=''; assert.equal(S.say('capture'),true,'capture '+i); }
S.busyUntil=0; S.at.delete('capture');
assert.equal(S.say('capture'),false,'per-game quota holds');
// role without a pool in this mode
assert.equal(S.say('nonexistent_role'),false,'unknown role safe');

// funny mode plays existing clips and keeps its own counts
sandbox.settings.streamer='funny'; S.busyUntil=0; S.reset();
assert.equal(S.say('defeat'),true,'funny defeat plays');
assert(['sadviolin','cricket','lose_womp'].includes(plays[plays.length-1].id),'funny pool id played');

// male mode pool plays its own lines
sandbox.settings.streamer='male'; S.busyUntil=0;
assert.equal(S.say('victory'),true,'male victory plays');
assert(plays[plays.length-1].id==='sm_win','sm line played');

// openGame alternates greeting and the engagement call
S.reset(); S.busyUntil=0; sandbox.settings.streamer='female'; S.at.clear();
S.games=1; S.openGame(); assert(plays[plays.length-1].id.startsWith('sf_greet'),'game 1 greets');
S.reset(); S.busyUntil=0; S.at.clear();
S.games=2; S.openGame(); assert(plays[plays.length-1].id.startsWith('sf_cta'),'game 2 makes the call');

console.log('Streamer modes passed: three exclusive default-off modes, gated pools, cooldowns, quotas, funny reuse and bank integrity');
