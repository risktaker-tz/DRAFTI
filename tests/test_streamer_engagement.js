'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8'),bank={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/audio.manifest.js'),'utf8'),{window:bank});
let now=1000;const played=[];
const c={settings:{streamer:'female',sound:true,sfx:{voice:true}},drawerOpen:false,document:{hidden:false},
  FX:{ctx:null},
  G:{history:[{move:{caps:[],promotes:false}}],lastMoveAt:1000,phase:'idle',mode:'ai',humanSide:1,over:false},
  performance:{now:()=>now},Date:class{getHours(){return 20;}},Math:{random:()=>0},
  SFX_BANK:{defs:bank.DRAFTI_SFX,buffers:new Map(Object.keys(bank.DRAFTI_SFX).map(k=>[k,{}])),sceneLockUntil:0,activeSources:new Map(),
    play(id,opts){played.push({id,opts});return {};}}};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  const STREAMER ='),ui.indexOf('  function flashLabel('))+'this.S=STREAMER;',c);
const S=c.S;S.reset();
const openingTimers=[], openingPlayed=[];
const openingContext={gameEpoch:1,drawerOpen:false,greeter:{intro:'fixture_intro'},
  G:{mode:'ai',over:false,history:[]},Math:{random:()=>0},
  setTimeout:fn=>openingTimers.push(fn),SFX_BANK:{play:id=>openingPlayed.push(id)}};
vm.runInNewContext(ui.slice(ui.indexOf('    const openingEpoch = gameEpoch;'),
  ui.indexOf('    // AI vs AI: the arena announcer opens the show')),openingContext);
openingContext.gameEpoch=2;openingTimers[0]();
assert.equal(openingPlayed.length,0,'A restarted game cannot inherit an old introduction');
openingContext.gameEpoch=1;openingContext.G.history=Array(5);openingTimers[0]();
assert.equal(openingPlayed.length,0,'An introduction cannot describe an established game');
openingContext.G.history=[];openingTimers[0]();
assert.deepEqual(openingPlayed,['fixture_intro'],'A current opening keeps its original recording');
c.SFX_BANK.activeSources.set(1,{spoken:true});S.pulse();assert.equal(played.length,0);
c.SFX_BANK.activeSources.clear();S.pulse();assert(played.at(-1).id.startsWith('sf_greet'),'Opening retries after a competing voice finishes');
const afterWelcome=played.length;S.reset();S.openGame();assert.equal(played.length,afterWelcome,'New bouts preserve the livestream session instead of saying we are beginning again');
now+=23000;c.G.phase='thinking';S.pulse();assert.equal(played.at(-1).id,'sf_think');
now+=23000;c.G.phase='idle';S.pulse();assert(played.at(-1).id.startsWith('sf_cta'));
const count=played.length;now+=23000;S.pulse();assert.equal(played.length,count,'Quiet routine moves cannot generate false tactical commentary');
c.drawerOpen=true;now+=100000;S.pulse();assert.equal(played.length,count,'Settings stay silent');
c.drawerOpen=false;c.G.aiPaused=true;c.G.mode='aivai';S.pulse();assert.equal(played.length,count,'Paused spectator games stay quiet');
c.G.aiPaused=false;S.intermission();assert(played.at(-1).id.startsWith('sf_cta'),'Intermission uses engagement, never the stream-ending outro');
now+=100000;c.SFX_BANK.sceneLockUntil=now+15000;const before=played.length;assert.equal(S.intermission(),false);assert.equal(played.length,before,'Retirement original is protected');
c.SFX_BANK.sceneLockUntil=0;c.settings.streamer='male';S.reset();S.joinedMidgame=true;c.G.over=false;c.G.phase='thinking';S.pulse();assert.equal(played.at(-1).id,'sm_think','Midgame joins use the selected real voice and present context');
now+=100000;c.settings.streamer='off';S.pulse();assert.equal(played.at(-1).id,'sm_think');
const stored=new Map();c.sessionStorage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};
S.sessionOpened=false;S.rememberSession();assert.equal(stored.get('drafti.stream.welcomed.v1'),'1');
const reload={...c};vm.createContext(reload);vm.runInContext(ui.slice(ui.indexOf('  const STREAMER ='),ui.indexOf('  function flashLabel('))+'this.S=STREAMER;',reload);
assert.equal(reload.S.sessionOpened,true,'Reloading the same livestream tab preserves its welcome state');
console.log('PASS opening retry, selected voice, quiet-moment cadence, correct intermission, menu/pause/mute/ceremony gates and no stale tactical speech');

async function checkVocabulary() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../web/streamer-vocabulary/manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
  const fetched = [];
  c.settings.streamer = 'funny';
  c.FX.ctx = { decodeAudioData: async () => ({duration: 3}) };
  c.fetch = async url => {
    fetched.push(url);
    return {ok: true, json: async () => manifest, arrayBuffer: async () => new ArrayBuffer(1)};
  };
  const before = played.length;
  await S.warmVoice();
  assert.equal(played.length, before, 'Loading vocabulary does not start speech');
  assert.equal(fetched.length, 1 + manifest.filter(clip => clip.mode === 'funny').length);
  for (const [role, source] of Object.entries({capture: 'capture1', feast: 'capture2', capture_chain: 'capture3plus', crowning: 'new_king'})) {
    assert(S.extraPools.funny[role].length > 0);
    assert(S.extraPools.funny[role].every(id => manifest.some(clip => clip.id === id && clip.role === source)));
  }
  const say = S.say;
  const roles = [];
  S.say = role => { roles.push(role); return role === 'next_rematch'; };
  assert(S.intermission('next_rematch'));
  assert.deepEqual(roles, ['cta', 'next_rematch']);
  S.say = say;
}
checkVocabulary().catch(error => { console.error(error); process.exitCode = 1; });
