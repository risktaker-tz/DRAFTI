'use strict';
const assert=require('node:assert/strict');
const {createHarness}=require('../scripts/arena_harness');
const h=createHarness(),{api,G}=h;
let draws=[.74,.2,.5,.1];
const plan=api.createArenaAdvantages('aivai',true,'l4','l8',()=>draws.shift()??.2);
assert.equal(plan.side,1,'The lower-level seat receives any planned advantages');
assert.equal(plan.total,2,'A game receives a random count from zero through three');
assert.equal(plan.used,0);
assert.equal(plan.turns.length,plan.total);
assert(plan.turns.every((turn,i)=>turn>=1&&turn<=32&&(!i||turn>plan.turns[i-1])),'Advantage turns are unique and spread across the game');
for(const [roll,total] of [[0,0],[.249,0],[.25,1],[.5,2],[.75,3],[.999,3]])
  assert.equal(api.createArenaAdvantages('aivai',true,'l4','l8',()=>roll).total,total,'The random game allowance is bounded to zero through three');
assert.equal(api.createArenaAdvantages('aivai',true,'l8','l4',()=>0).side,-1,'The lower-level opposing seat is selected correctly');
assert.equal(JSON.stringify(api.createArenaAdvantages('aivai',true,'l4','l4',()=>.9)),JSON.stringify({side:0,total:0,used:0,turns:[]}),'Equal levels do not create a fake underdog');
assert.equal(api.createArenaAdvantages('ai',true,'l1','l8',()=>.9).total,0,'Human games never receive AI-vs-AI advantages');

Object.assign(G,{mode:'aivai',rs:{firstSide:1},history:[],diffIvory:'l4',diffEbony:'l8',advantage:plan});
assert.equal(api.arenaAdvantageTurn(1,1),false,'The first planned turn is not advanced early');
assert.equal(api.arenaSearchLevelFor(1,3),'l8','The underdog receives the full opposing search on its scheduled turn');
assert.equal(api.arenaSearchLevelFor(-1,2),'l8','The stronger seat keeps its own search level');
G.advantage.used=1;
assert.equal(api.arenaAdvantageTurn(1,3),false,'A used advantage cannot repeat on the same turn');
assert.equal(JSON.stringify(api.validArenaAdvantages(plan)),JSON.stringify(plan),'Saved game advantage count and schedule survive resume');
assert.equal(JSON.stringify(api.validArenaAdvantages({...plan,total:8})),JSON.stringify({side:0,total:0,used:0,turns:[]}),'Invalid saved advantage counts are safely discarded');

const legal=[{from:0,path:[0,1]},{from:2,path:[2,3]},{from:4,path:[4,5]}];
const selected=api.chooseArenaAdvantageMove({rootScores:[
  {m:legal[0],score:100},{m:legal[1],score:72},{m:legal[2],score:-900}
]},legal,()=>.99);
assert.equal(selected,legal[1],'Random advantage routes stay within the stronger search 0.45-pawn equivalence band');
assert.equal(api.chooseArenaAdvantageMove({rootScores:[{m:{from:99,path:[99,1]},score:100}]},legal),null,'An invalid worker route cannot be played');
assert.equal(api.chooseArenaAdvantageMove({rootScores:[{m:legal[0],score:NaN}]},legal),null,'An unscored worker route cannot be played');
const ui=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/ui.js'),'utf8');
assert(ui.includes('res.advantage = !!d.advantage'),'The real search worker returns the advantage decision with its analysis');
assert(ui.includes("flashAdvantage('ADVANTAGE · '"),'Every played advantage gets a dedicated visible notification');
assert(ui.includes('advantage:validArenaAdvantages(G.advantage,G.diffIvory,G.diffEbony)'),'The advantage schedule is persisted with an active match');
console.log('AI arena advantages passed: 0–3 per bout, weaker-side targeting, scheduled stronger-level search, safe near-equal alternatives and resumable state.');
