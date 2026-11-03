'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../src/styles.css'),'utf8');
let reduced=false,now=1000;const ribbons=[],timers=[];
const squares=Array.from({length:144},()=>({style:{setProperty(k,v){this[k]=v;}},classList:{add(){}}}));
const c={Math,G:{rs:{n:10},lastMove:{from:11,path:[11,33]},lastMoveAt:1000},
  performance:{now:()=>now},window:{matchMedia:()=>({matches:reduced})},
  squareEls:()=>squares,clearHighlights(){},markJumpPaths(){},
  document:{createElement:()=>({style:{setProperty(k,v){this[k]=v;}},setAttribute(){},appendChild(){},remove(){this.removed=true;}})},
  piecesEl:{appendChild:e=>ribbons.push(e)},setTimeout:(fn,ms)=>timers.push({fn,ms})};
vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  function captureRibbon('),ui.indexOf('  async function animateMove(')),c);
for(const n of [8,10,12]){
  c.G.rs.n=n;const from=3*n+3;
  for(const to of [from+n-1,from+n+1,from-n-1,from-n+1]){
    c.captureRibbon(from,to,200,3);const r=ribbons.at(-1);
    assert(Math.abs(parseFloat(r.style.width)-Math.SQRT2*100/n)<1e-8);
    assert.equal(r.style.left,(3.5*100/n)+'%');assert.equal(r.style.top,(3.5*100/n)+'%');
    const a=parseFloat(r.style.transform.slice(7));
    c.captureRibbon(n*n-1-from,n*n-1-to,200,3);
    const b=parseFloat(ribbons.at(-1).style.transform.slice(7));
    assert(Math.abs(Math.abs(a-b)-Math.PI)<1e-8,'Reversing board coordinates reverses the ribbon direction');
    assert(r.className.includes('feast-ribbon'));
  }
}
for(const t of timers){assert(t.ms<=650);t.fn();}assert(ribbons.every(r=>r.removed));
const count=ribbons.length;reduced=true;c.captureRibbon(11,33,200,3);assert.equal(ribbons.length,count);
let marks=[];squares.forEach((s,i)=>s.classList.add=k=>marks.push([i,k]));
vm.runInContext(ui.slice(ui.indexOf('  function renderHighlights('),ui.indexOf('  // ---------------- selection')),c);
c.renderHighlights();assert.equal(marks.filter(m=>m[1]==='last').length,2);
now=1400;marks=[];c.renderHighlights();assert.equal(squares[11].style['--trail-age'],'-400ms','A redraw continues the fade instead of restarting it');
now=1900;marks=[];c.renderHighlights();assert.equal(marks.length,0,'Old highlights expire even if no other piece moves');
assert(!css.includes('linear-gradient(var(--move-sheen-angle'),'The hard diagonal square cut is removed');
assert(css.includes('animation: landing-memory 900ms'));
assert(/\.capture-ribbon \{[^}]*z-index: 0/s.test(css));
assert(/\.piece \{[^}]*z-index: 2/s.test(css),'Normal pieces sit above their underglow');
assert(!/\.feast-ribbon \{[^}]*z-index: [1-9]/s.test(css),'Multi-capture arrows cannot rise above the discs');
console.log('PASS fading highlights, redraw continuity, authentic ribbon geometry on 8/10/12 boards, reversed diagonals, bounded cleanup and reduced motion');
