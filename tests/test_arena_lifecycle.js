'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8'),elements={autoNext:{hidden:true},ceremony:{hidden:true}};
const intervals=new Map(),cleared=[];let deferred,starts=0;
const c={settings:{aivaiAuto:true},performance:{now:()=>0},G:{mode:'aivai',result:{winner:1}},arena:{champion:'TZ',queue:['KE'],season:1,bouts:1},
  $:id=>elements[id],cancelCeremony(){elements.ceremony.hidden=true;},
  applyArenaResult:()=>({ceremony:true,text:'',champion:'TZ',seasonEnd:false}),
  showCeremony:()=>({then:fn=>{deferred=fn;}}),rosterById:id=>({id,face:''}),aiName:id=>id,
  SEASON_LEN:12,SEASON_STAGES:[{name:'group stage'}],stageOfBout:()=>0,
  setInterval:fn=>{const id=intervals.size+1;intervals.set(id,fn);return id;},clearInterval:id=>cleared.push(id),
  setTimeout(){},STREAMER:{intermission:()=>false},SFX_BANK:{play(){}},FX:{play(){}},startNewGameWithFanfare:()=>starts++};
vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  let autoNextTimer ='),ui.indexOf('  // ---------------- game lifecycle'))+'this.schedule=scheduleAutoNext;this.cancel=cancelAutoNext;',c);
c.schedule();c.cancel();deferred();assert.equal(intervals.size,0,'Old ceremony cannot begin a countdown after cancellation');
c.schedule();c.G.mode='ai';deferred();assert.equal(intervals.size,0,'Mode change suppresses old arena countdown');
c.G.mode='aivai';c.schedule();deferred();assert.equal(intervals.size,1);c.cancel();
intervals.get(1)();assert.equal(starts,0,'An already-queued countdown callback cannot replace a newer game');
assert(elements.autoNext.hidden);assert(cleared.includes(1));
function countdown(speed,voiceMs=0,change){
  let now=0,callback,started=0;
  const d={...c,G:{mode:'aivai',aiSpeed:speed,result:{winner:1}},
    Date:{now:()=>now},performance:{now:()=>now},
    applyArenaResult:()=>({ceremony:false,text:'',champion:'TZ',seasonEnd:false}),
    STREAMER:{intermission:()=>voiceMs>0,busyUntil:voiceMs},
    setInterval:fn=>{callback=fn;return 1;},clearInterval(){},
    startNewGameWithFanfare:()=>started++};
  vm.createContext(d);
  vm.runInContext(ui.slice(ui.indexOf('  let autoNextTimer ='),ui.indexOf('  // ---------------- game lifecycle'))+'this.schedule=scheduleAutoNext;',d);
  d.schedule();
  while(!started&&now<10000){now+=50;callback();if(change&&now>=change.at)d.G.aiSpeed=change.speed;}
  assert.equal(started,1);return now;
}
for(const speed of [1,2,4,6,8,10,16])assert.equal(countdown(speed),Math.ceil(6000/speed/50)*50,'Countdown follows selected '+speed+'x');
assert.equal(countdown(16,4200),4200,'Fast playback preserves a complete natural streamer announcement');
assert.equal(countdown(1,0,{at:1000,speed:16}),1350,'Changing speed updates the existing countdown immediately');
console.log('Arena lifecycle passed: cancelled ceremony, mode changes and stale countdown callbacks cannot replace a new game');
