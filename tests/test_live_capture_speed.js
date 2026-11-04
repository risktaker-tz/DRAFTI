'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
async function run(initial,next){
  const durations=[],transitions=[],p={sq:40,code:1,el:{style:{setProperty:(k,v)=>{if(k==='--hop-time')transitions.push(v);}},classList:{add(){},remove(){}}}};
  const c={G:{mode:'aivai',aiSpeed:initial,side:1,rs:{n:8}},HOP_MS:200,gameEpoch:1,Math,
    pieceAt:sq=>sq===p.sq?p:null,positionEl(){},captureRibbon(){},shockwave(){},physicalBurst(){},
    frameEl:{classList:{add(){},remove(){}}},FX:{play(){}},SFX_BANK:{effect(){},play(){}},
    window:{matchMedia:()=>({matches:true})},setTimeout:fn=>fn(),
    sleep:ms=>{durations.push(ms);if(durations.length===1)c.G.aiSpeed=next;return Promise.resolve();}};
  vm.createContext(c);
  vm.runInContext(ui.slice(ui.indexOf('  function moveHopMs('),ui.indexOf('  function captureRibbon(')),c);
  vm.runInContext(ui.slice(ui.indexOf('  async function animateMove('),ui.indexOf('  let lastSpecAt =')),c);
  await c.animateMove({from:40,path:[40,26,12],caps:[33,19],promotes:false},1);
  assert.equal(durations.length,2);
  assert(Math.abs(durations[0]-560/initial)<1e-9&&Math.abs(durations[1]-560/next)<1e-9,'Each capture hop reads the current speed, even inside a single move');
  assert(Math.abs(parseFloat(transitions.at(-1))-560/next*.85)<1e-9,'The real position transition follows the updated hop clock');
}
(async()=>{
  for(const pair of [[2,16],[16,2],[1,4],[4,1],[6,10],[10,8]])await run(...pair);
  console.log('PASS increasing/decreasing speed during one multi-capture updates subsequent hop waits and actual CSS movement durations');
})().catch(error=>{console.error(error);process.exitCode=1;});
