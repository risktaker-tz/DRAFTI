'use strict';
// Execute the production arena/ladder functions, not a rewritten simulation of
// their rules. The DOM, sound and persistence boundaries are harmless stubs.
const fs=require('fs'),path=require('path'),vm=require('vm');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
function createHarness(seed=0xD4AF71){
  let rng=seed>>>0;
  const math=Object.create(Math);math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  const saves={};
  const context={IVORY:1,EBONY:-1,Math:math,
    settings:{arenaRounds:1,aivaiAuto:true},G:{mode:'aivai'},
    loadJSON:(_key,fallback)=>fallback,saveJSON:(key,value)=>{saves[key]=JSON.parse(JSON.stringify(value));},
    setTimeout:()=>0,SFX_BANK:{play(){}},console};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/engine.js'),'utf8'),context);
  const E=vm.runInContext('makeEngine()',context);context.E=E;
  const slice=(a,b)=>{const start=ui.indexOf(a),end=ui.indexOf(b,start);if(start<0||end<0)throw Error('Production harness boundary missing: '+a);return ui.slice(start,end);};
  vm.runInContext(slice('  const LEVELS =','  const FLAG_COLORS ='),context);
  vm.runInContext(slice("  const ARENA_KEY =",'  // the name chips:'),context);
  vm.runInContext(slice('  function levelOpts(','  function runSearch('),context);
  vm.runInContext(slice('  let manualRetire =','  // the retirement ceremony:'),context);
  vm.runInContext('this.api={ROSTER,STYLES,LEVELS,LEVEL_IDS,rosterLevel,levelOpts,chooseLadderMove,searchLevelForSide,arenaPressureOpts,arenaSeatLevels,seatArenaBout,guardArena,ladderQueue,applyArenaResult,stageOfBout,arena,arenaProgress}; this.aiName=id=>rosterById(id).name;',context);
  return {E,G:context.G,settings:context.settings,api:context.api,saves,random:math.random};
}
function playGame(h,{rsId='american',styles,levels,maxPlies=360}={}){
  const {E,G,api}=h,rs=E.RULESETS[rsId];let board=E.setupBoard(rs),side=rs.firstSide,noProgress=0;
  const seen=new Map();let nodes=0,deepest=0;
  for(let ply=0;ply<maxPlies;ply++){
    const legal=E.legalMoves(rs,board,side);
    if(!legal.length)return {winner:-side,plies:ply,nodes,deepest,reason:'no legal moves'};
    const key=board.join(',')+'|'+side,visits=(seen.get(key)||0)+1;seen.set(key,visits);
    if(visits>=3||noProgress>=rs.drawPlies)return {winner:0,plies:ply,nodes,deepest,reason:visits>=3?'threefold repetition':'move limit'};
    G.side=side;
    const index=side===E.IVORY?0:1,levelId=levels?levels[index]:api.searchLevelForSide();
    const style=styles?styles[index]:api.STYLES.find(s=>s.id===api.ROSTER.find(r=>r.id===(index===0?G.seatIvory:G.seatEbony)).styleId);
    const opts=api.arenaPressureOpts(api.levelOpts(levelId,style).opts);
    if(opts.weights)opts.weights.for=side;
    opts.noProgress=noProgress;
    const result=E.search(rs,board,side,opts);
    const move=api.chooseLadderMove(result,legal,levelId);
    if(!move)throw Error('Production ladder returned no legal move');
    nodes+=result.nodes;deepest=Math.max(deepest,result.depth);
    noProgress=E.nextNoProgress(rs,board,move,side,noProgress);
    board=E.applyMove(rs,board,move,side);side=-side;
  }
  return {winner:0,plies:maxPlies,nodes,deepest,reason:'simulation safety cap'};
}
module.exports={createHarness,playGame};
