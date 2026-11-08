'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../web/sw.js'),'utf8');
async function check(scope){
  const routes=new Map(),bins=new Map();let online=true,network=0,streamerNetwork=0;
  const absolute=request=>new URL(request.url||request,scope).href;
  function cache(name){if(!bins.has(name))bins.set(name,new Map());const data=bins.get(name);return{
    addAll:async requests=>{for(const request of requests){const name=new URL(request.url).pathname.split('/').pop();data.set(request.url,new Response(name==='index.html'?'cached-current-game':name));}},
    keys:async()=>[...data.keys()].map(url=>new Request(url)),
    match:async request=>data.get(absolute(request))?.clone(),
    put:async(request,response)=>data.set(absolute(request),response.clone()),
  };}
  const old=cache('drafti-install-old');await old.put(absolute('index.html'),new Response('older app'));
  const context={URL,Request,Response,TextDecoder,
    self:{location:new URL(scope),registration:{scope},skipWaiting:async()=>{},clients:{claim:async()=>{},},addEventListener:(n,f)=>routes.set(n,f)},
    caches:{open:async name=>cache(name),keys:async()=>[...bins.keys()],delete:async name=>bins.delete(name),
      match:async request=>{for(const value of bins.values()){const response=value.get(absolute(request));if(response)return response.clone();}}},
    fetch:async request=>{if(!online)throw Error('offline');network++;const url=absolute(request);
      if(url.includes('/streamer-vocabulary/'))streamerNetwork++;
      return new Response(url);}};
  vm.runInNewContext(source,context);
  let install;routes.get('install')({waitUntil:p=>install=p});await install;
  let activate;routes.get('activate')({waitUntil:p=>activate=p});await activate;
  assert(![...bins.keys()].some(name=>name.includes('stage')),'worker installation does not stage optional packs');
  assert(![...bins.values()].some(items=>[...items.keys()].some(url=>url.includes('/streamer-vocabulary/'))),
    'optional voice files are not fetched or cached on app startup');
  const installedNetwork=network;
  const request=async(pathname,mode='cors',cache='default')=>{
    let pending;routes.get('fetch')({request:{method:'GET',mode,cache,url:absolute(pathname)},respondWith:p=>pending=p});
    return pending;
  };
  online=false;
  assert.equal(await (await request('?offline','navigate')).text(),'cached-current-game','core app reopens offline');
  assert.equal(network,installedNetwork,'cached startup makes no network request');
  assert.equal((await request('streamer-vocabulary/sf2_001.mp3')).type,'error',
    'optional voices remain optional until the user downloads them');
  online=true;
  assert((await request('streamer-vocabulary/sf2_001.mp3')).ok,'optional voice download can reach the hosted pack');
  assert.equal(streamerNetwork,1);
  assert.equal(network,installedNetwork+1,'cache-first game startup does not revalidate the page');
  assert(!bins.has('drafti-install-old'),'stale DRAFTI install cache is retired');
  assert(bins.has('other-app-cache')===false,'the worker only cleans its own cache namespace');
}
(async()=>{
  await check('https://drafti-afrika.vercel.app/');
  await check('https://risktaker-tz.github.io/DRAFTI/web/');
  console.log('PASS offline startup: core game opens cache-first without network; optional voices download only on request on both host scopes');
})().catch(error=>{console.error(error);process.exitCode=1;});
