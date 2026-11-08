'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../src/styles.css'),'utf8');
let reduced=false;
const classes=[],nodes=[],timers=[];
const frameEl={offsetWidth:10,classList:{add:name=>classes.push(name),remove(){}}};
const c={window:{matchMedia:()=>({matches:reduced})},frameEl,G:{rs:{n:8}},
  document:{createElement:()=>({style:{setProperty(){}},className:'',remove(){}})},
  piecesEl:{appendChild:el=>nodes.push(el)},setTimeout:(fn,ms)=>timers.push({fn,ms}),
  settings:{shake:true},Date,Math};
vm.createContext(c);
let start=ui.indexOf('  function thump()'),end=ui.indexOf('  const FIRST_STRIKE_CUES',start);
vm.runInContext(ui.slice(start,end),c);
start=ui.indexOf('  let lastShake = 0;');end=ui.indexOf('  const COUNT_WORD',start);
vm.runInContext(ui.slice(start,end),c);

reduced=true;
c.thump();c.shockwave(12);c.shake('shake-xl');c.flare();
assert.deepEqual(classes,[],'Reduced motion suppresses thump, shake and flare classes');
assert.equal(nodes.length,0,'Reduced motion creates no decorative shockwave nodes');

reduced=false;
c.thump();c.shockwave(12);c.shake('shake-xl');c.flare();
assert(classes.includes('thump')&&classes.includes('shake-xl')&&classes.includes('flare'),
  'Normal motion keeps the existing dramatic board reactions');
assert.equal(nodes.length,1,'Normal motion keeps the event shockwave');
assert(css.includes('.sq.last::after { animation: none; opacity: .24; }'),
  'Reduced motion preserves a static last-move indicator');
assert(css.includes('.shockwave, .capture-corner { display: none !important; }'),
  'CSS also suppresses transient rings and corner sparkles for reduced-motion users');
assert(css.includes('.board-frame.doomed::after { animation: none !important; }'),
  'The doom vignette remains visible without pulsing');
console.log('PASS reduced-motion guards keep functional highlights while suppressing decorative board motion');
