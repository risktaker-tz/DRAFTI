'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8'),c={};
vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'src/engine.js'),'utf8')+'this.E=makeEngine();',c);
vm.runInContext(ui.slice(ui.indexOf('  function restoreLeaguePosition('),ui.indexOf('  function resumeLeagueMatch(')),c);
for(const rs of Object.values(c.E.RULESETS)){
  let board=c.E.setupBoard(rs),side=rs.firstSide;const history=[];
  for(let ply=0;ply<25;ply++){
    const legal=c.E.legalMoves(rs,board,side);if(!legal.length)break;
    const move=legal[ply%legal.length];history.push({move,notation:'untrusted <img>',boardBefore:[]});
    board=c.E.applyMove(rs,board,move,side);side=-side;
  }
  const saved={schema:1,rsId:rs.id,history,board:Array.from(board),side};
  const restored=c.restoreLeaguePosition(saved);assert(restored,rs.id+' resumes');
  assert.deepEqual(Array.from(restored.board),saved.board);assert.equal(restored.side,side);assert.equal(restored.history.length,history.length);
  assert(restored.history.every(h=>!h.notation.includes('<')),'Notation is regenerated from legal moves');
  assert(restored.history.every(h=>h.boardBefore.length===rs.n*rs.n));
  const wrong=JSON.parse(JSON.stringify(saved));wrong.board[0]=wrong.board[0]===1?-1:1;assert.equal(c.restoreLeaguePosition(wrong),null,'Tampered final position rejected');
  const illegal=JSON.parse(JSON.stringify(saved));illegal.history[0].move.from=-1;assert.equal(c.restoreLeaguePosition(illegal),null,'Illegal saved route rejected');
}
assert.equal(c.restoreLeaguePosition({schema:9}),null);
console.log('League resume passed: all five real rulesets, exact board/turn recovery, regenerated history/repetition and corrupted-save rejection');
