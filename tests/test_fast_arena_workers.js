'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8'),workers=[];
const c={G:{mode:'aivai',aiSpeed:16},worker:null,workerBroken:false,verdictWorker:null,verdictWorkerBroken:false,
  pendingVerdicts:new Map(),pendingVerdict:null,workerSource:()=> 'actual-worker-source',
  URL:{createObjectURL:()=> 'blob:worker'},Blob:function(){},handleSearch(){},handleVerdict(){},
  Worker:function(){this.messages=[];this.postMessage=m=>this.messages.push(m);this.terminate=()=>{this.stopped=true;};workers.push(this);}};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  function getWorker('),ui.indexOf('  const DIFF_OPTS')),c);
const search=c.getWorker(),judge=c.getVerdictWorker();assert.notEqual(search,judge);
judge.postMessage({cmd:'classify'});search.postMessage({cmd:'search'});
assert.equal(search.messages.length,1);assert.equal(search.messages[0].cmd,'search','Full commentary work cannot enter the move-search queue at fast speeds');
assert.equal(c.getVerdictWorker(),judge,'One reusable judge worker, not one per move');
c.pendingVerdicts.set(1,{});c.cancelVerdictWork();assert(judge.stopped);assert.equal(c.pendingVerdicts.size,0);
c.G.aiSpeed=1;assert.equal(c.getVerdictWorker(),search,'Normal-speed sound judgement retains its established ordering');
c.G.aiSpeed=16;c.G.mode='ai';assert.equal(c.getVerdictWorker(),search,'Human matches are unchanged');
c.G.mode='aivai';c.verdictWorkerBroken=true;assert.equal(c.getVerdictWorker(),search,'Worker failure keeps full analysis fallback');
let learned=0,saved=0;
const move={path:[0,9]},h={move,boardBefore:[1,-1]},pv={id:9,ply:1,epoch:1,engine:true,actor:'nation:TZ',mover:1,playedPath:'0,9',boardBefore:[1,-1]};
Object.assign(c,{gameEpoch:1,pendingVerdicts:new Map([[9,pv]]),pendingVerdict:pv,G:{history:[h,{}],mode:'aivai',rsId:'american',over:false},
  mistakeMemory:{remember:()=>{learned++;return true;},snapshot:()=>({})},learningPosition:()=> 'p',learningRoute:()=> 'r',saveJSON:()=>saved++,LEARNING_KEY:'learning'});
vm.runInContext(ui.slice(ui.indexOf('  function handleVerdict('),ui.indexOf('  function physicalBurst(')),c);
c.handleVerdict({id:9,delta:200,depth:4});assert.equal(learned,1);assert.equal(saved,1);
assert.equal(c.pendingVerdicts.size,0,'A late valid lesson is consumed without reaching current-position sound effects');
c.pendingVerdicts.set(10,{...pv,id:10,playedPath:'wrong'});c.handleVerdict({id:10,delta:200,depth:4});assert.equal(learned,1,'Undo/replaced history cannot teach the wrong position');
console.log('PASS fast commentary isolation, unchanged human/1x queues, fallback/cleanup and exact-position late learning without stale sound effects');
