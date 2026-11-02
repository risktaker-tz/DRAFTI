'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8'),{createHarness}=require('../scripts/arena_harness');
function names(saved){const h=createHarness(),c={E:h.E,IVORY:1,LEVELS:h.api.LEVELS,STYLES:h.api.STYLES,localStorage:{getItem:()=>JSON.stringify(saved)}};
vm.runInNewContext(ui.slice(ui.indexOf('  const SETTINGS_KEY ='),ui.indexOf('  const PRESENTATION_KEY ='))+'this.result=settings;',c);return c.result;}
assert.equal(names({}).pname,'Uhakika');assert.equal(names({}).pname2,'Usiogope');
assert.equal(names({pname:'UHAKIKA',pname2:'Challenger'}).pname2,'Usiogope');
assert.equal(names({pname:'Asha',pname2:'Juma'}).pname,'Asha');assert.equal(names({pname:'Asha',pname2:'Juma'}).pname2,'Juma');
const h=createHarness();h.settings.diff='l7';for(const r of h.api.ROSTER)assert.equal(h.api.rosterLevel(r.id),7,'Selected starting rung applies equally to '+r.id);
h.api.arena.xp.TZ=5;assert.equal(h.api.rosterLevel('TZ'),8);h.api.arena.season=2;assert.equal(h.api.rosterLevel('KE'),8,'Every nation grows each season');
h.settings.diff='l10';assert(h.api.ROSTER.every(r=>h.api.rosterLevel(r.id)===10),'All nations respect selected Machine strength and level cap');
let stopped=0,scheduled=0,updated=0;const board=[1,-1,0];
const c={LEVELS:h.api.LEVELS,LEVEL_IDS:h.api.LEVEL_IDS,settings:{diff:'l1',aivaiAuto:false},G:{mode:'ai',phase:'thinking',over:false,diff:'l1',board},
  arenaSeatLevels:()=>[8,9],SETTINGS_KEY:'settings',saveJSON(){},reqId:4,aiPending:true,hintPending:false,
  worker:{terminate:()=>stopped++},humanTurn:()=>false,FX:{thinkStop(){}},updateAll:()=>updated++,scheduleAI:()=>scheduled++,saveCurrentMatch:()=>{c.matchSaved=true;}};
vm.runInNewContext(ui.slice(ui.indexOf('  function changeDifficulty('),ui.indexOf('  function arenaPressureOpts(')),c);
c.changeDifficulty('l9');assert.equal(c.G.diff,'l9');assert.equal(c.settings.diff,'l9');assert.equal(c.reqId,5);assert.equal(stopped,1);assert.equal(scheduled,1);assert.strictEqual(c.G.board,board,'Changing strength preserves the actual game position');
assert(c.matchSaved,'A strength change is included in the resumable match immediately');
Object.assign(c.G,{mode:'aivai',phase:'idle'});c.settings.aivaiAuto=true;c.changeDifficulty('l8');assert.equal(c.G.diffIvory,'l8');assert.equal(c.G.diffEbony,'l9');
c.humanTurn=()=>true;c.G.phase='idle';const priorRequest=c.reqId;c.changeDifficulty('l9');assert.equal(c.reqId,priorRequest+1,'Arena presentation delay replaces pending old-strength search even on the default human-side seat');
c.G.phase='animating';const before=c.reqId;c.changeDifficulty('l10');assert.equal(c.reqId,before,'An active capture animation is not interrupted');
c.changeDifficulty('not-a-level');assert.equal(c.settings.diff,'l10','Invalid rungs cannot corrupt settings');
assert(updated>=3);
const labels=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8').replace(/\bid="[^"]*"|\bclass="[^"]*"/g,'');
assert(!/>\s*(Ivory|Ebony)(\s|<)/.test(labels),'Old colour names are not player labels');
console.log('Player identity and strength passed: default migration, custom names, equal national baseline, XP/season growth and live search replacement');
