'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../src/engine.js'),'utf8');
function run(code,budget){
  let ticks=0;const c={Math,Date:{now:()=>ticks++}};vm.createContext(c);
  vm.runInContext(code+';this.E=makeEngine();',c);
  const E=c.E,rs=E.RULESETS.american,board=E.setupBoard(rs);
  const interrupted=E.search(rs,board,rs.firstSide,{budgetMs:budget,maxDepth:14,jitter:0,fullRootWindow:true});
  assert(interrupted.depth>=1&&interrupted.depth<14,'Fixture interrupts a deeper iteration');
  ticks=0;
  const completed=E.search(rs,board,rs.firstSide,{budgetMs:1e9,maxDepth:interrupted.depth,jitter:0,fullRootWindow:true});
  const exact=new Map(completed.rootScores.map(r=>[r.m.path.join(),r.score]));
  return interrupted.rootScores.every(r=>r.score===exact.get(r.m.path.join()));
}
for(const budget of [3,5,8])assert(run(source,budget),'Every returned root score belongs to the reported completed depth');
// Demonstrate that the fixture catches the previous partially overwritten roots.
const old=source.replace('rootScores: completedRoots || rootMoves.map','rootScores: rootMoves.map');
assert(!run(old,3),'Regression fixture must fail against the previous return behavior');
console.log('Completed-search scores passed: interrupted iterations preserve coherent completed roots; old behavior fails the same fixture');
