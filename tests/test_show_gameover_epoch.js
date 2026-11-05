'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const from=source.indexOf('  function showGameOver() {');
const to=source.indexOf('  // ---------------- the arena:',from);
assert(from>=0&&to>from,'game-over handler boundaries exist');

function run({restartBeforeCallbacks}){
  const timers=[],effects=[],modal=[],texts=new Map();
  const c={
    G:{over:true,result:{winner:null,reason:'test draw'},mode:'hotseat',history:[],humanSide:1},
    settings:{sfx:{party:true},aivaiAuto:false},gameEpoch:12,overShown:false,
    recordAudioCheckpoint:()=>{},
    setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},
    SFX_BANK:{play:id=>effects.push('sound:'+id),directOwner:id=>effects.push('owner:'+id)},
    STREAMER:{say:id=>{effects.push('streamer:'+id);return true;}},
    FX:{play:id=>effects.push('fx:'+id)},Math:{random:()=>0},
    pick:values=>values[0],countSide:()=>1,displayName:side=>side===1?'Uhakika':'Usiogope',
    openModal:id=>modal.push(id),
    $:id=>{if(!texts.has(id))texts.set(id,{});return texts.get(id);},
  };
  vm.createContext(c);
  vm.runInContext(source.slice(from,to)+';this.show=showGameOver;',c);
  c.show();
  assert(effects.includes('sound:draw_chime'),'the actual game result cue plays immediately');
  assert(timers.length>=4,'result announcement, sting and modal are scheduled');
  if(restartBeforeCallbacks){
    c.gameEpoch++;c.G.over=false;c.G.result=null;effects.length=0;
  }
  for(const timer of timers)timer.fn();
  return {effects,modal};
}

const canceled=run({restartBeforeCallbacks:true});
assert.deepEqual(canceled.effects,[],'an old result cannot leak sounds/commentary into the restarted match');
assert.deepEqual(canceled.modal,[],'an old delayed dialog cannot cover the new match');
const current=run({restartBeforeCallbacks:false});
assert(current.effects.includes('sound:god'),'the current draw keeps its delayed effect');
assert(current.effects.includes('streamer:draw'),'the current draw keeps its contextual commentary');
assert.deepEqual(current.modal,['modalGameOver'],'the current completed game still opens its result dialog');
console.log('PASS completed-game delayed cues remain tied to their match generation; a restarted game stays clear');
