'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
async function run(initial,next){
  const durations=[],transitions=[],contactDelays=[],p={sq:40,code:1,el:{style:{setProperty:(k,v)=>{if(k==='--hop-time')transitions.push(v);}},classList:{add(){},remove(){}}}};
  const c={G:{mode:'aivai',aiSpeed:initial,side:1,rs:{n:8}},HOP_MS:200,gameEpoch:1,Math,
    pieceAt:sq=>sq===p.sq?p:null,positionEl(){},captureRibbon(){},shockwave(){},physicalBurst(){},
    frameEl:{classList:{add(){},remove(){}}},FX:{play(){}},SFX_BANK:{effect(){},play(){}},
    window:{matchMedia:()=>({matches:true})},setTimeout:(fn,ms)=>{contactDelays.push(ms);fn();},
    sleep:ms=>{durations.push(ms);if(durations.length===1)c.G.aiSpeed=next;return Promise.resolve();}};
  vm.createContext(c);
  vm.runInContext(ui.slice(ui.indexOf('  function moveHopMs('),ui.indexOf('  function captureRibbon(')),c);
  vm.runInContext(ui.slice(ui.indexOf('  async function animateMove('),ui.indexOf('  let lastSpecAt =')),c);
  await c.animateMove({from:40,path:[40,26,12],caps:[33,19],promotes:false},1);
  assert.equal(durations.length,2);
  assert(Math.abs(durations[0]-560/initial)<1e-9&&Math.abs(durations[1]-560/next)<1e-9,'Each capture hop reads the current speed, even inside a single move');
  assert(Math.abs(parseFloat(transitions.at(-1))-560/next)<1e-9,'The real position transition follows the full updated hop clock without an early stop');
  const contactFraction=0.22228046353706682; // 50% distance on cubic-bezier(.3,.7,.4,1)
  assert(Math.abs(contactDelays[0]-(560/initial)*contactFraction)<1e-3&&
    Math.abs(contactDelays[1]-(560/next)*contactFraction)<1e-3,
    'Capture impact lands when the moving disc reaches each jumped piece ('+contactDelays.join(',')+')');
  assert(c.captureContactDelay(35,14,28,8,600)<c.captureContactDelay(35,14,21,8,600),
    'Flying-king capture timing follows the actual victim square, not a fixed point');
}
(async()=>{
  for(const pair of [[2,16],[16,2],[1,4],[4,1],[6,10],[10,8]])await run(...pair);
  console.log('PASS increasing/decreasing speed during one multi-capture updates subsequent hop waits and actual CSS movement durations');
})().catch(error=>{console.error(error);process.exitCode=1;});

// The drawn light ribbon must travel with the full piece hop, including the
// last 15% that previously left the piece visibly ahead of its trail.
{
  const text=ui, start=text.indexOf('  function captureRibbon('), end=text.indexOf('  async function animateMove(',start);
  const nodes=[], timers=[], c={G:{rs:{n:8}},Math,window:{matchMedia:()=>({matches:false})},
    document:{createElement:()=>({style:{setProperty(k,v){this[k]=v;}},setAttribute(){},appendChild(){}})},
    piecesEl:{appendChild(node){nodes.push(node);}},setTimeout:(fn,ms)=>timers.push(ms)};
  vm.createContext(c);vm.runInContext(text.slice(start,end),c);
  c.captureRibbon(40,26,280,2);
  assert.equal(nodes[0].style['--ribbon-travel'],'280ms','The light trail reaches the square with the piece');
  assert.equal(timers[0],730,'The trail fades cleanly after the matched movement completes');
  console.log('PASS capture ribbon and piece land on the same movement clock');
}

async function checkQuietLandingFeedback(){
  const order=[],p={sq:40,code:1,el:{style:{setProperty(){}},classList:{add(){},remove(){}}}};
  const c={G:{mode:'aivai',aiSpeed:1,side:1,rs:{n:8}},HOP_MS:200,gameEpoch:1,Math,
    pieceAt:sq=>sq===p.sq?p:null,positionEl(){},captureRibbon(){},shockwave(){},physicalBurst(){},
    frameEl:{classList:{add(){},remove(){}}},FX:{play:name=>order.push('fx:'+name)},
    SFX_BANK:{effect:name=>order.push('sfx:'+name),play(){}},window:{matchMedia:()=>({matches:true})},
    setTimeout:fn=>fn(),sleep:async()=>{order.push('hop-finished');}};
  vm.createContext(c);
  vm.runInContext(ui.slice(ui.indexOf('  function moveHopMs('),ui.indexOf('  function captureRibbon(')),c);
  vm.runInContext(ui.slice(ui.indexOf('  function captureRibbon('),ui.indexOf('  async function animateMove('))+ui.slice(ui.indexOf('  async function animateMove('),ui.indexOf('  let lastSpecAt =')),c);
  await c.animateMove({from:40,path:[40,33],caps:[],promotes:false},1);
  assert(order.indexOf('hop-finished')<order.indexOf('fx:move')&&order.indexOf('fx:move')<order.indexOf('sfx:landing'),
    'Quiet-move landing sound follows the completed glide, without adding a landing pause');
}
checkQuietLandingFeedback().then(()=>console.log('PASS quiet-move landing sound follows the glide without an added pause'))
  .catch(error=>{console.error(error);process.exitCode=1;});
