'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../web/sw.js'),'utf8');
async function cycle(scope){
  const bins=new Map(),events={},tasks=[];let skipped=0,claimed=0,online=true,requests=0;
  const url=value=>new URL(value,scope).href,key=request=>typeof request==='string'?request:request.url;
  function cache(name){if(!bins.has(name))bins.set(name,new Map());const data=bins.get(name);return{
    keys:async()=>[...data.keys()].map(value=>new Request(value)),
    match:async request=>data.get(key(request))?.clone(),
    put:async(request,response)=>data.set(key(request),response.clone()),
    addAll:async requests=>{const prepared=[];for(const request of requests){assert.equal(request.cache,'reload');prepared.push([request.url,new Response(request.url.endsWith('index.html')?'CURRENT RELEASE':'install asset')]);}for(const [id,value]of prepared)data.set(id,value);},
  };}
  const old=cache('drafti-install-old');await old.put(url('index.html'),new Response('OLD RELEASE'));
  await old.put(url('streamer-vocabulary/sj2_049.mp3'),new Response('preserved downloaded voice'));
  await old.put(url('streamer-vocabulary/manifest.json'),new Response('preserved voice manifest'));
  await cache('drafti-audience-existing').put(url('audience-pack.mp3'),new Response('preserved crowd'));
  vm.runInNewContext(source,{URL,Request,Response,TextDecoder,
    self:{registration:{scope},location:new URL(scope),skipWaiting:async()=>skipped++,clients:{claim:async()=>claimed++},addEventListener:(name,fn)=>events[name]=fn},
    caches:{open:async name=>cache(name),keys:async()=>[...bins.keys()],delete:async name=>bins.delete(name),
      match:async request=>{for(const data of bins.values())if(data.has(key(request)))return data.get(key(request)).clone();}},
    fetch:async request=>{if(!online)throw Error('offline');requests++;return new Response(typeof request==='string'?request:request.url);}});
  const run=async name=>{events[name]({waitUntil:task=>tasks.push(task)});await Promise.all(tasks.splice(0));};
  await run('install');assert.equal(skipped,1,'core-only app update installs without downloading optional recordings');
  assert.equal(requests,0,'required assets are fetched through install cache.addAll, optional pack network is untouched');
  await run('activate');assert.equal(claimed,1);assert(!bins.has('drafti-install-old'));
  const voices=bins.get('drafti-streamer-vocabulary-v1');
  assert.equal(await voices.get(url('streamer-vocabulary/sj2_049.mp3')).clone().text(),'preserved downloaded voice',
    'previously downloaded voice data survives an app update');
  assert.equal(await bins.get('drafti-audience-existing').get(url('audience-pack.mp3')).clone().text(),'preserved crowd');
  const navigate=async()=>{let response;events.fetch({request:{method:'GET',mode:'navigate',url:scope},respondWith:task=>response=task,waitUntil:task=>tasks.push(task)});return response;};
  online=false;assert.equal(await (await navigate()).text(),'CURRENT RELEASE','the installed core remains available offline');
  assert.equal(requests,0,'offline reopen uses the installed app without a network attempt');
  online=true;assert.equal(await (await navigate()).text(),'CURRENT RELEASE','cached core opens immediately even when online');
  assert.equal(requests,0,'navigation is served cache-first');
  online=false;
  let voice;events.fetch({request:{method:'GET',mode:'cors',url:url('streamer-vocabulary/sj2_049.mp3')},respondWith:task=>voice=task});
  assert.equal(await (await voice).text(),'preserved downloaded voice','legacy downloaded voices remain usable offline');
}
(async()=>{await cycle('https://drafti-afrika.vercel.app/');await cycle('https://risktaker-tz.github.io/DRAFTI/web/');
 console.log('PASS install update: cache-first offline core, no optional-pack startup transfer, preserved streamer and audience data on both hosts');
})().catch(error=>{console.error(error);process.exitCode=1;});
