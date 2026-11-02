'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8');
const audio={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/audio.manifest.js'),'utf8'),audio);
const start=ui.indexOf('  const RETIREMENT_DECK ='),end=ui.indexOf('  let autoNextTimer',start);
function run(wins){const timers=[],element={hidden:true},plays=[];const c={arena:{wins:{TZ:wins}},rosterById:()=>({id:'TZ',face:'TZ'}),aiName:()=> 'Tanzania',rosterLevel:()=>5,$:()=>element,sleep:ms=>ms,makeDeck:()=>()=> 'v_retire2',pick:ids=>ids[0],setTimeout:(fn,ms)=>timers.push({fn,ms}),performance:{now:()=>1000},SFX_BANK:{defs:audio.window.DRAFTI_SFX,sceneLockUntil:0,play:(id,opts)=>{plays.push({id,opts});return {};}}};vm.createContext(c);vm.runInContext(ui.slice(start,end)+'\nthis.show=showCeremony;',c);const duration=c.show('TZ');return {c,timers,element,plays,duration};}
const major=run(10);assert.equal(major.duration,17400);assert(major.timers.some(t=>t.ms===16250),'Applause follows the complete original passage');major.timers.find(t=>t.ms===1000).fn();assert(major.plays.some(p=>p.id==='v_retire2'&&p.opts.rate===1&&p.opts.maxDuration===15));assert.equal(major.c.SFX_BANK.sceneLockUntil,16100);assert.equal(major.element.hidden,false);major.timers.find(t=>t.ms===17400).fn();assert.equal(major.element.hidden,true);
const normal=run(1);assert.equal(normal.duration,8240);normal.timers.find(t=>t.ms===1000).fn();assert(normal.plays.some(p=>p.id==='v_retire1'),'Routine retirement uses a short original variation');
console.log('Retirement timing passed: natural speech, 15-second cap, protected passage, delayed applause and overlay cleanup');
