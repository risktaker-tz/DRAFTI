'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const ui = fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const start = ui.indexOf('  function flashWhisper('), end = ui.indexOf('  const pick = (arr)', start);
for (const [top, height] of [[124,374],[100,684],[124,300]]) {
  let element, cleared = 0, timer;
  const host = { appendChild(el) { element = el; } };
  const c = { frameEl: { offsetTop: top, offsetHeight: height }, whisperTimer: 7,
    $: id => id === 'stage' ? host : element,
    document: { createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, offsetWidth: 1 }) },
    clearTimeout: () => cleared++, setTimeout: (fn,delay) => { timer = { fn,delay }; return 8; } };
  vm.createContext(c); vm.runInContext(ui.slice(start,end),c);
  const words = 'Take your time — the complete message stays available'; c.flashWhisper(words);
  const y = parseFloat(element.style.top);
  assert(y > top && y < top + height, 'Quiet caption must stay on the board, below all scoreboard cells');
  assert.equal(element.textContent,words); assert.equal(element.title,words);
  assert.equal(timer.delay,2400); assert.equal(cleared,1,'Existing whisper timing/cancellation remains intact');
  const previous = element; c.flashWhisper('Another moment'); assert.equal(element,previous,'Reuse the existing overlay');
}
console.log('PASS quiet captions anchored inside phone/desktop/compact boards, full words retained, original timing and overlay reuse preserved');
