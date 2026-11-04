'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'../web/sw.js'),'utf8');
async function cycle(scope){
  const bins=new Map(),events={},tasks=[];let skipped=0,claimed=0,online=true,serverError=false,failInstall=false;
  const url=path=>new URL(path,scope).href;
  const key=request=>typeof request==='string'?request:request.url;
  function cache(name){if(!bins.has(name))bins.set(name,new Map());const data=bins.get(name);return{
    keys:async()=>[...data.keys()].map(value=>new Request(value)),
    match:async request=>data.get(key(request))?.clone(),
    put:async(request,response)=>data.set(key(request),response.clone()),
    addAll:async requests=>{if(failInstall)throw Error('Incomplete download');const fetched=[];for(const request of requests){assert.equal(request.cache,'reload');fetched.push([request.url,new Response(request.url.endsWith('index.html')?'CURRENT RELEASE':'install asset')]);}for(const [id,value]of fetched)data.set(id,value);},
  };}
  const old=cache('drafti-install-v3');
  await old.put(url('index.html'),new Response('OLD RELEASE'));
  await old.put(url('streamer-vocabulary/sj2_049.mp3'),new Response('preserved voice'));
  await old.put(url('streamer-vocabulary/manifest.json'),new Response('preserved voice manifest'));
  await old.put(url('streamer-vocabulary/unexpected.mp3'),new Response('not an app voice'));
  await cache('drafti-audience-existing').put(url('audience-pack.mp3'),new Response('preserved crowd'));
  vm.runInNewContext(source,{URL,Request,Response,self:{registration:{scope},location:new URL(scope),
    skipWaiting:async()=>skipped++,clients:{claim:async()=>claimed++},addEventListener:(name,fn)=>events[name]=fn},
    caches:{open:async name=>cache(name),keys:async()=>[...bins.keys()],delete:async name=>bins.delete(name),
      match:async request=>{for(const data of bins.values())if(data.has(key(request)))return data.get(key(request)).clone();}},
    fetch:async()=>{if(!online)throw Error('offline');return new Response(serverError?'outage':'CURRENT RELEASE',{status:serverError?503:200});}});
  const run=async name=>{events[name]({waitUntil:task=>tasks.push(task)});await Promise.all(tasks.splice(0));};
  failInstall=true;await assert.rejects(run('install'),/Incomplete download/);assert.equal(skipped,0);assert(bins.has('drafti-install-v3'));
  failInstall=false;await run('install');assert.equal(skipped,1);
  await run('activate');assert.equal(claimed,1);assert(!bins.has('drafti-install-v3'));
  const voices=bins.get('drafti-streamer-vocabulary-v1');
  assert.equal(await voices.get(url('streamer-vocabulary/sj2_049.mp3')).text(),'preserved voice');
  assert.equal(await voices.get(url('streamer-vocabulary/manifest.json')).text(),'preserved voice manifest');
  assert(!voices.has(url('streamer-vocabulary/unexpected.mp3')));
  assert.equal(await bins.get('drafti-audience-existing').get(url('audience-pack.mp3')).text(),'preserved crowd');
  const navigate=async()=>{let response;events.fetch({request:{method:'GET',mode:'navigate',url:scope},respondWith:task=>response=task,waitUntil:task=>tasks.push(task)});const result=await response;await Promise.all(tasks.splice(0));return result.text();};
  online=false;assert.equal(await navigate(),'CURRENT RELEASE','New installed core remains available offline');
  online=true;serverError=true;assert.equal(await navigate(),'CURRENT RELEASE','A server outage cannot replace the working offline core');
}
(async()=>{await cycle('https://drafti-afrika.vercel.app/');await cycle('https://risktaker-tz.github.io/DRAFTI/web/');console.log('PASS install upgrade: latest offline core, legacy cached voice migration, audience preservation, invalid-file exclusion and outage fallback on both hosts');})().catch(error=>{console.error(error);process.exitCode=1;});
