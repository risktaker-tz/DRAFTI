'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),crypto=require('crypto').webcrypto;
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'web/sw.js'),'utf8');
const vocabularyRoot=path.join(root,'web/streamer-vocabulary'),manifestFile=path.join(vocabularyRoot,'manifest.json');
const clips=JSON.parse(fs.readFileSync(manifestFile,'utf8')),manifestBytes=fs.readFileSync(manifestFile);
async function cycle(scope){
  const bins=new Map(),events={},tasks=[];let skipped=0,claimed=0,online=true,serverError=false,failInstall=false,failStreamer=false;
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
  await old.put(url('streamer-vocabulary/sj2_049.mp3'),new Response('stale voice'));
  await old.put(url('streamer-vocabulary/manifest.json'),new Response('stale manifest'));
  await old.put(url('streamer-vocabulary/unexpected.mp3'),new Response('not an app voice'));
  await cache('drafti-audience-existing').put(url('audience-pack.mp3'),new Response('preserved crowd'));
  vm.runInNewContext(source,{URL,Request,Response,TextDecoder,crypto,self:{registration:{scope},location:new URL(scope),
    skipWaiting:async()=>skipped++,clients:{claim:async()=>claimed++},addEventListener:(name,fn)=>events[name]=fn},
    caches:{open:async name=>cache(name),keys:async()=>[...bins.keys()],delete:async name=>bins.delete(name),
      match:async request=>{for(const data of bins.values())if(data.has(key(request)))return data.get(key(request)).clone();}},
    fetch:async request=>{if(!online)throw Error('offline');const requestUrl=typeof request==='string'?request:request.url;
      if(requestUrl.startsWith(new URL('./streamer-vocabulary/',scope).href)){
        if(requestUrl.endsWith('/manifest.json'))return new Response(manifestBytes);
        const filename=new URL(requestUrl).pathname.split('/').pop();
        if(failStreamer&&filename==='sf2_005.mp3')return new Response('temporarily unavailable',{status:503});
        if(clips.some(clip=>clip.file===filename))return new Response(fs.readFileSync(path.join(vocabularyRoot,filename)),{headers:{'Content-Type':'audio/mpeg'}});
        return new Response('Not found',{status:404});
      }
      return new Response(serverError?'outage':'CURRENT RELEASE',{status:serverError?503:200});}});
  const run=async name=>{events[name]({waitUntil:task=>tasks.push(task)});await Promise.all(tasks.splice(0));};
  failInstall=true;await assert.rejects(run('install'),/Incomplete download/);assert.equal(skipped,0);assert(bins.has('drafti-install-v3'));
  failInstall=false;failStreamer=true;
  await assert.rejects(run('install'),/Streamer recording unavailable/);
  assert.equal(skipped,0,'an incomplete streamer pack cannot activate');
  assert(bins.has('drafti-install-v3'),'the previous working app remains installed after a pack failure');
  assert(![...bins.keys()].some(name=>name.includes('-stage-')),'partial staging cache is removed');
  failStreamer=false;await run('install');assert.equal(skipped,1);
  await run('activate');assert.equal(claimed,1);assert(!bins.has('drafti-install-v3'));
  const voices=bins.get('drafti-streamer-vocabulary-v1');
  assert.equal(voices.size,clips.length+1,'upgrade stages the complete current voice pack before activation');
  const currentVoice=fs.readFileSync(path.join(vocabularyRoot,'sj2_049.mp3'));
  assert.deepEqual(Buffer.from(await voices.get(url('streamer-vocabulary/sj2_049.mp3')).arrayBuffer()),currentVoice,
    'fresh verified audio replaces stale cached bytes');
  assert.deepEqual(Buffer.from(await voices.get(url('streamer-vocabulary/manifest.json')).arrayBuffer()),manifestBytes,
    'fresh manifest replaces stale metadata');
  assert(!voices.has(url('streamer-vocabulary/unexpected.mp3')));
  assert.equal(await bins.get('drafti-audience-existing').get(url('audience-pack.mp3')).text(),'preserved crowd');
  const navigate=async()=>{let response;events.fetch({request:{method:'GET',mode:'navigate',url:scope},respondWith:task=>response=task,waitUntil:task=>tasks.push(task)});const result=await response;await Promise.all(tasks.splice(0));return result.text();};
  online=false;assert.equal(await navigate(),'CURRENT RELEASE','New installed core remains available offline');
  online=true;serverError=true;assert.equal(await navigate(),'CURRENT RELEASE','A server outage cannot replace the working offline core');
}
(async()=>{await cycle('https://drafti-afrika.vercel.app/');await cycle('https://risktaker-tz.github.io/DRAFTI/web/');console.log(`PASS install upgrade: complete ${clips.length}-clip offline pack, stale cache replacement, audience preservation, failed-update safety and outage fallback on both hosts`);})().catch(error=>{console.error(error);process.exitCode=1;});
