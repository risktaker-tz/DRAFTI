'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ui=fs.readFileSync(require('path').join(__dirname,'../src/ui.js'),'utf8');
const c={Math};vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  function moveSheenAngle('),ui.indexOf('  function clearHighlights(')),c);
for(const n of [8,10,12]) {
  const from=3*n+3;
  const left=c.moveSheenAngle(from,from+n-1,n),right=c.moveSheenAngle(from,from+n+1,n);
  assert.equal(left,135);assert.equal(right,45);
  for(const to of [from+n-1,from+n+1,from-n-1,from-n+1]) {
    const a=c.moveSheenAngle(from,to,n),b=c.moveSheenAngle(n*n-1-from,n*n-1-to,n);
    assert(Math.abs(Math.abs(a-b)-180)<1e-6,'Flipped frame rotates the same real segment');
  }
}
const css=fs.readFileSync(require('path').join(__dirname,'../src/styles.css'),'utf8');
assert(css.includes('linear-gradient(var(--move-sheen-angle'));
assert(ui.includes("el.style.removeProperty('--move-sheen-angle')"));
console.log('Move sheen passed: left/right and reverse diagonals on 8/10/12 boards, flipped coordinates and stale-style cleanup');
