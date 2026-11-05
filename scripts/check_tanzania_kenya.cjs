'use strict';
const fs=require('fs'),path=require('path'),{createHarness,playGame}=require('./arena_harness');
const out=path.join(__dirname,'../docs/tanzania-kenya-paired-check.json'),rows=[];
for(let pair=0;pair<4;pair++)for(let swap=0;swap<2;swap++){
  const seed=0x7A4E000+pair,h=createHarness(seed,{diff:'l4'});h.settings.aivaiAuto=false;
  const ids=swap?['KE','TZ']:['TZ','KE'];
  const styles=ids.map(id=>h.api.STYLES.find(s=>s.id===h.api.ROSTER.find(r=>r.id===id).styleId));
  const result=playGame(h,{rsId:'eastafrica8',styles,levels:['l4','l4'],houseDraws:true});
  if(result.unresolved)throw Error('Unresolved game at the simulation cap; it is not a draw and cannot enter the Tanzania–Kenya sample');
  const winnerId=result.winner===1?ids[0]:result.winner===-1?ids[1]:null;
  rows.push({pair,seed,ivory:ids[0],ebony:ids[1],levels:['l4','l4'],styles:styles.map(s=>s.id),...result,winnerId});
  const report={scope:'Eight real-engine East Africa 8x8 games, four equal-strength seeded pairs with seat order reversed. Full Club budgets, actual national personality options, production house draws. This is a targeted regression sample, not proof of equal national win probabilities.',
    completed:rows.length,planned:8,results:{TZ:rows.filter(r=>r.winnerId==='TZ').length,KE:rows.filter(r=>r.winnerId==='KE').length,draws:rows.filter(r=>!r.winnerId).length},rows};
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log('Pair '+(pair+1)+' '+ids.join(' vs ')+' -> '+(winnerId||'draw')+' ('+result.plies+' plies)');
}
