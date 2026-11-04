'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const c={performance:{now:()=>0}};vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/cinematic_director.js'),'utf8'),c);
const move={from:17,path:[17,35,53],caps:[26,44],promotes:false};
const data={verdict:{delta:0,playedScore:200,preBest:200,bestOther:20},move,ply:8};
const state={ply:8,phase:'thinking',over:false};
assert(c.assessCinematicMove(data,state).significant);
for(const [name,d,s]of [
  ['stale',data,{...state,ply:9}],['animating',data,{...state,phase:'animating'}],
  ['ended',data,{...state,over:true}],['forced',{...data,verdict:{...data.verdict,onlyMove:true}},state],
  ['bad shot',{...data,verdict:{...data.verdict,delta:220}},state],
  ['ordinary quiet',{...data,move:{...move,caps:[]},verdict:{delta:0,playedScore:0,preBest:0,bestOther:0}},state],
  ['missing scores',{...data,verdict:{}},state],
])assert.equal(c.assessCinematicMove(d,s).intelligent,false,name);
let time=0;const director=c.createCinematicDirector({now:()=>time});
for(let ply=0;ply<100;ply++){
  time+=1000;
  const quiet={moment:'land',captures:0,ply};
  assert.equal(director.allow('b1',quiet),false,'No edge on ordinary moves');
  assert.equal(director.allow('b2',quiet),false,'No ripple without analysis');
  assert.equal(director.allow('b3',{moment:'capture',captures:1}),false,'No crack on single captures');
}
const quality={moment:'quality',intelligent:true,significant:true,ply:8};
assert(director.allow('b1',quality));time+=23000;
assert.equal(director.allow('b1',{...quality,ply:9}),false,'Six plies between edge signatures');
assert(director.allow('b1',{...quality,ply:14}));time+=23000;
assert.equal(director.allow('b1',{...quality,ply:25}),false,'Only two edges per game');
director.resetGame();assert(director.allow('b1',{...quality,ply:2}));
director.resetGame();assert.equal(director.allow('b1',{...quality,ply:2}),false,'Rapid new bouts keep cooldown');
const examples={
  b1:quality,b2:quality,b3:{moment:'capture',captures:2},b4:{moment:'move',captures:2},
  b5:{moment:'comeback'},b6:{moment:'move',move:{promotes:true}},b7:{moment:'doom',verified:true},b8:quality,
  b9:{moment:'win'},b10:{moment:'draw'},p1:{moment:'capture'},p2:{moment:'move',king:true,distance:4},
  p3:quality,p4:{moment:'capture',captures:3},p5:{moment:'promotion'},p6:{moment:'win'},
  p7:{moment:'threat',criticalThreat:true},p8:{moment:'hint'},p9:{moment:'relief',verified:true},
  p10:{moment:'move',king:true,distance:5},a1:{moment:'doom',verified:true},a2:{moment:'capture',captures:2},
  a3:{moment:'interaction',boardInteraction:true},a4:{moment:'deliberation',quietMs:2200},
  a5:{moment:'stage',stageChanged:true},a6:{moment:'comeback'},a7:{moment:'promotion'},a8:{moment:'win'},
  a9:{moment:'draw'},a10:{moment:'intermission',countdownVisible:true},
};
assert.equal(Object.keys(examples).length,30);
for(const [id,example]of Object.entries(examples)){
  const d=c.createCinematicDirector({now:()=>time});
  assert.equal(d.allow(id,{moment:'nothing'}),false,id+' refuses unrelated moments');
  assert(d.allow(id,example),id+' actual occasion');
  assert.equal(d.allow(id,example),false,id+' cooldown');
  const before=JSON.stringify(d.inspect());assert(d.allow(id,{},true),id+' explicit studio demo');
  assert.equal(JSON.stringify(d.inspect()),before,'Demos never consume gameplay allowances');
}
const competing=c.createCinematicDirector({now:()=>time});
assert(competing.allow('b3',examples.b3));assert.equal(competing.allow('b2',quality),false,'Ripple cannot cover fresh fracture');
assert(competing.allow('a2',examples.a2));assert(competing.allow('a8',examples.a8),'Win replaces crowd wash');
assert.equal(competing.allow('a7',examples.a7),false,'Crown cannot overwhelm celebration');
console.log('PASS all 30 occasion gates, stale/bad/forced verdict rejection, rare edge quota, cooldown continuity and visual priority');
