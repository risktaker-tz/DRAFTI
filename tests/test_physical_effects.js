'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
let reduced=false;const added=[],timers=[],trays=[];
const make=()=>({children:[],style:{setProperty(k,v){this[k]=v;}},setAttribute(k,v){this[k]=v;},appendChild(e){this.children.push(e);},remove(){this.removed=true;}});
const c={IVORY:1,Math,window:{matchMedia:()=>({matches:reduced})},document:{createElement:make,body:{appendChild:e=>added.push(e)}},
  $:id=>({getBoundingClientRect(){trays.push(id);return {left:100,top:500,width:200,height:30};}}),setTimeout:(fn,ms)=>timers.push({fn,ms})};
vm.runInNewContext(ui.slice(ui.indexOf('  function physicalBurst('),ui.indexOf('  async function animateMove(')),c);
const piece={getBoundingClientRect:()=>({left:40,top:50,width:40,height:40})};
c.physicalBurst(piece,'capture',1);assert.equal(added[0].children.length,8);assert.equal(trays[0],'trayTop');
assert.equal(added[0].children[7].style['--dy'],'445px');assert.equal(added[0]['aria-hidden'],'true');
c.physicalBurst(piece,'capture',-1);assert.equal(trays[1],'trayBottom');
c.physicalBurst(piece,'victory',1);assert.equal(added[2].children.length,14);
for(const t of timers){assert(t.ms<=1100);t.fn();}assert(added.every(e=>e.removed),'Transient particles clean themselves up');
reduced=true;c.physicalBurst(piece,'capture',1);assert.equal(added.length,3,'Reduced motion creates no particles or flights');
c.doomSide=1;c.frameEl={dataset:{doomSide:'1'},classList:{remove(){}}};
vm.runInNewContext(ui.slice(ui.indexOf('  function doomClear()'),ui.indexOf('  // On the loser',ui.indexOf('  function doomClear()'))),c);
c.doomClear();assert.equal(c.doomSide,0);assert(!('doomSide' in c.frameEl.dataset),'Undo and game-end cleanup remove the ember condition');
console.log('Physical effects passed: both capture trays, bounded particles, victory burst, cleanup and reduced-motion silence');
