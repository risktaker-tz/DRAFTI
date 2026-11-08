'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const levelContext={};vm.createContext(levelContext);
vm.runInContext(ui.slice(ui.indexOf('  const LEVELS = {'),ui.indexOf('  const LEVEL_IDS ='))+'this.levels=LEVELS;',levelContext);
const levels=levelContext.levels,ids=Object.keys(levels);
assert.equal(ids.length,10,'The complete ten-rung ladder remains available');
for(let i=1;i<ids.length;i++){
  const prior=levels[ids[i-1]],next=levels[ids[i]];
  assert(next.budgetMs>prior.budgetMs,`${ids[i]} receives more search time`);
  assert(next.maxDepth>prior.maxDepth,`${ids[i]} searches deeper`);
  assert(next.jitter<=prior.jitter&&next.blunder<=prior.blunder&&next.pool<=prior.pool,
    `${ids[i]} never adds more randomness than the rung below`);
}
for(const id of ids.slice(4)){
  assert.equal(levels[id].jitter,0,`${id} has deterministic leaf evaluation`);
  assert.equal(levels[id].blunder,0,`${id} cannot inject a random blunder`);
  assert.equal(levels[id].pool,0,`${id} always chooses the searched best move`);
}
const optsContext={LEVELS:levels,Math:Object.assign(Object.create(Math),{random:()=>.5})};vm.createContext(optsContext);
vm.runInContext(ui.slice(ui.indexOf('  function levelOpts('),ui.indexOf('  const searchLevelForSide')),optsContext);
for(const id of ids.slice(4))assert.equal(optsContext.levelOpts(id,null).opts.jitter,0,
  `${id} search request carries no evaluation noise`);
const pickContext={LEVELS:levels,G:{mode:'ai'},Math:Object.assign(Object.create(Math),{random:()=>0})};vm.createContext(pickContext);
vm.runInContext(ui.slice(ui.indexOf('  function chooseLadderMove('),ui.indexOf('  function chooseCycleEscape(')),pickContext);
const bad={from:0,path:[0,1]},best={from:2,path:[2,3]},legal=[bad,best];
for(const id of ids.slice(4))assert.equal(pickContext.chooseLadderMove({best,rootScores:[{m:bad,score:-900},{m:best,score:0}]},legal,id),best,
  `${id} keeps the searched best result without random fallback`);
const E=require('../src/engine.js')(),rs=E.RULESETS.american,board=new Int8Array(64),at=(r,c)=>r*8+c;
board[at(4,3)]=1;board[at(4,1)]=1;board[at(3,4)]=1;board[at(7,2)]=1;board[at(7,6)]=1;
board[at(3,2)]=-1;board[at(1,2)]=-1;board[at(1,0)]=-1;board[at(0,1)]=-1;board[at(0,3)]=-1;
const safeLanding=at(2,3);
for(const id of ids.slice(4)){
  const result=E.search(rs,board,E.IVORY,optsContext.levelOpts(id,null).opts);
  assert.equal(result.best.path.at(-1),safeLanding,
    `${id} rejects the available capture that immediately loses a man`);
  assert.equal(pickContext.chooseLadderMove(result,E.legalMoves(rs,board,E.IVORY),id).path.at(-1),safeLanding,
    `${id} preserves the searched safe capture through move selection`);
}
console.log('AI strength ladder passed: effort rises at every rung, lower-level imperfection tapers monotonically, and Expert through The Machine use zero evaluation noise, blunders, and move-pool randomness.');
