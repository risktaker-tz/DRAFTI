'use strict';
const assert=require('assert'),{createHarness,playGame}=require('../scripts/arena_harness');
const seed=1234,settings={diff:'l1'};
// Test exact checkpoint/RNG restoration and ensure a bounded simulation cap
// remains an unresolved position instead of being counted as a game draw.
const options={maxPlies:8,houseDraws:true,levels:['l1','l1']};
const selector=createHarness(seed,settings);selector.G.mode='aivai';selector.G.seatIvory='TZ';selector.G.seatEbony='KE';
selector.G.rs=selector.E.RULESETS.american;selector.G.rsId='american';selector.G.board=selector.E.setupBoard(selector.G.rs);selector.G.side=1;
const selectorMoves=selector.E.legalMoves(selector.G.rs,selector.G.board,1),rootScores=selectorMoves.map((m,i)=>({m,score:i===0?100:i===1?99:-500}));
selector.G.repMap=new Map([[selector.E.applyMove(selector.G.rs,selector.G.board,selectorMoves[0],1).join(',')+'|-1',1]]);
assert.equal(selector.chooseMove({best:selectorMoves[0],depth:6,rootScores},selectorMoves,'l10').path.join(),selectorMoves[1].path.join(),
  'The fairness harness uses the production loop-escape selector for a repeated best move');
selector.G.repMap.clear();
assert.equal(selector.chooseMove({best:selectorMoves[0],depth:6,rootScores},selectorMoves,'l10').path.join(),selectorMoves[0].path.join(),
  'The harness leaves normal, non-repeating move choice intact');
const full=createHarness(seed,settings);full.api.seatArenaBout();
const expected=playGame(full,options);
assert.equal(expected.unresolved,true,'The safety cap is a censored game, not a draw');
assert.equal(expected.winner,null,'An incomplete game has no assigned winner');
const interrupted=createHarness(seed,settings);interrupted.api.seatArenaBout();let game,harness;
assert.throws(()=>playGame(interrupted,{...options,onProgress:state=>{
  if(state.ply===5){game=JSON.parse(JSON.stringify(state));harness=interrupted.snapshot();throw Error('intentional checkpoint boundary');}
}}),/intentional checkpoint boundary/);
assert.equal(game.ply,5);
const resumed=createHarness(seed,settings,harness);
const actual=playGame(resumed,{...options,checkpoint:game});
assert.deepEqual(actual,expected,'A real-engine midgame resume preserves the unresolved state and node counters');
assert.deepEqual(resumed.snapshot(),full.snapshot(),'Queue, XP, rewards, seats and seeded RNG are unchanged by a censored game');
assert.throws(()=>createHarness(seed,settings,{...harness,schema:99}),/Incompatible/);
assert.throws(()=>createHarness(seed,settings,{...harness,fingerprint:'changed-source'}),/Incompatible/);
console.log('Arena simulation resume passed: production move-selector parity, exact midgame recovery, no fabricated cap draws, and source/schema guards');
