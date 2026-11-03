'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),{execFileSync}=require('child_process');
const {createHarness,playGame}=require('./arena_harness');
const root=path.resolve(__dirname,'..'),docs=path.join(root,'docs');
const checkpointPath=path.join(docs,'arena-fairness-resume.json'),lockPath=checkpointPath+'.lock';
const writeJSON=(file,data)=>{
  const temp=file+'.'+process.pid+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n');
  for(let attempt=0;attempt<20;attempt++){
    try{fs.renameSync(temp,file);return;}
    catch(error){if(!['EPERM','EBUSY'].includes(error.code)||attempt===19)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}
  }
};
if(fs.existsSync(lockPath)){
  const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));let alive=true;
  try{process.kill(lock.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}
  if(alive)throw Error('Arena simulation already running as process '+lock.pid+'; inspect it instead of restarting');
  fs.unlinkSync(lockPath);
}
fs.writeFileSync(lockPath,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}),{flag:'wx'});
try {
  let state=fs.existsSync(checkpointPath)?JSON.parse(fs.readFileSync(checkpointPath,'utf8')):null;
  if(state&&state.schema!==2)throw Error('Unknown simulation checkpoint schema; do not overwrite it');
  const h=createHarness(0xD4AF71,{diff:'l1'},state?.harness),{api,G}=h;
  const median=()=>{const levels=api.ROSTER.map(r=>api.rosterLevel(r.id)).sort((a,b)=>a-b);return(levels[96]+levels[97])/2;};
  if(!state){
    const legacy=path.join(docs,'arena-fairness-progress.json'),archive=path.join(docs,'arena-fairness-interrupted-33.json');
    if(fs.existsSync(legacy)&&!fs.existsSync(archive))fs.copyFileSync(legacy,archive);
    state={schema:2,seed:'0xD4AF71',startedAt:new Date().toISOString(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),rows:[],growth:[{season:1,medianLevel:median()}],played:{},wins:{},openers:[],dethronings:0,inFlight:null};
  }
  const save=()=>{state.harness=h.snapshot();state.updatedAt=new Date().toISOString();writeJSON(checkpointPath,state);};
  console.log('Arena process '+process.pid+': resume at bout '+(state.rows.length+1)+'/36'+(state.inFlight?' ply '+state.inFlight.game?.ply:''));
  save();
  while(state.rows.length<36){
    if(!state.inFlight){
      api.seatArenaBout();
      if(api.arena.bouts===0)state.openers.push({season:api.arena.season,champion:api.arena.champion,challenger:api.arena.queue[0]});
      state.inFlight={before:api.arena.champion,season:api.arena.season,stage:api.stageOfBout(api.arena.bouts),game:null};save();
    }
    const active=state.inFlight;
    const result=playGame(h,{checkpoint:active.game,houseDraws:true,onProgress:game=>{active.game=game;save();}});
    const winner=result.winner===1?G.seatIvory:result.winner===-1?G.seatEbony:null;
    for(const id of [G.seatIvory,G.seatEbony])state.played[id]=(state.played[id]||0)+1;
    if(winner)state.wins[winner]=(state.wins[winner]||0)+1;
    state.rows.push({bout:state.rows.length+1,season:active.season,stage:active.stage,ivory:G.seatIvory,ebony:G.seatEbony,levels:[G.diffIvory,G.diffEbony],...result,winnerId:winner});
    api.applyArenaResult(result.winner);
    if(active.before!==api.arena.champion)state.dethronings++;
    if(api.arena.bouts===0)state.growth.push({season:api.arena.season,medianLevel:median()});
    state.inFlight=null;save();
    const row=state.rows.at(-1);
    console.log('Bout '+row.bout+'/36: '+row.ivory+' vs '+row.ebony+' -> '+(winner||'draw')+' ('+result.plies+' plies, '+result.nodes+' nodes)');
    writeJSON(path.join(docs,'arena-fairness-progress.json'),{completedBouts:state.rows.length,rows:state.rows,growth:state.growth,checkpoint:checkpointPath});
  }
  const nations=api.ROSTER.map(r=>({id:r.id,name:r.name,played:state.played[r.id]||0,wins:state.wins[r.id]||0,level:api.rosterLevel(r.id),xp:api.arena.xp[r.id],bonusXp:api.arenaProgress.bonusXp[r.id]||0}));
  const report={seed:state.seed,sourceCommit:state.sourceCommit,sourceFingerprint:h.fingerprint,startedAt:state.startedAt,completedAt:new Date().toISOString(),
    engine:'Production engine, ladder, national styles, symmetric seat levels, stage pressure, queue and result functions. Baseline l1; normal XP/season growth; production low-material house countdowns active. Search budgets unchanged. Presentation delays omitted.',
    bouts:state.rows,openers:state.openers,dethronings:state.dethronings,growth:state.growth,nations,
    interpretation:'Winner-stays scheduling intentionally yields unequal appearances. This 36-bout sample tests scheduling/progression and observed dethroning, not equal national win probabilities. Style balance has a separate colour-paired round robin. Exact-position mistake recall is outside this sample and has separate worker/persistence tests.'};
  writeJSON(path.join(docs,'arena-fairness.json'),report);
  const md='# Real-engine arena simulation\n\n'+report.engine+'\n\n'+report.interpretation+'\n\nSource commit: '+report.sourceCommit+'; kernel SHA256 '+report.sourceFingerprint+'.\n\nDethronings: '+report.dethronings+'.\n\n| Season start | Median roster level |\n| --- | --- |\n'+report.growth.map(r=>'| '+r.season+' | '+r.medianLevel+' |').join('\n')+'\n\n| Nation | Bouts | Wins | Level | XP | Stage / retention bonus XP |\n| --- | --- | --- | --- | --- | --- |\n'+nations.map(r=>'| '+r.id+' '+r.name+' | '+r.played+' | '+r.wins+' | '+r.level+' | '+r.xp+' | '+r.bonusXp+' |').join('\n')+'\n';
  fs.writeFileSync(path.join(docs,'arena-fairness.md'),md);
  assert(report.dethronings>0,'No dethroning observed; investigate rather than forcing an outcome');
  assert(report.growth.every((r,i)=>!i||r.medianLevel>report.growth[i-1].medianLevel),'Median level must rise each season');
  assert(new Set(report.openers.slice(1).map(r=>r.challenger)).size===2,'Later-season opening honours must rotate in this sample');
  state.completedAt=report.completedAt;save();
  console.log('COMPLETE: 36 real-engine bouts, '+report.dethronings+' dethronings; growth '+report.growth.map(r=>r.medianLevel).join(' -> '));
} finally {
  if(fs.existsSync(lockPath)&&JSON.parse(fs.readFileSync(lockPath,'utf8')).pid===process.pid)fs.unlinkSync(lockPath);
}
