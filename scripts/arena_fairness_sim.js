'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {createHarness,playGame}=require('./arena_harness');
const h=createHarness(0xD4AF71),{api,G}=h,rows=[],growth=[],played={},wins={},openers=[];
const median=()=>{const levels=api.ROSTER.map(r=>api.rosterLevel(r.id)).sort((a,b)=>a-b);return (levels[96]+levels[97])/2;};
let dethronings=0;growth.push({season:1,medianLevel:median()});
for(let bout=0;bout<36;bout++){
  api.seatArenaBout();
  if(api.arena.bouts===0)openers.push({season:api.arena.season,champion:api.arena.champion,challenger:api.arena.queue[0]});
  const before=api.arena.champion,season=api.arena.season,stage=api.stageOfBout(api.arena.bouts);
  const result=playGame(h),winner=result.winner===1?G.seatIvory:result.winner===-1?G.seatEbony:null;
  for(const id of [G.seatIvory,G.seatEbony])played[id]=(played[id]||0)+1;
  if(winner)wins[winner]=(wins[winner]||0)+1;
  rows.push({bout:bout+1,season,stage,ivory:G.seatIvory,ebony:G.seatEbony,levels:[G.diffIvory,G.diffEbony],winnerId:winner,...result});
  api.applyArenaResult(result.winner);
  if(before!==api.arena.champion)dethronings++;
  if(api.arena.bouts===0)growth.push({season:api.arena.season,medianLevel:median()});
  console.log('Bout '+(bout+1)+'/36: '+rows.at(-1).ivory+' vs '+rows.at(-1).ebony+' → '+(winner||'draw')+' ('+result.plies+' plies, '+result.nodes+' nodes)');
  // Incremental evidence survives a long run; no fabricated future results.
  fs.writeFileSync(path.join(__dirname,'../docs/arena-fairness-progress.json'),JSON.stringify({completedBouts:rows.length,rows,growth},null,2)+'\n');
}
const nations=api.ROSTER.map(r=>({id:r.id,name:r.name,played:played[r.id]||0,wins:wins[r.id]||0,level:api.rosterLevel(r.id),xp:api.arena.xp[r.id],bonusXp:api.arenaProgress.bonusXp[r.id]||0}));
const report={seed:'0xD4AF71',engine:'Unmodified production engine; production difficulty, styles, seat/queue/result functions and arena budgets; humanlike presentation delays omitted.',bouts:rows,openers,dethronings,growth,nations,
  interpretation:'Winner-stays scheduling intentionally yields unequal appearances. Three seasons are a progression/scheduling exercise, not proof of equal national win probabilities. Style balance is measured separately by the colour-paired round robin.'};
fs.writeFileSync(path.join(__dirname,'../docs/arena-fairness.json'),JSON.stringify(report,null,2)+'\n');
let md='# Real-engine arena simulation\n\n'+report.engine+'\n\n'+report.interpretation+'\n\nDethronings: '+dethronings+'.\n\n| Season start | Median roster level |\n| --- | --- |\n'+growth.map(r=>'| '+r.season+' | '+r.medianLevel+' |').join('\n')+'\n\n| Nation | Bouts | Wins | Level | XP | Stage / retention bonus XP |\n| --- | --- | --- | --- | --- | --- |\n'+nations.map(r=>'| '+r.id+' '+r.name+' | '+r.played+' | '+r.wins+' | '+r.level+' | '+r.xp+' | '+r.bonusXp+' |').join('\n')+'\n';
fs.writeFileSync(path.join(__dirname,'../docs/arena-fairness.md'),md);console.log(md);
assert(dethronings>0,'No champion was dethroned in this sample; investigate, do not force an outcome');
assert(growth.every((row,i)=>!i||row.medianLevel>growth[i-1].medianLevel),'Median level must rise each season');
assert(new Set(openers.slice(1).map(r=>r.challenger)).size===2,'Later-season opening honours must rotate in this sample');
