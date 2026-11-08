'use strict';
const assert=require('assert'),{createHarness}=require('../scripts/arena_harness');
let checks=0;const check=(condition,message)=>{assert(condition,message);checks++;};
for(const host of ['TZ','KE','IT','ID']){
  const {api,G}=createHarness();api.arena.champion=host;api.arena.queue=api.ladderQueue(host);
  check(api.arena.queue.length===193,'All other nations, including former host Tanzania, remain scheduled');
  check(new Set(api.arena.queue).size===193,'Queue contains no duplicate nations');
  for(let bout=0;bout<12;bout++){
    api.arena.bouts=bout;api.seatArenaBout();
    check(G.seatIvory!==G.seatEbony,'Guarded seats always differ');
    check((bout%2===0?G.seatIvory:G.seatEbony)===host,'Host alternates colour every bout');
  }
}
for(let a=1;a<=10;a++)for(let b=1;b<=10;b++){
  const {api}=createHarness();api.arena.xp.TZ=(a-1)*5;api.arena.xp.KE=(b-1)*5;
  const pair=api.arenaSeatLevels('TZ','KE'),reverse=api.arenaSeatLevels('KE','TZ');
  check(pair[0]===reverse[1]&&pair[1]===reverse[0],'Competitive lift is seat symmetric');
  check(Math.abs(pair[0]-pair[1])<=2,'No bout has more than a two-rung gap');
  check(pair[0]>=a&&pair[1]>=b,'Neither nation loses its earned strength');
}
for(const bout of [0,5,9,11])for(const hostIvory of [true,false])for(const retained of [true,false]){
  const {api,G,saves}=createHarness();api.arena.bouts=bout;api.arena.champion='TZ';api.arena.queue=api.ladderQueue('TZ');
  // Explicit fixtures cover both title roles on both physical colours.
  Object.assign(G,{seatIvory:hostIvory?'TZ':'KE',seatEbony:hostIvory?'KE':'TZ'});
  const winner=retained?'TZ':'KE',side=G.seatIvory===winner?1:-1;
  const bonus=(bout>=11?5:bout>=9?3:bout>=5?2:0)+(retained?1:0);
  api.applyArenaResult(side);
  check(api.arena.champion===winner,'Actual winning nation holds the title, on either colour');
  check(api.arena.xp[winner]===5+bonus,'Played + win + stage/retention XP awarded');
  check(api.arena.xp[retained?'KE':'TZ']===6,'Defeat grants played + learning XP');
  check(api.arenaProgress.bonusXp[winner]===bonus,'Bonus XP recorded visibly, separately from old saves');
  check(!!saves['drafti.arena.v2']&&!!saves['drafti.arena-progress.v1'],'Existing and new persistence keys kept');
}
const draws=createHarness();
draws.api.arena.queue=['KE','UG'];
Object.assign(draws.G,{seatIvory:'TZ',seatEbony:'KE'});
draws.api.applyArenaResult(0);
check(draws.api.arena.queue[0]==='KE','A first draw allows a rematch');
draws.api.applyArenaResult(0);
check(draws.api.arena.queue[0]!=='KE'&&draws.api.arena.queue.at(-1)==='KE','Repeated draws rotate the challenger');
check(draws.api.arena.champion==='TZ'&&draws.api.arena.challRounds===0,'Draw rotation preserves the title and resets the round counter');
const h=createHarness();h.G.diff='l1';h.G.diffIvory='l8';h.G.diffEbony='l3';h.G.side=1;
for(const nation of h.api.ROSTER)check(h.api.rosterLevel(nation.id)===4,'Season one begins at Club for every nation');
h.api.arena.season=2;for(const nation of h.api.ROSTER)check(h.api.rosterLevel(nation.id)===5,'The next season automatically raises every untouched nation');
h.api.arena.season=1;
check(h.api.searchLevelForSide()==='l8','Arena move choice uses its seat level, not the menu level');
h.G.side=-1;check(h.api.searchLevelForSide()==='l3','Other seat uses its own ladder level');
// Equal random draws must yield equal effort and error policy for all styles.
const efforts=[];
for(const style of h.api.STYLES){
  const fixed=createHarness(123);efforts.push(fixed.api.levelOpts('l5',style).opts);
}
check(new Set(efforts.map(o=>o.budgetMs)).size===1,'Personality cannot change search time');
check(efforts.every(o=>o.maxDepth===10&&o.jitter===0),'Expert uses deterministic evaluation with identical search depth for every style');
check(efforts.every(o=>Math.abs(o.weights.trade-1)<=.031&&Math.abs(o.weights.king-1)<=.091),'Material preference remains bounded');
console.log(checks+' arena fairness checks passed: full roster, seat symmetry, progression, correct ladder and equal search effort');
