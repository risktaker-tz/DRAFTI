'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const E=require('../src/engine')(),ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const source=ui.slice(ui.indexOf('  function clearSel()'),ui.indexOf('  function installBoardGestures('));
function input(rs,board,legal){
  const committed=[],sounds=[],messages=[];
  const G={rs,board,side:1,mode:'hotseat',phase:'idle',sel:null,legal};
  const c={G,Math,humanTurn:()=>true,renderHighlights(){},FX:{ensure(){},play:id=>sounds.push(id)},
    SFX_BANK:{play(){}},setTimeout(){},flashWhisper:text=>messages.push(text),executeMove:move=>committed.push(move)};
  vm.createContext(c);vm.runInContext(source+'this.tap=onSquareClick;',c);return {G,tap:c.tap,committed,sounds,messages};
}
for(const [id,rs] of Object.entries(E.RULESETS)){
 const n=rs.n,board=Array(n*n).fill(0),from=6*n+1;board[from]=1;
 for(const [r,c]of [[5,2],[3,4],[1,6]])board[r*n+c]=-1;
 const legal=E.legalMoves(rs,board,1);assert.equal(legal.length,1);assert.equal(legal[0].caps.length,3);
 const direct=input(rs,board,legal);direct.tap(from);direct.tap(7);
 assert.equal(direct.committed.length,1,id+' final landing commits one complete move');
 assert.strictEqual(direct.committed[0],legal[0],id+' uses the exact engine-generated route');
 const result=E.applyMove(rs,board,direct.committed[0],1);assert.equal(result.filter(p=>p<0).length,0,id+' all three victims are captured');assert.equal(result[7],2,id+' promotion survives the shortcut');
 const stepped=input(rs,board,legal);stepped.tap(from);stepped.tap(legal[0].path[1]);assert.equal(stepped.committed.length,0,id+' intermediate selection remains available');stepped.tap(7);assert.equal(stepped.committed.length,1,id+' partial selection can finish by destination');
 const illegal=input(rs,board,legal);illegal.tap(from);illegal.tap(n*n-1);assert.equal(illegal.committed.length,0);assert(illegal.sounds.includes('illegal'),id+' invalid destinations stay rejected');
 const locked=input(rs,board,legal);locked.G.phase='animating';locked.tap(from);locked.tap(7);assert.equal(locked.committed.length,0,id+' animation cannot double-submit');
}
// Two real king capture circuits share their final (starting) square. Choosing
// one intermediate landing identifies the route before the final-square tap.
const rs=E.RULESETS.american,n=rs.n,board=Array(64).fill(0),from=4*n+3;board[from]=2;
for(const [r,c]of [[3,4],[3,6],[5,6],[5,4]])board[r*n+c]=-1;
const legal=E.legalMoves(rs,board,1),circuits=legal.filter(m=>m.path.at(-1)===from);
assert(circuits.length>=2,'Fixture really has ambiguous complete king circuits');
const loop=input(rs,board,legal);loop.tap(from);loop.tap(circuits[0].path[1]);loop.tap(from);assert.equal(loop.committed.length,1,'A chosen king circuit can finish back on its starting square');assert.equal(loop.committed[0].caps.length,4);
// Explicit ambiguous final destination must not silently choose a route.
const a={from:49,path:[49,35,21,7],caps:[42,28,14]},b={from:49,path:[49,33,19,7],caps:[40,26,12]};
const ambiguousBoard=Array(64).fill(0);ambiguousBoard[49]=1;
const ambiguous=input(rs,ambiguousBoard,[a,b]);ambiguous.tap(49);ambiguous.tap(7);assert.equal(ambiguous.committed.length,0);assert.equal(ambiguous.messages.length,1);assert(ambiguous.G.sel,'Ambiguous destination keeps selection for route choice');
ambiguous.tap(35);ambiguous.tap(7);assert.strictEqual(ambiguous.committed[0],a);
const modalElements={backdrop:{classList:{add(){},remove(){}}},modalConfirm:{hidden:true},modalStats:{hidden:true},modalGameOver:{hidden:true}};
let menuClosed=false;const modalContext={$:id=>modalElements[id],closeMenu:()=>menuClosed=true};
vm.runInNewContext(ui.slice(ui.indexOf('  function openModal('),ui.indexOf('  function confirmIfNeeded(')),modalContext);
modalContext.openModal('modalConfirm');assert(menuClosed,'A confirmation closes the covering drawer');assert(!modalElements.modalConfirm.hidden);assert(modalElements.modalStats.hidden);
console.log('Capture destination passed: all five rulesets, three victims, promotion, partial routes, invalid clicks, double-submit and ambiguous king circuits');
