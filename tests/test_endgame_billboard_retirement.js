'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ui=fs.readFileSync(require('path').join(__dirname,'../src/ui.js'),'utf8');
const part=(a,b)=>ui.slice(ui.indexOf(a),ui.indexOf(b,ui.indexOf(a)));
const c={};vm.createContext(c);
vm.runInContext(part('  function lowMaterialLimit(','  function checkGameEnd('),c);
const two=[2,1,-2,-1],three=[2,1,1,-2,-1,-1];
const quiet=(board,n)=>Array.from({length:n},()=>({boardBefore:board,move:{caps:[],promotes:false}}));
assert.equal(c.lowMaterialLimit(two),2);assert.equal(c.lowMaterialLimit(three),10);
assert.equal(c.lowMaterialLimit([2,1,-1,-1]),0,'A surviving uncrowned side must still have the chance to crown or be beaten');
assert.equal(c.lowMaterialLimit([1,1,-2,-1]),0,'Both sides need a king before the rapid countdown can begin');
assert.equal(c.lowMaterialLimit([1,1,1,-2,-1,-1]),0,'Three-piece countdown requires kings on both sides');
assert.equal(c.lowMaterialLimit([2,1,1,1,-2]),10,'The other side need not also be down to three pieces');
assert.equal(c.lowMaterialLimit([2,1,1,1,-2,-1,-1,-1]),0,'Neither side has reached the endgame threshold');
assert.equal(c.lowMaterialLimit([2]),0,'A win has priority');
assert.equal(c.lowMaterialCountdown(two,quiet(two,1),[]).remaining,1);
assert.equal(c.lowMaterialCountdown(two,quiet(two,2),[]).remaining,0);
assert.equal(c.lowMaterialCountdown(three,quiet(three,9),[]).remaining,1);
assert.equal(c.lowMaterialCountdown(three,quiet(three,10),[]).remaining,0);
assert(c.lowMaterialCountdown(two,quiet(two,2),[{caps:[4]}]).scoringNext,'Immediate capture remains playable');
assert(c.lowMaterialCountdown(two,quiet(two,2),[{caps:[],promotes:true}]).scoringNext);
assert.equal(c.lowMaterialCountdown(two,[...quiet(two,2),{boardBefore:two,move:{caps:[3]}}],[]).remaining,2,'Scoring resets countdown');
assert.equal(c.lowMaterialCountdown(two,[{boardBefore:three,move:{caps:[]}}],[]).remaining,2,'Entering lower tier starts fresh');
vm.runInContext(part('  const hexRgb =','  // flags never disappear'),c);
vm.runInContext(part('  const THEME_BASE =','  if (!THEMES.some')+'this.themes=THEMES;',c);
vm.runInContext(part('  function billboardPalette(','  function applyTheme('),c);
for(const t of c.themes){const p=c.billboardPalette(t.v),bg=p['--billboard-bg'];
  for(const k of ['--billboard-ink','--billboard-dim','--billboard-accent']){
    const ratio=vm.runInContext(`(Math.max(lumaC('${bg}'),lumaC('${p[k]}'))+.05)/(Math.min(lumaC('${bg}'),lumaC('${p[k]}'))+.05)`,c);
    assert(ratio>=4.5,t.id+' '+k+' contrast '+ratio);
  }
}
const {createHarness}=require('../scripts/arena_harness');
const h=createHarness(42,{retireEvents:true});
for(let i=0;i<2;i++){h.api.seatArenaBout();const champion=h.api.arena.champion;
  const side=h.G.seatIvory===champion?1:-1;
  assert(h.api.applyArenaResult(side).ceremony,'Enabled retirement survives successive qualified bouts');
}
let callback,saved=0;const button={addEventListener:(_e,fn)=>callback=fn};
const t={settings:{},SETTINGS_KEY:'settings',manualRetire:false,$:()=>button,arenaOn:()=>true,saveJSON:()=>saved++,updateControls(){},SFX_BANK:{play(){}},flashWhisper(){}};
vm.runInNewContext(part("  $('btnRetire').addEventListener('click',",'  // player names:'),t);
callback();assert.equal(t.settings.retireEvents,true);callback();assert.equal(t.settings.retireEvents,false);assert.equal(saved,2);
let endResult;
const ending={IVORY:1,G:{mode:'aivai',side:-1,legal:[],seatIvory:'TZ',seatEbony:'KE',humanSide:1},
  settings:{pname:'Asha',pname2:'Juma'},arenaOn:()=>true,
  aiName:id=>id==='TZ'?'Tanzania':'Kenya',countSide:()=>0,
  setOver:(winner,reason)=>{endResult={winner,reason};}};
vm.runInNewContext(part('  const sideName =','  // the seat\'s full tag:')+
  part('  function checkGameEnd(','  function setOver('),ending);
ending.checkGameEnd();assert.equal(endResult.reason,'Every Kenya piece has been captured.');
ending.G.side=1;ending.countSide=()=>1;ending.checkGameEnd();
assert.equal(endResult.reason,'Tanzania has no legal move.');assert.equal(endResult.winner,-1);
ending.G.mode='hotseat';ending.countSide=()=>0;ending.checkGameEnd();
assert.equal(endResult.reason,'Every Asha piece has been captured.');
ending.G.side=-1;ending.checkGameEnd();assert.equal(endResult.reason,'Every Juma piece has been captured.');
ending.G.mode='ai';ending.G.side=1;ending.checkGameEnd();
assert.equal(endResult.reason,'Every Asha piece has been captured.');
console.log('Endgame countdowns, scoring protection, 21-theme billboard contrast and persistent retirement passed');
