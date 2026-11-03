'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const moduleCode=ui.slice(ui.indexOf('function createPlayerProgressStore('),ui.indexOf('(function () {'));
const api={};vm.runInNewContext(moduleCode,api);
const make=api.createHumanProgression,key='drafti.human-ladder.v1';
let ladder=make({schema:1,automatic:true,level:1});
for(let level=1;level<10;level++){
  assert.equal(ladder.current(),'l'+level);
  assert(ladder.win('l'+level));
  assert(!ladder.win('l'+level),'The previous level cannot grant a second promotion');
  ladder=make(JSON.parse(JSON.stringify(ladder.snapshot())));
}
assert.equal(ladder.current(),'l10');assert(!ladder.win('l10'),'The Machine is the ceiling');
assert(!ladder.manual('l11'));assert(ladder.manual('l7'));assert(!ladder.automatic());
assert(!ladder.win('l7'),'Manual selection is pinned');assert(ladder.setAutomatic(true));assert(ladder.win('l7'));assert.equal(ladder.current(),'l8');
const future={schema:2,valuable:'newer progress',level:9};ladder=make(future,'l5');assert(!ladder.manual('l1'));assert(!ladder.setAutomatic(true));assert(!ladder.win('l5'));assert.deepEqual(ladder.snapshot(),future);
function store(initial){const disk=new Map(Object.entries(initial).map(([k,v])=>[k,JSON.stringify(v)]));const storage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)};return {disk,storage,p:api.createPlayerProgressStore(storage)};}
const fresh=store({});assert.equal(fresh.p.load(key,null).level,1);assert.equal(fresh.p.load(key,null).automatic,true);
fresh.p.persist();let reopened=api.createPlayerProgressStore(fresh.storage);assert.equal(reopened.load(key,null).automatic,true,'Fresh automatic choice survives the first canonical save');
const legacy=store({'drafti.settings.v1':{diff:'l7',theme:'marble'},'drafti.players.v1':{schema:1,active:'old',next:2,players:[{id:'old',name:'Asha',values:{'drafti.stats.v1':{eastafrica10:{w:4}}}}]}});
assert.equal(legacy.p.load(key,null).level,7);assert.equal(legacy.p.load(key,null).automatic,false);
assert(legacy.p.persist(),'Migration baseline matches an actually absent remote key');
reopened=api.createPlayerProgressStore(legacy.storage);assert.equal(reopened.load(key,null).level,7);assert.equal(reopened.load('drafti.stats.v1',{}).eastafrica10.w,4);
const next=legacy.p.create('Juma');assert(next);assert.equal(legacy.p.load(key,null).level,1);assert.equal(legacy.p.load(key,null).automatic,true,'New profiles never inherit the shared old difficulty');
assert(legacy.p.saveBundle({[key]:{schema:1,automatic:true,level:3},'drafti.stats.v1':{eastafrica10:{w:2}}}));
legacy.p.resetLeague();assert.equal(legacy.p.load(key,null).level,3,'League reset preserves the personal computer journey');
legacy.p.switchTo('old');assert.equal(legacy.p.load(key,null).level,7,'Profiles keep independent strength choices');
legacy.p.switchTo(next);reopened=api.createPlayerProgressStore(legacy.storage);assert.equal(reopened.load(key,null).level,3);
const records=[],s={};ladder=make({schema:1,automatic:true,level:1});
const c={G:{mode:'ai',humanSide:1,diff:'l1',rsId:'eastafrica10',recorded:false},stats:s,humanLadder:ladder,
  STATS_KEY:'drafti.stats.v1',HUMAN_LADDER_KEY:key,statEntry:()=>s.eastafrica10||{p:0,w:0,d:0,l:0,run:0,bestRun:0},
  saveJSON:(k,v,extra)=>records.push({k,value:JSON.parse(JSON.stringify(v)),extra:JSON.parse(JSON.stringify(extra))}),saveStats:()=>records.push({statsOnly:true})};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  function recordStats('),ui.indexOf('  let overShown =')),c);
c.recordStats(1);assert.equal(ladder.current(),'l2');assert.equal(c.G.diff,'l1','The completed board retains the level actually played');
assert.equal(records.length,1);assert.equal(records[0].extra[key].level,2,'Win record and promotion share one atomic bundle');
c.recordStats(1);assert.equal(records.length,1,'Repeated result rendering cannot count another win');
for(const winner of [null,-1]){c.G.recorded=false;c.G.diff='l2';c.recordStats(winner);assert.equal(ladder.current(),'l2');}
c.G.mode='hotseat';c.G.recorded=false;c.recordStats(1);assert.equal(ladder.current(),'l2');
const handlers={},selected=[];Object.assign(c,{wireSeg:(id,fn)=>handlers[id]=fn,saveHumanLadder(){},changeDifficulty:id=>selected.push(id),updateSegs(){},$:()=>({addEventListener(){}})});
vm.runInContext(ui.slice(ui.indexOf("  wireSeg('segDiff'"),ui.indexOf("  wireSeg('segClock'")),c);
c.G.mode='ai';handlers.segDiff('l8');assert.equal(ladder.current(),'l8');assert(!ladder.automatic());assert.equal(selected.at(-1),'l8');
handlers.segProgression('on');assert(ladder.automatic());assert(ladder.win('l8'));assert.equal(ladder.current(),'l9');
console.log('PASS Beginner-to-Machine wins, manual override/resume, exact-once results, atomic records, migration, independent profiles, reload and safe future saves');
