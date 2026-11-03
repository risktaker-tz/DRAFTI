'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8'),bank={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/audio.manifest.js'),'utf8'),{window:bank});
let now=1000;const played=[];
const c={settings:{streamer:'female',sound:true,sfx:{voice:true}},drawerOpen:false,document:{hidden:false},
  G:{history:[{move:{caps:[],promotes:false}}],lastMoveAt:1000,phase:'idle',mode:'ai',humanSide:1,over:false},
  performance:{now:()=>now},Math:{random:()=>0},
  SFX_BANK:{defs:bank.DRAFTI_SFX,buffers:new Map(Object.keys(bank.DRAFTI_SFX).map(k=>[k,{}])),sceneLockUntil:0,activeSources:new Map(),
    play(id,opts){played.push({id,opts});return {};}}};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  const STREAMER ='),ui.indexOf('  function flashLabel('))+'this.S=STREAMER;',c);
const S=c.S;S.reset();
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
