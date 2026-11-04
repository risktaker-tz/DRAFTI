'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'../src/app_updates.js'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(protocol='https:',hostname='drafti-afrika.vercel.app',fail=false){
  const events={},swEvents={},docEvents={},calls={registered:0,updated:0,reloaded:0},build='a'.repeat(64);
  let now=100000;
  function Channel(){this.port1={close(){}};this.port2={close(){},postMessage:data=>this.port1.onmessage?.({data})};}
  const worker=version=>({postMessage:(request,ports)=>{assert.equal(request.type,'DRAFTI_BUILD_REQUEST');ports[0].postMessage({type:'DRAFTI_BUILD_RESPONSE',build:version});}});
  const sw={controller:worker(build),addEventListener:(name,fn)=>swEvents[name]=fn,
    register:async(url,options)=>{calls.registered++;assert.equal(url,'./sw.js');assert.equal(options.updateViaCache,'none');if(fail)throw Error('offline');return{update:async()=>{calls.updated++;if(fail)throw Error('offline');}};}};
  const c={location:{protocol,hostname,reload:()=>calls.reloaded++},navigator:{serviceWorker:sw},MessageChannel:Channel,
    document:{hidden:false,querySelector:()=>({content:build}),addEventListener:(name,fn)=>docEvents[name]=fn},
    addEventListener:(name,fn)=>events[name]=fn,Date:{now:()=>now},setTimeout:()=>1,clearTimeout(){},
    localStorage:{setItem(){throw Error('Update code must not rewrite player storage');},clear(){throw Error('Never wipe player storage');}}};
  vm.runInNewContext(source,c);await flush();
  return{c,events,swEvents,docEvents,calls,sw,worker,advance:()=>now+=31000};
}
(async()=>{
  const s=await setup();assert.equal(s.calls.registered,1);
  assert.equal(s.c.DRAFTI_UPDATE.applyAtMatchBoundary(),false);
  s.events.pageshow({persisted:false});await flush();assert.equal(s.calls.updated,1);
  s.docEvents.visibilitychange();await flush();assert.equal(s.calls.updated,1,'Repeated foreground events are throttled');
  s.sw.controller=s.worker('b'.repeat(64));s.swEvents.controllerchange();
  assert.equal(s.calls.reloaded,0,'Installing a release never interrupts the current game');
  assert.equal(s.c.DRAFTI_UPDATE.applyAtMatchBoundary(),true);assert.equal(s.calls.reloaded,1);
  assert.equal(s.c.DRAFTI_UPDATE.applyAtMatchBoundary(),true);assert.equal(s.calls.reloaded,1,'Only one reload is requested');
  const same=await setup();same.swEvents.controllerchange();assert.equal(same.c.DRAFTI_UPDATE.applyAtMatchBoundary(),false,'First install of the same release does not loop');
  const stale=await setup();stale.sw.controller=stale.worker('b'.repeat(64));
  assert.equal(stale.c.DRAFTI_UPDATE.applyAtMatchBoundary(),false,'An older initial controller is not mistaken for an update');
  stale.events.pageshow({persisted:true});await flush();assert.equal(stale.calls.reloaded,0);
  assert.equal(stale.c.DRAFTI_UPDATE.applyAtMatchBoundary(),true,'Restored pages detect their replaced controller');
  const offline=await setup('https:','drafti-afrika.vercel.app',true);offline.events.pageshow({});await flush();assert.equal(offline.calls.reloaded,0);
  for(const [protocol,host] of [['file:',''],['http:','example.test']]){const x=await setup(protocol,host);assert.equal(x.calls.registered,0);}
  assert.equal((await setup('http:','127.0.0.1')).calls.registered,1);
  const ui=fs.readFileSync(require('path').join(__dirname,'../src/ui.js'),'utf8').replace(/\r\n?/g,'\n');
  const start=ui.indexOf('    saveCurrentMatch();\n    if (globalThis.DRAFTI_UPDATE');
  const block=ui.slice(start,ui.indexOf('    // the host introduces',start));assert(start>0);
  for(const pending of [true,false]){const order=[];vm.runInNewContext('(function(){'+block+'})()',{
    saveCurrentMatch:()=>order.push('save'),scheduleAI:()=>order.push('search'),
    DRAFTI_UPDATE:{applyAtMatchBoundary:()=>{order.push('update');return pending;}}});
    assert.deepEqual(order,pending?['save','update']:['save','update','search'],'The new match is saved before an update can reload');}
  console.log('PASS installed updates: foreground checks, fresh release detection, no midgame reload or loop, offline/file safety and save-before-reload match boundaries');
})().catch(error=>{console.error(error);process.exitCode=1;});
