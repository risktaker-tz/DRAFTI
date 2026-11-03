'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../scripts/arena_fairness_sim.js'),'utf8');
let calls=0,waits=0,written;
const c={process:{pid:7},fs:{writeFileSync:(file,text)=>written={file,text},renameSync:()=>{if(++calls<3)throw Object.assign(Error('Windows reader lock'),{code:'EPERM'});}},
  SharedArrayBuffer,Int32Array,Atomics:{wait:()=>waits++}};
vm.createContext(c);vm.runInContext(source.slice(source.indexOf('const writeJSON='),source.indexOf('if(fs.existsSync(lockPath))'))+'this.writeJSON=writeJSON;',c);
c.writeJSON('checkpoint.json',{complete:true});assert.equal(calls,3);assert.equal(waits,2);assert.equal(written.file,'checkpoint.json.7.tmp');assert.equal(JSON.parse(written.text).complete,true);
calls=0;c.fs.renameSync=()=>{calls++;throw Object.assign(Error('real storage failure'),{code:'ENOSPC'});};
assert.throws(()=>c.writeJSON('checkpoint.json',{}),/real storage failure/);assert.equal(calls,1);
calls=0;c.fs.renameSync=()=>{calls++;throw Object.assign(Error('persistent lock'),{code:'EBUSY'});};
assert.throws(()=>c.writeJSON('checkpoint.json',{}),/persistent lock/);assert.equal(calls,20,'Retry remains bounded and leaves the prior checkpoint intact');
console.log('Simulation checkpoint writer passed: atomic temporary write, transient Windows locks retried, real failures surfaced and persistent locks bounded');
