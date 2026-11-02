'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8'),sounds=[],labels=[],effects=[];
const c={Math,G:{firstStrike:false},SFX_BANK:{play:id=>sounds.push(id),effect:id=>effects.push(id)},flashWhisper:text=>labels.push(text)};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  function makeDeck('),ui.indexOf('  const THINK_POOL =')),c);
vm.runInContext(ui.slice(ui.indexOf('  const FIRST_STRIKE_CUES ='),ui.indexOf('  // Instant signals,')),c);
for(let i=0;i<9;i++){
  c.G.firstStrike=false;c.firstCaptureSting();const count=sounds.length;c.firstCaptureSting();
  assert.equal(sounds.length,count,'Opening-capture cue fires once per game');
}
assert.equal(new Set(labels.slice(0,3)).size,3,'All opening labels cycle before repetition');
assert(sounds.every(id=>['v_nice','v_clean','v_sharp'].includes(id)));
assert(labels.every(label=>!label.toLowerCase().includes('blood')));
assert(effects.every(event=>event==='coin'));
assert(!/SFX_BANK\.play\(['"]v_first['"]/.test(ui),'Legacy spoken first-blood clip has no gameplay call');
console.log('First-strike cues passed: three nonrepeating labels and voices, once-per-game capture gate and no legacy first-blood playback');
