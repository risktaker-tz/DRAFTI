'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8'),a={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/audio.manifest.js'),'utf8'),a);const bank=a.window.DRAFTI_SFX;
let now=1000,hour=12;const played=[];
const c={settings:{streamer:'female',sound:true,sfx:{voice:true}},performance:{now:()=>now},Date:class{getHours(){return hour;}},Math:{random:()=>0},
  SFX_BANK:{defs:bank,buffers:new Map(Object.keys(bank).map(k=>[k,{}])),activeSources:new Map(),sceneLockUntil:0,play:id=>{played.push(id);return {};}}};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  const STREAMER ='),ui.indexOf('  function flashLabel('))+'this.s=STREAMER;',c);
const s=c.s;assert.equal(s.say('long_think'),false,'A daytime stream cannot ask how everyone is tonight');
hour=20;assert(s.say('long_think'));assert.equal(played.at(-1),'sf_think');
now+=46000;s.lastLine='';s.busyUntil=0;assert.equal(s.say('long_think'),false,'The role cooldown cannot bypass the longer recording rest');
now+=140000;s.lastLine='';assert(s.say('long_think'));
hour=9;now+=200000;c.settings.streamer='male';s.reset();s.busyUntil=0;s.at.clear();s.openGame();assert.equal(played.at(-1),'sm_greet2','Morning cannot select Good evening');
const count=played.length;s.reset();s.openGame();assert.equal(played.length,count,'New events do not restart the livestream');
console.log('PASS local-time greetings/night language, recording-level rest across events and session-scoped welcomes');
