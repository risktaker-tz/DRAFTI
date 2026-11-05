'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8'),{createHarness}=require('../scripts/arena_harness');
const h=createHarness(),math=Object.create(Math);math.random=()=>.99;
const c={IVORY:1,Math:math,LEVELS:h.api.LEVELS,G:{mode:'aivai',side:1,rsId:'american',seatIvory:'TZ',seatEbony:'KE'},settings:{aivaiAuto:true},styleForSide:()=>({id:'classic'})};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('function createMistakeMemory('),ui.indexOf('function createPlayerProgressStore(')),c);
c.mistakeMemory=c.createMistakeMemory(null);
vm.runInContext(ui.slice(ui.indexOf('  const learningActor='),ui.indexOf('  // ---------------- sound'))+'this.actor=learningActor;this.position=learningPosition;this.route=learningRoute;',c);
vm.runInContext(ui.slice(ui.indexOf('  function chooseLadderMove('),ui.indexOf('  function runSearch(')),c);
const E=h.E,rs=E.RULESETS.american;c.E=E;c.G.board=E.setupBoard(rs);const legal=E.legalMoves(rs,c.G.board,1);
// If the draw guard deliberately keeps a four-piece endgame alive, the AI
// must still escape a near-equal route that returns to an earlier position.
c.G.rs=rs;c.G.side=1;c.G.repMap=new Map();c.posKey=(board,side)=>Array.from(board).join(',')+'|'+side;
const cycleBoard=E.applyMove(rs,c.G.board,legal[0],1),cycleKey=c.posKey(cycleBoard,-1);
c.G.repMap.set(cycleKey,1);c.mistakeMemory=c.createMistakeMemory(null);
const cycleScores=legal.map((m,i)=>({m,score:i===0?100:i===1?70:-500}));
const cycleResult={best:legal[0],depth:6,rootScores:cycleScores};
assert.equal(c.chooseRememberedMove(cycleResult,legal,'l10').path.join(),legal[1].path.join(),
  'A near-equal legal route escapes a repeated position');
const costlyResult={best:legal[0],depth:6,rootScores:legal.map((m,i)=>({m,score:i===0?100:i===1?40:-500}))};
assert.equal(c.chooseRememberedMove(costlyResult,legal,'l10').path.join(),legal[0].path.join(),
  'A repeated best move remains when every fresh route costs more than the safety margin');
c.G.repMap.set(cycleKey,2);
assert.equal(c.chooseRememberedMove(costlyResult,legal,'l10').path.join(),legal[1].path.join(),
  'The escape margin widens only after a protected cycle repeats again');
const edgeResult={best:legal[0],depth:8,rootScores:legal.map((m,i)=>({m,score:i===0?1200:i===1?100:-1000}))};
assert.equal(c.chooseRememberedMove(edgeResult,legal,'l10').path.join(),legal[0].path.join(),
  'Cycle handling preserves a clearly stronger line and never forces a game result');
c.G.repMap=new Map(legal.map(m=>[c.posKey(E.applyMove(rs,c.G.board,m,1),-1),1]));
assert.equal(c.chooseRememberedMove(cycleResult,legal,'l10').path.join(),legal[0].path.join(),
  'The AI keeps its best move when every legal result repeats');
c.G.repMap.clear();
// The escape check must follow whichever rules and board size are active;
// do not assume a fixed initial piece count or square count.
for (const activeRules of Object.values(E.RULESETS)) {
  const activeBoard=E.setupBoard(activeRules),activeLegal=E.legalMoves(activeRules,activeBoard,1);
  if (activeLegal.length<2) continue;
  c.G.rs=activeRules;c.G.rsId=activeRules.id;c.G.board=activeBoard;c.G.side=1;c.G.repMap=new Map();
  const repeatedKey=c.posKey(E.applyMove(activeRules,activeBoard,activeLegal[0],1),-1);
  c.G.repMap.set(repeatedKey,1);
  const repeated=move=>c.G.repMap.get(c.posKey(E.applyMove(activeRules,activeBoard,move,1),-1))||0;
  const result={best:activeLegal[0],depth:6,rootScores:activeLegal.map((m,i)=>({m,score:i===0?100:i===1?70:-1000}))};
  const escaped=c.chooseCycleEscape(activeLegal[0],result,activeLegal,'l10',repeated);
  assert(activeLegal.some(m=>m.from===escaped.from&&m.path.join()===escaped.path.join()),
    `${activeRules.id}: escape remains legal under the selected rules`);
  assert.notEqual(escaped.path.join(),activeLegal[0].path.join(),
    `${activeRules.id}: avoids a repeated route using the selected rules`);
  assert.equal(repeated(escaped),0,`${activeRules.id}: chosen route is a fresh result position`);
}
c.G.rs=rs;c.G.rsId=rs.id;c.G.board=E.setupBoard(rs);c.G.side=1;c.G.repMap.clear();
const position=c.position(rs.id,c.G.board,1),route=c.route(legal[0],1,c.G.board.length);
assert(!c.mistakeMemory.remember('nation:TZ',position,route,{delta:500,depth:6,onlyMove:true}),'Forced moves are not mistakes');
assert(!c.mistakeMemory.remember('nation:TZ',position,route,{delta:50,depth:6}));
assert(!c.mistakeMemory.remember('nation:TZ',position,route,{delta:500,depth:1}),'Shallow evidence is ignored');
assert(c.mistakeMemory.remember('nation:TZ',position,route,{delta:300,depth:4}));
const result={best:legal[0],depth:4,rootScores:legal.map((m,i)=>({m,score:i?0:300}))};
assert.notEqual(c.chooseRememberedMove(result,legal,'l1').path.join(),legal[0].path.join(),'A verified previous mistake is avoided at the beginner rung');
assert.notEqual(c.chooseRememberedMove(result,legal,'l7').path.join(),legal[0].path.join(),'The remembered lesson survives a higher selected level');
assert.equal(c.chooseRememberedMove({...result,depth:9},legal,'l7').path.join(),legal[0].path.join(),'Substantially deeper fresh analysis can supersede an old shallow lesson');
c.G.seatIvory='KE';assert.equal(c.chooseRememberedMove(result,legal,'l7').path.join(),legal[0].path.join(),'Lessons belong to the actual engine, without country-specific preferences');
const snapshot=c.mistakeMemory.snapshot();c.mistakeMemory=c.createMistakeMemory(snapshot);assert(c.mistakeMemory.avoid('nation:TZ',position,route,4),'Lesson survives reload');
const mirrored=Array.from(c.G.board).reverse().map(p=>-p);assert.equal(c.position(rs.id,mirrored,-1),position,'Position memory follows the player when colours alternate');
assert.equal(c.route({path:legal[0].path.map(i=>c.G.board.length-1-i)},-1,c.G.board.length),route);
for(let i=0;i<600;i++)c.mistakeMemory.remember('nation:KE','position'+i,'route'+i,{delta:200,depth:4});
assert.equal(c.mistakeMemory.count(),512,'Memory remains bounded');
assert(!c.createMistakeMemory({schema:2}).remember('x','p','r',{delta:300,depth:4}),'Unknown future learning schema is protected');
console.log('AI learning and cycle escape passed: verified mistakes, persisted country-neutral lessons, bounded memory, near-equal repetition escapes and stronger-route protection');
