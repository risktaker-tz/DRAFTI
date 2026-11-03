'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');let reduced=false,last;
const speeds=[1,2,4,6,8,10,16],box={scrollLeft:0,clientWidth:89,scrollWidth:7*35,getBoundingClientRect:()=>({left:100}),
  scrollTo:o=>{last=o;box.scrollLeft=o.left;},querySelectorAll:()=>speeds.map((v,i)=>({dataset:{v:String(v)},getBoundingClientRect:()=>({left:100+i*35-box.scrollLeft,right:100+(i+1)*35-box.scrollLeft})}))};
const c={$:()=>box,Array,Math,window:{matchMedia:()=>({matches:reduced})}};vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  function revealPlaybackNeighbour('),ui.indexOf("  wireSeg('segSpeed'")),c);
function visible(speed){const i=speeds.indexOf(speed);return i*35>=box.scrollLeft-3&&(i+1)*35<=box.scrollLeft+box.clientWidth+3;}
c.revealPlaybackNeighbour(2,1);assert(visible(2)&&visible(4),'Increasing 2x reveals 4x without scrolling the page');
c.revealPlaybackNeighbour(8,2);assert(visible(8)&&visible(10));
c.revealPlaybackNeighbour(16,8);assert(visible(16));assert(box.scrollLeft<=box.scrollWidth-box.clientWidth);
c.revealPlaybackNeighbour(4,16);assert(visible(4)&&visible(2),'Decreasing reveals the previous available speed');
assert.equal(last.behavior,'smooth');reduced=true;c.revealPlaybackNeighbour(2,4);assert.equal(last.behavior,'auto');assert(visible(1)&&visible(2));
const before=box.scrollLeft;c.revealPlaybackNeighbour(2,2);assert.equal(box.scrollLeft,before,'Clicking the current speed does not move the box');
console.log('PASS exact-direction neighbour reveal, both boundaries, enclosed scrolling and reduced-motion behaviour');
