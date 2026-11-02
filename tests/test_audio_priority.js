'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');let now=100000;const sources=[];
const ctx={destination:{},createBufferSource(){const s={playbackRate:{},connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(s);return s;},
  createGain:()=>({gain:{},connect(){},disconnect(){}})};
const defs={ambient:{c:'think',voice:'jam'},ambient2:{c:'think',voice:'kazi'},hit:{c:'drama'},voice1:{c:'voice'},voice2:{c:'voice'},voice3:{c:'judge'},ceremony:{c:'voice'},badboy:{c:'party'},susp_burst:{c:'drama',voice:'original'}};
const settings={sound:true,sfx:{think:true,voice:true,drama:true,judge:true,party:true}},c={window:{DRAFTI_SFX:defs,DRAFTI_OWNER_AUDIO:{clips:{susp_burst:{spoken:false}}}},settings,G:{phase:'idle'},
 performance:{now:()=>now},FX:{ensure:()=>ctx},URLSearchParams,location:{search:''},console};
vm.runInNewContext(ui.slice(ui.indexOf('  const SFX_BANK ='),ui.indexOf('  // ---------------- game state'))+'this.bank=SFX_BANK;',c);
const d=c.bank;d.decodeAll=()=>{};for(const id of Object.keys(defs))d.buffers.set(id,{duration:1});
const ambient=d.play('ambient');assert(ambient.started);const hit=d.play('hit');assert(ambient.stopped,'Important event stops ambient');
const first=d.play('voice1');assert(first.started);assert.equal(d.play('voice2'),null);assert.equal(d.queue.length,1);
d.play('voice3');assert.equal(d.queue.length,2);first.onended();assert.equal(d.queue.length,1);assert.equal([...d.activeSources.values()].filter(x=>x.spoken).length,1,'Only one spoken cue plays at once');
const before=d.queue.length;d.play('voice1',{queue:false});assert.equal(d.queue.length,before,'Quota-controlled reactions cannot escape via queued playback');
const ceremony=d.play('ceremony',{sceneOwner:'ceremony'});assert(ceremony.started);assert(hit.stopped,'Ceremony preempts ordinary effects');
now+=4000;ceremony.onended();assert.equal(d.queue.length,0,'Expired context is discarded');
d.play('voice3');d.resetGame();assert.equal(d.activeSources.size,0);assert.equal(d.queue.length,0,'New games cancel previous sound context');
now+=20000;const lower=d.play('badboy');assert(lower.started);
assert.equal(d.play('voice1'),null,'Higher-priority speech queues instead of overlapping a lower-priority spoken meme');
const unrelated=d.play('hit');unrelated.onended();assert.equal(d.queue.length,1,'An unrelated effect ending cannot discard speech waiting behind an active voice');
lower.onended();assert.equal(d.queue.length,0);assert.equal([...d.activeSources.values()].filter(x=>x.spoken).length,1);
const percussion=d.play('susp_burst');assert(percussion.started,'Original-source percussion remains nonverbal while commentary is active');
assert.equal([...d.activeSources.values()].filter(x=>x.spoken).length,1,'Recording provenance does not turn percussion into speech');
settings.sound=false;assert.equal(d.play('hit'),null);settings.sound=true;settings.sfx.drama=false;assert.equal(d.play('hit'),null);
console.log('Audio priority passed: ambient preemption, one voice, bounded contextual queue, ceremony priority, epoch cleanup, category switches and mute');
