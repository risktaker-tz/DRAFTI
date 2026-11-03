'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
function eventScenario(change){
  const timers=[],spoken=[];
  const c={G:{history:[{}],over:false},gameEpoch:1,STREAMER:{openGame(){},say:role=>{spoken.push(role);return true;}},
    MOVE_EVENTS:{majestic:{rank:3}},lastEvent:{rank:0,ply:0},SFX_BANK:{play(){}},
    pick:arr=>arr[0],Math:{random:()=>0},flashLabel(){},shake(){},HEAVY_POOL:[],
    setTimeout:fn=>timers.push(fn)};
  vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  function applyMoveEvent('),ui.indexOf('  function requestVerdict(')),c);
  c.applyMoveEvent('majestic',1,2,33);change(c);
  timers.forEach(fn=>fn());return spoken;
}
assert.deepEqual(eventScenario(()=>{}),['feast'],'A real double capture can receive its exact recorded call');
assert.deepEqual(eventScenario(c=>c.G.history.push({})),[],'The next move invalidates a delayed tactical call');
assert.deepEqual(eventScenario(c=>c.gameEpoch++),[],'A different match cannot inherit a capture announcement');
assert.deepEqual(eventScenario(c=>c.G.over=true),[],'An ending cannot receive a late tactical claim');
assert(!ui.includes("rampage && STREAMER.say('streak')"),'A capture run must not claim consecutive match victories');
assert(!ui.includes("if (!STREAMER.say('comeback'))"),'A good move after a blunder does not prove a material comeback');
console.log('PASS exact double-capture context, game/ply/result invalidation, no false win streaks or unsupported comebacks');
