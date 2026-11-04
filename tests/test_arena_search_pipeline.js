'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
let time=0,sent=[],handled=[],timer;
const board=new Int8Array([1,0,0,-1]),next=new Int8Array([0,1,0,-1]),move={from:0,path:[0,1],caps:[]};
const opts={budgetMs:5250,maxDepth:30,jitter:0,weights:{trade:1}};
const c={G:{mode:'aivai',aiSpeed:4,rs:{},rsId:'eastafrica8',diffIvory:'l9',diffEbony:'l10',board,side:1,noProg:0},
  E:{applyMove:()=>next,legalMoves:()=>[move],nextNoProgress:()=>1},IVORY:1,workerBroken:false,preparedSearch:null,
  reqId:10,gameEpoch:5,Date:{now:()=>time},styleForSide:side=>({side}),levelOpts:level=>{assert.equal(level,'l10');return{opts:structuredClone(opts)};},
  arenaPressureOpts:o=>o,getWorker:()=>({postMessage:p=>sent.push(p)}),
  searchLevelForSide:()=> 'l10',setTimeout:fn=>{timer=fn;},handleSearch:r=>handled.push(r)};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  function prepareArenaReply('),ui.indexOf('  function handleSearch(')),c);
c.prepareArenaReply(move,board,1,0);assert.equal(sent.length,1);assert.equal(c.reqId,11);
assert.equal(sent[0].opts.budgetMs,5250);assert.equal(sent[0].opts.maxDepth,30);assert.equal(sent[0].opts.weights.for,-1);
assert.equal(sent[0].side,-1);assert.equal(sent[0].noProgress,1);
const result={id:11,best:move};c.preparedSearch.result=result;
Object.assign(c.G,{board:next,side:-1,noProg:1});time=130;c.runSearch('ai');
assert.equal(sent.length,1,'Use the full result once, without searching the same position twice');
assert.equal(c.thinkStart,0,'Humanlike pacing includes calculation done during animation');timer();assert.equal(handled[0],result);
assert.equal(c.preparedSearch,null);
// A changed level/position must never consume a stale prepared result.
c.preparedSearch={id:11,epoch:4,rsId:'eastafrica8',side:-1,level:'l10',board:next,noProgress:1,result};
time=160;c.runSearch('ai');assert.equal(sent.length,2);assert.equal(sent[1].id,12);
c.G.mode='ai';c.prepareArenaReply(move,board,1,0);assert.equal(sent.length,2,'Human games retain normal turn search');
c.G.mode='aivai';c.G.aiSpeed=1;c.prepareArenaReply(move,board,1,0);assert.equal(sent.length,2,'The established 1x rhythm is retained');
console.log('PASS full-strength opponent search overlaps animation; exact level/position/epoch guards; single result consumption; human/1x unchanged');
