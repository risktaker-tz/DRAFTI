'use strict';
const assert=require('assert'),{createHarness,playGame}=require('../scripts/arena_harness');
const seed=1234,settings={diff:'l1'};
const full=createHarness(seed,settings);full.api.seatArenaBout();
const expected=playGame(full,{maxPlies:8,houseDraws:true});full.api.applyArenaResult(expected.winner);
const interrupted=createHarness(seed,settings);interrupted.api.seatArenaBout();let game,harness;
assert.throws(()=>playGame(interrupted,{maxPlies:8,houseDraws:true,onProgress:state=>{
  if(state.ply===5){game=JSON.parse(JSON.stringify(state));harness=interrupted.snapshot();throw Error('intentional checkpoint boundary');}
}}),/intentional checkpoint boundary/);
assert.equal(game.ply,5);
const resumed=createHarness(seed,settings,harness);
const actual=playGame(resumed,{maxPlies:8,houseDraws:true,checkpoint:game});resumed.api.applyArenaResult(actual.winner);
assert.deepEqual(actual,expected,'A real-engine midgame resume preserves result, move/node counters and completed depth');
assert.deepEqual(resumed.snapshot(),full.snapshot(),'Queue, XP, rewards, seats and seeded RNG resume without duplicate progress');
full.api.seatArenaBout();resumed.api.seatArenaBout();
assert.deepEqual(resumed.snapshot(),full.snapshot(),'The next bout and future random queue order also agree');
assert.throws(()=>createHarness(seed,settings,{...harness,schema:99}),/Incompatible/);
assert.throws(()=>createHarness(seed,settings,{...harness,fingerprint:'changed-source'}),/Incompatible/);
console.log('Arena simulation resume passed: actual engine midgame recovery, exact RNG/queue/XP/reward state, next-bout continuity and source/schema guards');
