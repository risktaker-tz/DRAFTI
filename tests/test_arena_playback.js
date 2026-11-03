'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../src/styles.css'),'utf8');
for(const speed of [1,2,4,6,8,10,16])assert(html.includes('data-v="'+speed+'">'+speed+'×'));
assert(css.includes('overflow-x: auto; overscroll-behavior-x: contain;'));
assert(css.includes('.aivai-bar > * { flex: 0 0 auto;'));
assert(css.includes('html, html body { overflow-x: clip; }'),'Page remains horizontally stable');
let delay, pending, executed=0;
const move={from:0,path:[0,9],caps:[]};
const c={G:{mode:'aivai',phase:'thinking',legal:[move,{from:1,path:[1,10],caps:[]},{from:2,path:[2,11],caps:[]}],aiSpeed:1},
  reqId:1,hintPending:false,aiPending:true,settings:{humanlike:false},thinkStart:0,
  Date:{now:()=>100},Math:Object.assign(Object.create(Math),{random:()=>.9}),setTimeout:(fn,ms)=>{delay=ms;pending=fn;},
  chooseRememberedMove:r=>r.best,searchLevelForSide:()=> 'l5',executeMove:()=>executed++};
vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  function handleSearch('),ui.indexOf('  // ---------------- board DOM')),c);
for(const mode of ['aivai','ai'])for(const speed of [1,2,4,6,8,10,16]) {
  Object.assign(c.G,{mode,phase:'thinking',aiSpeed:speed});c.settings.humanlike=false;
  c.handleSearch({id:1,best:move});assert.equal(delay,0,'Off adds no simulated wait');
}
c.settings.humanlike=true;c.G.mode='aivai';c.G.aiSpeed=1;c.G.phase='thinking';c.handleSearch({id:1,best:move});
assert(delay>1000,'Human pacing remains when enabled');
c.G.aiPaused=true;pending();assert.equal(executed,0,'Pause during search/presentation blocks a pending move');
c.G.aiPaused=false;pending();assert.equal(executed,1,'Unpaused matching result can execute');
const h={G:{mode:'aivai',aiSpeed:1},HOP_MS:200,window:{matchMedia:()=>({matches:false})},Math};vm.createContext(h);
vm.runInContext(ui.slice(ui.indexOf('  function moveHopMs('),ui.indexOf('  async function animateMove(')),h);
assert.equal(h.moveHopMs(0),200);h.G.aiSpeed=16;assert.equal(h.moveHopMs(0),35);
h.G.mode='ai';assert.equal(h.moveHopMs(0),200,'Spectator speed cannot speed up human gestures');
const sent=[];const s={G:{mode:'aivai',side:1,rsId:'american',noProg:0,board:[1,-1]},reqId:0,Date:{now:()=>0},
  styleForSide:()=>null,searchLevelForSide:()=> 'l10',levelOpts:()=>({opts:{budgetMs:5200,maxDepth:24}}),
  arenaPressureOpts:o=>o,getWorker:()=>({postMessage:p=>sent.push(p)}),settings:{humanlike:false}};
vm.createContext(s);vm.runInContext(ui.slice(ui.indexOf('  function runSearch('),ui.indexOf('  function handleSearch(')),s);
for(const speed of [1,16]){s.G.aiSpeed=speed;s.runSearch('ai');}
assert.deepEqual(sent[0].opts,sent[1].opts,'Speed never lowers search budget/depth');
assert(css.includes('#segSpeed { max-width: min(42vw, 190px); overflow-x: auto;'),'Speeds stay inside their original enclosed scrollable selector');
console.log('Arena playback passed: seven speeds, targeted overflow, no artificial waits when Off, preserved human pacing and unchanged search accuracy settings');
