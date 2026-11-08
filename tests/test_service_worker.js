'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../web/sw.js'),'utf8');
async function checkScope(scope){
 const handlers={},bins=new Map();let online=true,network=0,skipped=0,claimed=0;
 const absolute=request=>new URL(request.url||request,scope).href,key=request=>typeof request==='string'?request:request.url;
 const cache=name=>{if(!bins.has(name))bins.set(name,new Map());const data=bins.get(name);return{
   addAll:async requests=>{for(const request of requests){const filename=new URL(request.url).pathname.split('/').pop();data.set(request.url,new Response(filename==='index.html'?'latest app':'install asset'));}},
   put:async(request,response)=>data.set(key(request),response.clone()),
   keys:async()=>[...data.keys()].map(url=>new Request(url)),
   match:async request=>data.get(key(request))?.clone(),
 };};
 const previous=cache('drafti-install-previous');await previous.put(absolute('index.html'),new Response('old app'));
 await previous.put(absolute('streamer-vocabulary/manifest.json'),new Response('legacy manifest'));
 await previous.put(absolute('streamer-vocabulary/sf2_001.mp3'),new Response('previously downloaded voice'));
 cache('drafti-streamer-vocabulary-v1-stage-obsolete');
 const unrelated=cache('another-project-cache');await unrelated.put(absolute('keep.txt'),new Response('keep'));
 const build=source.match(/const BUILD = '([^']+)'/)[1],current=cache('drafti-install-'+build);
 const context={URL,Request,Response,TextDecoder,
  self:{location:new URL(scope),registration:{scope},skipWaiting:async()=>skipped++,clients:{claim:async()=>claimed++},addEventListener:(n,f)=>handlers[n]=f},
  caches:{open:async name=>cache(name),keys:async()=>[...bins.keys()],delete:async name=>bins.delete(name),
    match:async request=>{for(const data of bins.values()){const response=data.get(key(request));if(response)return response.clone();}}},
  fetch:async request=>{if(!online)throw Error('offline');network++;return new Response(key(request));}};
 vm.runInNewContext(source,context);
 const tasks=[];handlers.install({waitUntil:promise=>tasks.push(promise)});await Promise.all(tasks.splice(0));
 assert.equal(skipped,1,'core install is not held on the optional pack');
 const installAssets=await current.keys();assert(installAssets.some(request=>request.url.endsWith('/index.html')));
 assert(!installAssets.some(request=>request.url.includes('streamer-vocabulary')),'worker install downloads no optional voices');
 handlers.activate({waitUntil:promise=>tasks.push(promise)});await Promise.all(tasks.splice(0));
 assert.equal(claimed,1);assert(!bins.has('drafti-install-previous'));
 assert(!bins.has('drafti-streamer-vocabulary-v1-stage-obsolete'),'interrupted legacy pack stages are cleaned up');
 assert(bins.has('another-project-cache'),'unrelated app caches are preserved');
 const navigate=async()=>{let result;handlers.fetch({request:{method:'GET',url:scope,mode:'navigate'},respondWith:p=>result=p});return result;};
 const before=network;online=false;assert.equal(await (await navigate()).text(),'latest app','cached latest game launches offline');
 assert.equal(network,before,'game startup uses no network');
 const legacyVoice=async()=>{let result;handlers.fetch({request:{method:'GET',url:absolute('streamer-vocabulary/sf2_001.mp3'),mode:'cors'},respondWith:p=>result=p});return result;};
 assert.equal(await (await legacyVoice()).text(),'previously downloaded voice','existing offline packs are retained');
 online=true;let newVoice;handlers.fetch({request:{method:'GET',url:absolute('streamer-vocabulary/sf2_002.mp3'),mode:'cors'},respondWith:p=>newVoice=p});
 assert.equal(await (await newVoice).text(),absolute('streamer-vocabulary/sf2_002.mp3'),'pack assets can be fetched on request');
 assert.equal(network,before+1);
 let refreshedVoice;handlers.fetch({request:{method:'GET',cache:'reload',url:absolute('streamer-vocabulary/sf2_001.mp3'),mode:'cors'},respondWith:p=>refreshedVoice=p});
 assert.equal(await (await refreshedVoice).text(),absolute('streamer-vocabulary/sf2_001.mp3'),
   'explicit pack updates bypass older cached recordings when checking the latest data');
 online=false;let missing;handlers.fetch({request:{method:'GET',url:absolute('streamer-vocabulary/sf2_002.mp3'),mode:'cors'},respondWith:p=>missing=p});
 assert.equal((await missing).type,'error','not-downloaded optional data is not falsely reported as offline-ready');
 let reply;handlers.message({data:{type:'DRAFTI_BUILD_REQUEST'},ports:[{postMessage:value=>reply=value}]});
 assert.match(reply.build,/^[a-f0-9]{64}$/);assert.equal(reply.type,'DRAFTI_BUILD_RESPONSE');
}
(async()=>{await checkScope('https://drafti-afrika.vercel.app/');await checkScope('https://risktaker-tz.github.io/DRAFTI/web/');
 console.log('Service worker checks passed: offline-first core, explicit optional fetches, legacy pack preservation and safe scoped cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});
