'use strict';
// Execute the production arena/ladder functions, not a rewritten simulation of
// their rules. The DOM, sound and persistence boundaries are harmless stubs.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
function createHarness(seed=0xD4AF71,savedSettings={},checkpoint=null){
  let rng=seed>>>0;
  const math=Object.create(Math);math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  const saves={};
  const context={IVORY:1,EBONY:-1,Math:math,
    settings:Object.assign({arenaRounds:1,aivaiAuto:true},savedSettings),G:{mode:'aivai'},
    loadJSON:(_key,fallback)=>fallback,saveJSON:(key,value,extra)=>{for(const [k,v]of Object.entries({[key]:value,...extra}))saves[k]=JSON.parse(JSON.stringify(v));},
    setTimeout:()=>0,SFX_BANK:{play(){}},console};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/engine.js'),'utf8'),context);
  const E=vm.runInContext('makeEngine()',context);context.E=E;
  const slice=(a,b)=>{const start=ui.indexOf(a),end=ui.indexOf(b,start);if(start<0||end<0)throw Error('Production harness boundary missing: '+a);return ui.slice(start,end);};
  vm.runInContext(slice('function createMistakeMemory(saved) {','function createPlayerProgressStore('),context);
  context.mistakeMemory=context.createMistakeMemory(null);
  vm.runInContext(slice('  const LEVELS =','  const FLAG_COLORS ='),context);
  vm.runInContext(slice("  const ARENA_KEY =",'  // the name chips:'),context);
  vm.runInContext(slice('  function levelOpts(','  function chooseLadderMove('),context);
  context.posKey=(board,side)=>board.join(',')+'|'+side;
  vm.runInContext(slice('  const learningActor=','  // ---------------- sound'),context);
  vm.runInContext(slice('  function chooseLadderMove(','  function runSearch('),context);
  vm.runInContext(slice('  let manualRetire =','  // the retirement ceremony:'),context);
  vm.runInContext(slice('  function lowMaterialLimit(','  function checkGameEnd('),context);
  vm.runInContext('this.api={ROSTER,STYLES,LEVELS,LEVEL_IDS,rosterLevel,levelOpts,chooseLadderMove,searchLevelForSide,arenaPressureOpts,arenaSeatLevels,rememberResumedPairColours,seatArenaBout,guardArena,ladderQueue,applyArenaResult,stageOfBout,arena,arenaProgress,seasonHonours}; this.aiName=id=>rosterById(id).name;',context);
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({
    engine:fs.readFileSync(path.join(__dirname,'../src/engine.js'),'utf8').replace(/\r\n/g,'\n'),
    levels:context.api.LEVELS,styles:context.api.STYLES,roster:context.api.ROSTER,
    simulator:playGame.toString(),
    functions:[...Object.values(context.api).filter(v=>typeof v==='function'),context.chooseRememberedMove,context.chooseCycleEscape,
      context.lowMaterialCountdown,context.lowMaterialLimit,context.possibleWinWithinMoves,context.createSeasonHonours].map(f=>f.toString())
  })).digest('hex');
  if(checkpoint){
    if(checkpoint.schema!==1||checkpoint.fingerprint!==fingerprint)throw Error('Incompatible arena checkpoint; preserve it and investigate source drift');
    for(const [target,value] of [[context.api.arena,checkpoint.arena],[context.api.arenaProgress,checkpoint.arenaProgress]]){
      for(const key of Object.keys(target))delete target[key];Object.assign(target,JSON.parse(JSON.stringify(value)));
    }
    Object.assign(context.G,checkpoint.G);Object.assign(context.settings,checkpoint.settings);context.api.seasonHonours.restore(checkpoint.seasonHonours);rng=checkpoint.rng>>>0;
  }
  const snapshot=()=>JSON.parse(JSON.stringify({schema:1,fingerprint,rng,settings:context.settings,G:context.G,arena:context.api.arena,arenaProgress:context.api.arenaProgress,seasonHonours:context.api.seasonHonours.snapshot()}));
  return {E,G:context.G,settings:context.settings,api:context.api,saves,random:math.random,snapshot,fingerprint,
    lowMaterialCountdown:context.lowMaterialCountdown,chooseMove:context.chooseRememberedMove};
}
function playGame(h,{rsId='american',styles,levels,maxPlies=360,checkpoint=null,onProgress=null,houseDraws=false}={}){
  const {E,G,api}=h,rs=E.RULESETS[rsId];let board=checkpoint?Int8Array.from(checkpoint.board):E.setupBoard(rs),side=checkpoint?checkpoint.side:rs.firstSide,noProgress=checkpoint?checkpoint.noProgress:0;
  const seen=new Map(checkpoint?.seen||[]),history=checkpoint?.history||[];let nodes=checkpoint?.nodes||0,deepest=checkpoint?.deepest||0;
  for(let ply=checkpoint?.ply||0;ply<maxPlies;ply++){
    const legal=E.legalMoves(rs,board,side);
    if(!legal.length)return {winner:-side,plies:ply,nodes,deepest,reason:'no legal moves'};
    const key=board.join(',')+'|'+side,visits=(seen.get(key)||0)+1;seen.set(key,visits);
    const standardDrawDue=visits>=3||noProgress>=rs.drawPlies;
    if(!houseDraws&&standardDrawDue)return {winner:0,plies:ply,nodes,deepest,reason:visits>=3?'threefold repetition':'move limit'};
    if(houseDraws){const end=h.lowMaterialCountdown(board,history,legal,{rs,side,forceCheck:standardDrawDue});
      if(end&&!end.scoringNext&&!end.winningNext&&!end.analysisLimited&&(end.remaining<=0||standardDrawDue))return {winner:0,plies:ply,nodes,deepest,reason:'protected low-material house draw'};}
    G.rs=rs;G.rsId=rsId;G.board=board;G.side=side;G.repMap=seen;
    const index=side===E.IVORY?0:1,levelId=levels?levels[index]:api.searchLevelForSide();
    const style=styles?styles[index]:api.STYLES.find(s=>s.id===api.ROSTER.find(r=>r.id===(index===0?G.seatIvory:G.seatEbony)).styleId);
    const opts=api.arenaPressureOpts(api.levelOpts(levelId,style).opts);
    if(opts.weights)opts.weights.for=side;
    // The live UI owns its protected house-draw checks; its worker starts
    // searches without an automatic draw counter. Keep that same boundary.
    opts.noProgress=houseDraws?0:noProgress;
    const result=E.search(rs,board,side,opts);
    const move=h.chooseMove(result,legal,levelId);
    if(!move)throw Error('Production ladder returned no legal move');
    nodes+=result.nodes;deepest=Math.max(deepest,result.depth);
    noProgress=E.nextNoProgress(rs,board,move,side,noProgress);
    history.push({boardBefore:Array.from(board),move,side});
    board=E.applyMove(rs,board,move,side);side=-side;
    if(onProgress)onProgress({ply:ply+1,board:Array.from(board),side,noProgress,seen:[...seen],nodes,deepest,history});
  }
  return {winner:null,unresolved:true,plies:maxPlies,nodes,deepest,reason:'simulation safety cap; no game result assigned'};
}
module.exports={createHarness,playGame};
