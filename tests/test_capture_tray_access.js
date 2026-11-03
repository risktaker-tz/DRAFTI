'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../src/styles.css'),'utf8');
const names={1:'A very long player name <img>', '-1':'A different long player name & friends'};
const trays={};for(const [id,side] of [['trayTop',1],['trayBottom',-1]])trays[id]={
  name:{textContent:'Captured by '+names[side],scrollLeft:17},
  discs:{scrollLeft:9},
  querySelector(selector){return selector==='.tray-captures'?this.discs:this.name;},
  set innerHTML(value){this.html=value;this.name={textContent:'Captured by '+names[side],scrollLeft:0};this.discs={scrollLeft:0};}};
const c={G:{rs:{n:8,pieceRows:3}},IVORY:1,EBONY:-1,countSide:side=>side===1?4:7,displayName:side=>names[side],$:id=>trays[id]};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  function updateTrays('),ui.indexOf('  function updateHistory(')),c);c.updateTrays();
assert(trays.trayTop.html.includes('<b class="tray-count">5</b>'));
assert(trays.trayBottom.html.includes('<b class="tray-count">8</b>'));
assert.equal((trays.trayTop.html.match(/class="mini /g)||[]).length,5,'Existing captured discs remain');
assert(!trays.trayTop.html.includes('<img>'));assert(trays.trayTop.html.includes('&lt;img&gt;'),'Names remain text rather than markup');
assert(trays.trayBottom.html.includes('&amp; friends'));
assert.equal(trays.trayTop.name.scrollLeft,17,'Updates preserve the name scroll position');
assert.equal(trays.trayBottom.name.scrollLeft,17);
assert.equal(trays.trayTop.discs.scrollLeft,9,'Captured-disc scroll also survives an update');
assert(css.includes('.tray-count { flex: none;'));
assert(css.includes('.tray-name { flex: 1 1 auto; min-width: 0; overflow-x: auto;'));
assert(css.includes('.tray-captures { display: flex;'));
console.log('Capture tray access passed: fixed independent counts, correct opposing losses, retained captured discs, safe scrollable names and scroll preservation');
