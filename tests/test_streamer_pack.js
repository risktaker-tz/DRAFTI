'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../src/streamer_pack.js'),'utf8');
const digest=async bytes=>Buffer.from(await webcrypto.subtle.digest('SHA-256',bytes)).toString('hex');
async function manifestFor(version){
  const clips=[];
  for(let i=1;i<=3;i++){
    const id='sf2_'+String(i).padStart(3,'0'),bytes=Buffer.from('voice '+version+' '+id.slice(-3));
    clips.push({id,file:id+'.mp3',mode:'female',bytes:bytes.length,sha256:await digest(bytes),durationSec:1});
  }
  return{clips,assets:new Map(clips.map(c=>[c.file,Buffer.from('voice '+version+' '+c.id.slice(-3))]))};
}
async function run(){
  const scope='https://drafti-afrika.vercel.app/',base=new URL('./streamer-vocabulary/',scope);
  const bins=new Map(),statuses=[],errors=[];let online=false,pack=await manifestFor('v1'),requests=0,failFile='';
  const key=request=>new URL(request.url||request,scope).href;
  const caches={
    async open(name){if(!bins.has(name)){const data=new Map();bins.set(name,data);return api(data);}return api(bins.get(name));},
    async keys(){return[...bins.keys()];},async delete(name){return bins.delete(name);},
  };
  function api(data){return{async match(request){return data.get(key(request))?.clone();},
    async put(request,response){data.set(key(request),response.clone());},
    async delete(request){return data.delete(key(request));},async keys(){return[...data.keys()].map(url=>new Request(url));}};}
  const env={location:{href:scope,protocol:'https:'},caches,crypto:webcrypto,status:text=>statuses.push(text),onError:error=>errors.push(error),
    async fetch(url){requests++;if(!online)throw Error('offline');const target=new URL(url,scope);
      if(target.href===new URL('manifest.json',base).href)
        return new Response(JSON.stringify(pack.clips),{headers:{'Content-Type':'application/json'}});
      const filename=target.pathname.split('/').pop();if(filename===failFile)return new Response('unavailable',{status:503});
      const bytes=pack.assets.get(filename);return bytes?new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}}):new Response('not found',{status:404});}};
  const context={URL,Request,Response,TextDecoder,createStreamerPackStore:null};
  vm.runInNewContext(source,context);const create=context.createStreamerPackStore;
  const store=create(env);assert.equal(await store.init(),null);assert.equal(requests,0,'offline pack status is read locally without network');
  assert.equal(await store.install(),false,'optional pack download is explicit and requires connectivity');
  online=true;assert.equal(await store.install(),true,'the current pack installs from the menu: '+statuses.at(-1)+' '+errors.at(-1));
  assert.equal(store.installed().manifest.length,3);const oldCache=store.installed().cache;
  const before=await store.read(store.installed().manifest[0]);assert.equal(Buffer.from(before).toString(),'voice v1 001');
  online=false;
  const reloaded=create(env);assert.equal((await reloaded.init()).cache,oldCache,'the downloaded pack survives an offline app reopen');
  const readsBefore=requests;assert.equal(Buffer.from(await reloaded.read(reloaded.installed().manifest[2])).toString(),'voice v1 003');
  assert.equal(requests,readsBefore,'offline voice playback reads only local pack bytes');
  pack=await manifestFor('v2');online=true;failFile='sf2_002.mp3';
  assert.equal(await reloaded.install(),false,'an interrupted update is rejected');
  assert.equal(reloaded.installed().cache,oldCache,'interrupted update keeps the prior pack active');
  assert.equal(Buffer.from(await reloaded.read(reloaded.installed().manifest[1])).toString(),'voice v1 002');
  failFile='';assert.equal(await reloaded.install(),true,'the update action retrieves the latest manifest and assets');
  assert.notEqual(reloaded.installed().cache,oldCache);assert.equal(Buffer.from(await reloaded.read(reloaded.installed().manifest[0])).toString(),'voice v2 001');
  assert(!bins.has(oldCache),'old pack is retired only after successful activation');
  const latestCache=reloaded.installed().cache;await reloaded.remove();assert.equal(reloaded.installed(),null);assert(!bins.has(latestCache));
  const final=create(env);assert.equal(await final.init(),null,'removal is remembered on the next app start');
  assert(statuses.some(text=>text.includes('ready offline')),'download readiness is reported');
  assert(statuses.every(text=>!text.includes('3 recordings')&&!/\b[1-3] \/ 3\b/.test(text)),
    'player-facing pack updates never disclose how many voice lines are included');
  assert(statuses.some(text=>text.includes('MB')),'pack progress and readiness communicate size only');
  const template=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
  assert(!/Streamer voices[^\n]*\b300\b/i.test(template),'the menu does not expose the vocabulary count');
  console.log('PASS optional streamer pack: offline-safe startup, explicit download, verified latest update, rollback and removal');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
