'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ui = fs.readFileSync(require('path').join(__dirname, '../src/ui.js'), 'utf8');
const timers = [], cleared = [], settings = {sound:true,sfx:{think:true},aivaiAuto:true,pname:'Player'};
const c = {settings, performance:{now:()=>100}, SFX_BANK:{sceneLockUntil:0}, Math,
  setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;}, clearTimeout:id=>cleared.push(id)};
vm.createContext(c);
vm.runInContext('const FX = {' + ui.slice(ui.indexOf('    thinkTimer: 0,'),ui.indexOf('    tone(f, dur,')) + '}; this.fx=FX;',c);
let breaths=0, stops=0; c.fx.ensure=()=>true; c.fx.breathe=()=>breaths++;
c.fx.thinkStart(); assert.equal(breaths,0); assert.equal(timers[0].ms,6000);
c.fx.thinkStart(); assert.equal(timers.length,1,'Repeated renders cannot duplicate thinking loops');
timers[0].fn(); assert.equal(breaths,1); assert(timers[1].ms>=9500&&timers[1].ms<=14000);
c.fx.thinkSource={stop:()=>stops++}; c.fx.thinkStop(); assert.equal(stops,1); assert.equal(c.fx.thinkTimer,0);
settings.sound=false;c.fx.thinkStart();assert.equal(timers.length,2);
settings.sound=true;settings.sfx.think=false;c.fx.thinkStart();assert.equal(timers.length,2);
const elements = {}, el=id=>elements[id]||(elements[id]={classList:{toggle(){}},textContent:'',title:''});
Object.assign(c, {$:el, document:{body:{classList:{toggle(){}}}},IVORY:1,EBONY:-1,hintPending:false,
  displayName:s=>s===1?'Tanzania':'Kenya', sideDot:()=> 'ivory', arena:{season:3,bouts:8},
  SEASON_LEN:12,SEASON_STAGES:[{name:'Semi-finals'}],stageOfBout:()=>0,ord:n=>n+'th',
  posKey:(b,s)=>b.join(',')+'|'+s,
  G:{mode:'aivai',side:1,phase:'idle',over:false,pairMeets:4,rs:{name:'Canadian'},board:[],history:[],legal:[],noProg:0,repMap:new Map()}});
c.FX=c.fx;
c.G.nationalMatch=true;c.G.arenaSeason=3;c.G.arenaBout=8;
vm.runInContext(ui.slice(ui.indexOf('  const arenaOn ='),ui.indexOf('  const posKey =')),c);
vm.runInContext(ui.slice(ui.indexOf('  function lowMaterialLimit('),ui.indexOf('  function checkGameEnd(')),c);
vm.runInContext(ui.slice(ui.indexOf('  function updateBanner()'),ui.indexOf('  function sideDot()'))+'this.render=updateBanner;',c);
c.render();assert.equal(el('bannerIvory').textContent,'Tanzania');assert.equal(el('bannerEbony').textContent,'Kenya');
assert.equal(el('bannerContext').textContent,'Semi-finals');assert.equal(el('bannerDetail').textContent,'Bout 9/12 · 4th meeting');
c.G.phase='thinking';c.render();assert.equal(el('bannerText').textContent,'Thinking — Tanzania');
c.G.phase='animating';c.render();assert.equal(el('bannerText').textContent,'Moving — Tanzania','The moving side has not switched before the animation commits');
assert.equal(el('bannerIvory').textContent,'Tanzania','Matchup remains independent of thinking status');
c.G.over=true;c.G.result={winner:-1,reason:'No legal moves'};c.settings.aivaiAuto=false;c.arena.season=4;c.arena.bouts=0;c.render();assert.equal(el('bannerText').textContent,'Kenya wins');assert.equal(el('bannerContext').textContent,'No legal moves');
assert.equal(el('bannerEventLabel').textContent,'Season 3','Finished board retains its real season after the ladder advances');
assert.equal(el('bannerDetail').textContent,'Bout 9/12 · 4th meeting','Stop and review cannot replace the finished bout identity');
c.G.over=false;c.G.mode='ai';c.G.humanSide=1;c.G.phase='idle';c.render();assert.equal(el('bannerText').textContent,'Your move');assert.equal(el('bannerDetail').textContent,'Canadian');
c.G.mode='human';c.render();assert.equal(el('bannerContext').textContent,'Two players');
assert(!/tier\.soft\)\s*\{\s*SFX_BANK\.play\('clock_tick'/.test(ui),'Idle nudge must remain silent');
let chipHandler,chipStops=0;
const controls={settings:{sound:false,sfx:{think:true}},FX:{thinkStop:()=>chipStops++},SETTINGS_KEY:'test',saveJSON(){},updateSegs(){},
  $:()=>({addEventListener:(_event,fn)=>chipHandler=fn})};
vm.runInNewContext(ui.slice(ui.indexOf("  $('sfxChips').addEventListener"),ui.indexOf('  // Deliberate previews')),controls);
chipHandler({target:{closest:()=>({dataset:{v:'think'}})}});assert.equal(chipStops,1,'Thinking chip stops an active rustle immediately');
const mixCalls=[],mixContext={settings:{sound:false,sfx:{master:.9}}};
vm.runInNewContext('this.mix={'+ui.slice(ui.indexOf('    setMaster(v)'),ui.indexOf('    // A sparse,'))+'};',mixContext);
mixContext.mix.ctx={currentTime:10};mixContext.mix.out={gain:{setTargetAtTime:value=>mixCalls.push(value)}};
mixContext.mix.setMaster(.6);assert.equal(mixCalls.at(-1),0);assert.equal(mixContext.settings.sfx.master,.6);
mixContext.settings.sound=true;mixContext.mix.syncVolume();assert.equal(mixCalls.at(-1),.6,'Unmute restores the selected volume without overwriting it');
let classified;
Object.assign(c,{countSide:s=>s===1?5:4,applyMoveEvent:ev=>classified=ev});
vm.runInContext(ui.slice(ui.indexOf('  function classifySync('),ui.indexOf('  // impact shake,'))+'this.classify=classifySync;',c);
const capture={caps:[8],path:[1,17],promotes:false}; c.G.legal=[{caps:[]}];
c.classify(capture,[capture],4,1);assert.equal(classified,'advantage');
c.G.legal=[{caps:[17]}];c.classify(capture,[capture],4,1);assert.equal(classified,'none','Recapturable pieces earn no premature advantage praise');
c.countSide=s=>s===-1?5:4;c.G.legal=[];c.classify(capture,[capture],4,-1);assert.equal(classified,'advantage','Opponent earns identical situational spotlight');
let wink, cleanup, reduced = false, winkSounds = 0;
const hint = {
  settings: {shake:true},
  FX: {play:id=>{assert.equal(id,'hint_wink');winkSounds++;}},
  window: {matchMedia:()=>({matches:reduced})},
  document: {createElement:()=>({setAttribute(){},remove(){if(wink===this)wink=null;}})},
  pieceAt:sq=>sq===12?{el:{querySelector:()=>({querySelector:()=>wink,appendChild:el=>{wink=el;}})}}:null,
  setTimeout:(fn,ms)=>{assert.equal(ms,850);cleanup=fn;}
};
vm.runInNewContext(ui.slice(ui.indexOf('  function winkHintPiece('),ui.indexOf('  function rebuildPieces(')),hint);
hint.winkHintPiece(11);assert(!wink);
hint.winkHintPiece(12);assert.equal(wink.className,'hint-wink hint-wink-shake');
const firstCleanup=cleanup;
hint.settings.shake=false;hint.winkHintPiece(12);assert.equal(wink.className,'hint-wink');
firstCleanup();assert(wink,'An older timer cannot remove the latest hint');
cleanup();assert(!wink);
reduced=true;hint.winkHintPiece(12);assert(!wink,'Reduced motion skips the animated decoration');
assert.equal(winkSounds,2,'Each visible wink plays one synchronized cue');
console.log('Thinking and billboard checks passed: hint feedback, delayed cues, cleanup, mute/toggle and stable matchup');
