'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
async function checkScope(scope){
 const handlers={},stored=new Map(),deleted=[],pending=[];let online=true;
 const source=fs.readFileSync(path.join(__dirname,'../web/sw.js'),'utf8');
 const response={ok:true,version:'new-build',clone(){return {...this};}};
 const context={URL,Response:{error:()=>({error:true})},self:{location:{origin:new URL(scope).origin},registration:{scope},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn},
  caches:{open:async()=>({addAll:async()=>{},put:async(key,value)=>stored.set(typeof key==='string'?key:key.url,value)}),keys:async()=>['drafti-install-v2','other-app-cache'],delete:async key=>deleted.push(key),match:async key=>stored.get(typeof key==='string'?new URL(key,scope).href:key.url)},
  fetch:async()=>{if(!online)throw Error('offline');return response;}};
 vm.runInNewContext(source,context);
 async function navigation(url){let result;handlers.fetch({request:{method:'GET',url,mode:'navigate'},waitUntil:p=>pending.push(p),respondWith:p=>result=p});const res=await result;await Promise.all(pending.splice(0));return res;}
 stored.set(new URL('index.html',scope).href,{version:'old-build'});
 await navigation(scope);assert.equal(stored.get(new URL('index.html',scope).href).version,'new-build','Online homepage refreshes canonical offline entry');
 online=false;assert.equal((await navigation(scope)).version,'new-build','Offline homepage uses latest online build');
 handlers.activate({waitUntil:p=>pending.push(p)});await Promise.all(pending.splice(0));
 assert(deleted.includes('drafti-install-v2'));assert(!deleted.includes('other-app-cache'),'Other apps’ caches remain untouched');
}
(async()=>{await checkScope('https://drafti.vercel.app/');await checkScope('https://risktaker-tz.github.io/DRAFTI/web/');console.log('Service worker checks passed: root/subpath homepage refresh, offline latest build, scoped cache cleanup');})().catch(e=>{console.error(e);process.exitCode=1;});
