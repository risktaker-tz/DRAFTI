'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),{execFileSync}=require('child_process');
const root=path.join(__dirname,'..'),makeEngine=require('../src/engine'),E=makeEngine();
for(const [id,baseId,n,men] of [['eastafrica8','brazilian',8,12],['eastafrica10','international',10,20],['eastafrica12','canadian',12,30]]){
  const rs=E.RULESETS[id],base=E.RULESETS[baseId],at=(r,c)=>r*n+c;
  assert.deepEqual(rs,{...base,id,name:'East Africa '+n+'×'+n,menCaptureBack:false},'Only backward capture by men differs from International-family rules');
  const initial=E.setupBoard(rs);assert.equal(initial.filter(p=>p===1).length,men);assert.equal(initial.filter(p=>p===-1).length,men);
  assert.equal(E.legalMoves(rs,initial,rs.firstSide).length,n-1);
  for(const side of [1,-1]){
    const board=new Int8Array(n*n),from=at(4,3),forward=at(3,4),back=at(5,2);
    board[from]=1;board[forward]=-1;board[back]=-1;
    const position=side===1?board:Int8Array.from(Array.from(board).reverse().map(p=>-p));
    const map=i=>side===1?i:n*n-1-i,legal=E.legalMoves(rs,position,side);
    assert(legal.length>0);assert(legal.every(m=>m.caps.length===1&&m.caps[0]===map(forward)),'Men capture forward only for either side');
    const after=E.applyMove(rs,position,legal[0],side);assert.equal(after[map(back)],-side,'An enemy behind the man remains untouched');
    position[map(forward)]=0;
    assert(E.legalMoves(rs,position,side).every(m=>m.caps.length===0),'Backward-only enemy is not a mandatory capture for a man');
    assert(E.legalMoves(base,position,side).some(m=>m.caps.includes(map(back))),'Original International backward capture still exists');
  }
  for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
    const b=new Int8Array(n*n),r=3,c=4,from=at(r,c),enemy=at(r+dr,c+dc);b[from]=2;b[enemy]=-1;
    const moves=E.legalMoves(rs,b,1);
    for(let k=2;r+dr*k>=0&&r+dr*k<n&&c+dc*k>=0&&c+dc*k<n;k++)assert(moves.some(m=>m.caps[0]===enemy&&m.path.at(-1)===at(r+dr*k,c+dc*k)),'Flying king can land at every clear square beyond a victim in every direction');
  }
  const maximum=new Int8Array(n*n);maximum[at(5,2)]=1;maximum[at(4,1)]=-1;maximum[at(4,3)]=-1;maximum[at(2,5)]=-1;
  assert(E.legalMoves(rs,maximum,1).every(m=>m.caps.length===2),'International maximum-capture requirement is retained');
  const crown=new Int8Array(n*n);crown[at(2,1)]=1;crown[at(1,2)]=-1;crown[at(2,5)]=-1;
  const promoted=E.legalMoves(rs,crown,1);assert(promoted.every(m=>m.promotes&&m.caps.length===1),'No Russian-style continuation as a king during crowning');
  const crowned=E.applyMove(rs,crown,promoted[0],1);assert.equal(crowned[at(0,3)],2);
  assert(E.legalMoves(rs,crowned,1).some(m=>m.caps.includes(at(2,5))),'The crowned king may capture backward on its next turn');
}
const old={};vm.createContext(old);vm.runInContext(execFileSync('git',['show','43fa4a7:src/engine.js'],{cwd:root,encoding:'utf8'})+';this.E=makeEngine();',old);
for(const id of ['american','brazilian','international','canadian','russian'])assert.deepEqual(JSON.parse(JSON.stringify(E.RULESETS[id])),JSON.parse(JSON.stringify(old.E.RULESETS[id])),'Protected existing rules unchanged: '+id);
const ui=fs.readFileSync(path.join(root,'src/ui.js'),'utf8'),{createHarness}=require('../scripts/arena_harness'),h=createHarness();
function preferences(saved){const c={E,IVORY:1,LEVELS:h.api.LEVELS,STYLES:h.api.STYLES,localStorage:{getItem:()=>JSON.stringify(saved)}};vm.runInNewContext(ui.slice(ui.indexOf('  const SETTINGS_KEY ='),ui.indexOf('  const PRESENTATION_KEY ='))+';this.settings=settings;',c);return c.settings;}
assert.equal(preferences({}).rsId,'eastafrica8');
assert.equal(preferences({rsId:'american'}).rsId,'american','Existing saved American preference is preserved');
assert.equal(preferences({rsId:'russian'}).rsId,'russian','Other saved rule preferences remain');
assert.equal(preferences({rsId:'american',eastAfricaDefaultV1:true}).rsId,'american','Later explicit American choice remains selectable');
const html=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');const selector=html.slice(html.indexOf('id="segRules"'),html.indexOf('id="segMode"'));
assert(selector.indexOf('eastafrica8')<selector.indexOf('eastafrica10')&&selector.indexOf('eastafrica10')<selector.indexOf('eastafrica12')&&selector.indexOf('eastafrica12')<selector.indexOf('data-v="american"'));
console.log('East Africa rules passed: exact International inheritance except forward-only men, all three sizes, both sides, flying king landings, maximum capture, crowning, fresh default and preserved saved rules');
