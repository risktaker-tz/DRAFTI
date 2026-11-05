'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createHarness}=require('../scripts/arena_harness');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
for(const winner of [1,-1,0])for(const retired of [false,true]){
  const h=createHarness(17,{retireEvents:retired});h.api.arena.bouts=11;h.api.seatArenaBout();
  const seats=[h.G.seatIvory,h.G.seatEbony],result=h.api.applyArenaResult(winner);
  assert(result.seasonEnd&&result.seasonAward);
  assert.deepEqual(Array.from(result.seasonAward.nations),winner===0?seats:[seats[winner===1?0:1]],'The actual final result wins the cup even if retirement changes the next host');
  assert.equal(result.seasonAward.shared,winner===0);
  assert.equal(h.api.seasonHonours.snapshot().awards.length,1);
  assert.equal(h.api.seasonHonours.award(1,-winner,seats,'american'),null,'A season cannot award twice');
  const restored=createHarness(17,{},h.snapshot());assert.equal(JSON.stringify(restored.api.seasonHonours.snapshot()),JSON.stringify(h.api.seasonHonours.snapshot()));
}
const early=createHarness();early.api.seatArenaBout();
assert.equal(early.api.applyArenaResult(1).seasonAward,null,'Ordinary bouts cannot announce a grand-final winner');
const c={ROSTER:[{id:'TZ'},{id:'KE'}]};vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  function createSeasonHonours('),ui.indexOf('  const SEASON_HONOURS_KEY')),c);
const future={schema:2,valuable:'future honours'};const locked=c.createSeasonHonours(future);
assert.equal(locked.award(1,1,['TZ','KE'],'american'),null);assert.equal(JSON.stringify(locked.snapshot()),JSON.stringify(future));
let lastTier=0;
for(let season=1;season<=100;season++){
  const cup=c.seasonCupDesign(season);assert(cup.tier>=lastTier);lastTier=cup.tier;
  assert.equal(cup.prestige,season);assert.equal(cup.level,season);
}
assert.notEqual(c.seasonCupDesign(1).name,c.seasonCupDesign(2).name);assert.notEqual(c.seasonCupDesign(2).name,c.seasonCupDesign(3).name);
vm.runInContext(ui.slice(ui.indexOf('function createPlayerProgressStore('),ui.indexOf('function createHumanProgression(')),c);
const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},store=c.createPlayerProgressStore(storage);
store.persist();const owner=store.active().id,key='drafti.season-honours.v1';
assert(store.routes(key));store.save(key,{schema:1,awards:[{season:1,nations:['TZ']}]});
store.create('Guest');assert.equal(store.load(key,null),null,'Another player never inherits the cup');
store.switchTo(owner);assert.equal(store.load(key,null).awards[0].nations[0],'TZ');
store.resetLeague();assert.equal(store.load(key,null),null,'Explicit league reset also resets season honours');
let bundle;
const saving={G:{over:true,mode:'aivai'},playerProgress:{routes:()=>true,saveBundle:value=>{bundle=value;return true;},lastError:()=>''}};
vm.runInNewContext(ui.slice(ui.indexOf('  function saveJSON('),ui.indexOf('  const settings =')),saving);
saving.saveJSON('drafti.arena.v2',{season:2},{[key]:{schema:1,awards:[{season:1,nations:['TZ']}]}});
assert.equal(bundle['drafti.match.v1'],null);assert.equal(bundle[key].awards[0].season,1,'Cup honours and advanced season save atomically with the old match cleared');
console.log('PASS actual final winners/shared draws, retirement identity, duplicate protection, resume, player isolation/reset and progressive cup prestige');
