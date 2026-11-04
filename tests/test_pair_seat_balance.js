'use strict';
const assert=require('assert/strict'),{createHarness}=require('../scripts/arena_harness');
for(const [a,b]of [['TZ','KE'],['IT','BF'],['ID','MC'],['CI','EC']]){
  const {api,G,saves}=createHarness();
  api.arena.champion=a;api.arena.queue=[b];api.arena.bouts=0;api.seatArenaBout();
  const firstWhite=G.seatIvory;
  // The challenger wins and becomes host. Global bout parity alone would
  // repeat the same physical colours for these two countries.
  api.applyArenaResult(G.seatIvory===b?1:-1);
  api.arena.queue=[a];api.seatArenaBout();
  assert.notEqual(G.seatIvory,firstWhite,a+'/'+b+' must reverse colours even after the champion changes');
  assert.equal(saves['drafti.arena-progress.v1'].lastIvoryByPair[[a,b].sort().join('|')],G.seatIvory,'Pair colour balance persists with league progress');
  // An arbitrary gap and a season boundary must not reset that pair balance.
  const secondWhite=G.seatIvory;api.arena.bouts=11;api.arena.season=3;api.seatArenaBout();
  assert.notEqual(G.seatIvory,secondWhite,'The next meeting reverses colours regardless of tournament parity');
}
const h=createHarness();h.api.arenaProgress.lastIvoryByPair={'KE|TZ':'invalid-country'};
h.api.arena.champion='TZ';h.api.arena.queue=['KE'];h.api.seatArenaBout();
assert(new Set([h.G.seatIvory,h.G.seatEbony]).size===2,'Malformed old pair data uses guarded valid seats');
for(const key of Object.keys(h.api.arenaProgress))delete h.api.arenaProgress[key];
h.api.arenaProgress.bonusXp={};h.api.arena.champion='TZ';h.api.arena.queue=['KE'];h.api.seatArenaBout();
assert.equal(h.api.arenaProgress.lastIvoryByPair['KE|TZ'],h.G.seatIvory,'Switching/resetting to a profile without the new field initializes it safely');
const legacy=createHarness();legacy.api.rememberResumedPairColours('TZ','KE');
assert.equal(legacy.api.arenaProgress.lastIvoryByPair['KE|TZ'],'TZ','An existing saved match seeds the missing colour record without changing its position');
const restored=createHarness(0xD4AF71,{},legacy.snapshot());
restored.api.arena.champion='KE';restored.api.arena.queue=['TZ'];restored.api.seatArenaBout();
assert.equal(restored.G.seatIvory,'KE','Colour balance survives reopening an older installed game');
console.log('PASS rematch colour balance across champion changes, long gaps and season boundaries, persisted for every pair without country-specific rules');
