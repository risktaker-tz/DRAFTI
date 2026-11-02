'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {createHarness,playGame}=require('./arena_harness');
const styles=createHarness().api.STYLES,rows=[],counts=Object.fromEntries(styles.map(s=>[s.id,{played:0,wins:0,losses:0,draws:0}]));
for(let a=0;a<styles.length;a++)for(let b=a+1;b<styles.length;b++){
  for(let swap=0;swap<2;swap++){
    const h=createHarness(0x510000+a*100+b);h.settings.aivaiAuto=false;
    const seats=swap?[styles[b],styles[a]]:[styles[a],styles[b]];
    const result=playGame(h,{styles:seats,levels:['l3','l3']});
    const winner=result.winner===1?seats[0].id:result.winner===-1?seats[1].id:null;
    for(const style of seats){const c=counts[style.id];c.played++;if(!winner)c.draws++;else if(winner===style.id)c.wins++;else c.losses++;}
    rows.push({ivory:seats[0].id,ebony:seats[1].id,winnerId:winner,...result});
  }
  console.log(styles[a].id+' / '+styles[b].id+': '+rows.slice(-2).map(r=>r.winnerId||'draw').join(', '));
  fs.writeFileSync(path.join(__dirname,'../docs/style-balance-progress.json'),JSON.stringify({completedGames:rows.length,counts,rows},null,2)+'\n');
}
function binomialP(w,l){const n=w+l;if(!n)return 1;const k=Math.min(w,l);let mass=2**-n,sum=mass;for(let i=1;i<=k;i++){mass*= (n-i+1)/i;sum+=mass;}return Math.min(1,2*sum);}
const table=Object.entries(counts).map(([id,c])=>({id,...c,score:(c.wins+c.draws/2)/c.played,twoSidedDecisiveP:binomialP(c.wins,c.losses)}));
const report={level:'l3 (Casual)',games:rows.length,method:'Complete 12-style round robin, each pair plays both colours from the standard opening with the same pair seed. Production engine, style options, full l3 search budgets and move-selection ladder. No display delays.',
  decisionRule:'Two-sided binomial test of decisive results against 50%, Bonferroni threshold 0.05/12. Draws count half in displayed score. This is a bounded empirical check at l3, not a claim of equal strength at every position or level.',table,rows};
fs.writeFileSync(path.join(__dirname,'../docs/style-balance.json'),JSON.stringify(report,null,2)+'\n');
const md='# Same-level style balance\n\n'+report.method+'\n\n'+report.decisionRule+'\n\n| Style | Games | Wins | Losses | Draws | Score | Two-sided p |\n| --- | --- | --- | --- | --- | --- | --- |\n'+table.map(r=>'| '+r.id+' | '+r.played+' | '+r.wins+' | '+r.losses+' | '+r.draws+' | '+(100*r.score).toFixed(1)+'% | '+r.twoSidedDecisiveP.toFixed(4)+' |').join('\n')+'\n';
fs.writeFileSync(path.join(__dirname,'../docs/style-balance.md'),md);console.log(md);
assert(table.every(r=>r.twoSidedDecisiveP>=.05/styles.length),'A style edge exceeded this sample’s multiple-comparison threshold; investigate before claiming balance');
