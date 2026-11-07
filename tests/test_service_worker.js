'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert'),nodeCrypto=require('crypto'),crypto=nodeCrypto.webcrypto;
const source=fs.readFileSync(path.join(__dirname,'../web/sw.js'),'utf8');
const voice=Buffer.from('v'),voiceHash=nodeCrypto.createHash('sha256').update(voice).digest('hex');
const clips=Array.from({length:300},(_,index)=>{const id='sf2_'+String(index+1).padStart(3,'0');return{
  id,file:id+'.mp3',bytes:voice.length,sha256:voiceHash,durationSec:1
};});
const manifestBytes=Buffer.from(JSON.stringify(clips));
async function checkScope(scope){
 const handlers={},cachesByName=new Map(),deleted=[],pending=[];let online=true,skipped=0,claimed=0;
 const cache=(name)=>{if(!cachesByName.has(name))cachesByName.set(name,new Map());const entries=cachesByName.get(name);return{
   addAll:async assets=>{for(const request of assets){assert.equal(request.cache,'reload');entries.set(request.url,new Response(request.url.endsWith('index.html')?'new-build':'install asset'));}},
   put:async(key,value)=>entries.set(typeof key==='string'?new URL(key,scope).href:key.url,value.clone()),
   keys:async()=>[...entries.keys()].map(url=>new Request(url)),
   match:async key=>entries.get(typeof key==='string'?new URL(key,scope).href:key.url)?.clone(),
 };};
 cache('drafti-install-v2');
 const other=cache('other-app-cache');await other.put(new URL('keep.txt',scope).href,new Response('other app'));
 const build=source.match(/const BUILD = '([^']+)'/)[1],currentName='drafti-install-'+build;cache(currentName);const stored=cachesByName.get(currentName);
 const response={ok:true,version:'new-build',text:async()=> 'new-build',clone(){return {...this};}};
 const context={URL,Request,Response,TextDecoder,crypto,
  self:{location:new URL(scope),registration:{scope},skipWaiting:async()=>skipped++,clients:{claim:async()=>claimed++,},addEventListener:(name,fn)=>handlers[name]=fn},
  caches:{open:async name=>cache(name),keys:async()=>[...cachesByName.keys()],delete:async name=>{deleted.push(name);return cachesByName.delete(name);},
   match:async key=>{for(const entries of cachesByName.values()){const result=entries.get(typeof key==='string'?new URL(key,scope).href:key.url);if(result)return result.clone();}}},
  fetch:async request=>{if(!online)throw Error('offline');const url=typeof request==='string'?request:request.url;
   if(url.startsWith(new URL('./streamer-vocabulary/',scope).href))return url.endsWith('/manifest.json')?
    new Response(manifestBytes):new Response(voice,{headers:{'Content-Type':'audio/mpeg'}});
   return response;}};
 vm.runInNewContext(source,context);
 handlers.install({waitUntil:p=>pending.push(p)});await Promise.all(pending.splice(0));assert.equal(skipped,1,'new worker waits until its complete streamer pack is staged');
 const stage=cachesByName.get('drafti-streamer-vocabulary-v1-stage-'+build);
 assert.equal(stage.size,clips.length+1);
 assert.equal(await stage.get(new URL('streamer-vocabulary/sf2_001.mp3',scope).href).clone().text(),'v','staged audio is readable');
 handlers.activate({waitUntil:p=>pending.push(p)});await Promise.all(pending.splice(0));
 assert(!cachesByName.has('drafti-streamer-vocabulary-v1-stage-'+build),'complete pack is promoted and stage cache removed');
 async function navigation(url){let result;handlers.fetch({request:{method:'GET',url,mode:'navigate'},waitUntil:p=>pending.push(p),respondWith:p=>result=p});const res=await result;await Promise.all(pending.splice(0));return res;}
 stored.set(new URL('index.html',scope).href,new Response('old-build'));
 await navigation(scope);assert.equal((await stored.get(new URL('index.html',scope).href).text()),'new-build','online homepage refreshes its canonical offline entry');
 const requests=await (await cache('drafti-streamer-vocabulary-v1').match(new URL('streamer-vocabulary/manifest.json',scope).href)).json();
 assert.equal(requests.length,300,'all streamer sentences are ready in the installed offline pack');
 const networkBefore=online;online=false;
 assert.equal((await navigation(scope)).version,'new-build','offline homepage uses the installed latest game');
 let voiceResponse;handlers.fetch({request:{method:'GET',mode:'cors',url:new URL('streamer-vocabulary/sf2_001.mp3',scope).href},
  respondWith:p=>voiceResponse=p});
 assert.equal(Buffer.from(await (await voiceResponse).arrayBuffer()).toString(),'v','streamer clips play from cache offline');
 assert(deleted.includes('drafti-install-v2'));assert(!deleted.includes('other-app-cache'),'other app caches remain untouched');
 assert.equal(await other.match(new URL('keep.txt',scope).href).then(value=>value.text()),'other app');
 let reply;handlers.message({data:{type:'DRAFTI_BUILD_REQUEST'},ports:[{postMessage:value=>reply=value}]});
 assert.match(reply.build,/^[a-f0-9]{64}$/);assert.equal(reply.type,'DRAFTI_BUILD_RESPONSE');
 assert(networkBefore,'worker was installed with network before testing offline behavior');
}
(async()=>{await checkScope('https://drafti-afrika.vercel.app/');await checkScope('https://risktaker-tz.github.io/DRAFTI/web/');
 console.log('Service worker checks passed: verified streamer pack installation, cached offline playback, latest app fallback, and scoped cache cleanup');})().catch(error=>{console.error(error);process.exitCode=1;});
