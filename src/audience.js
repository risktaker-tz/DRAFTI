'use strict';
// Optional crowd recordings live outside the self-contained core. Installing is
// explicit and atomic; playback is lazy, bounded and always owned by its game.
function validateAudiencePack(value) {
  const events=['cheer','cheer_kids','applause','gasp','disappointment','encouragement_chant','funny_laugh','whistle','tension_bed','chatter_bed','venue_bed'];
  if(value?.schema!=='drafti-audience-pack/1'||!Array.isArray(value.clips)||!value.clips.length||value.clips.length>1000)throw Error('Invalid audience pack');
  const ids=new Set(),sources=new Set();let total=0;
  for(const c of value.clips){
    const bed=c.event?.endsWith('_bed');
    if(!/^avpb-[0-9]+$/.test(c.id)||c.file!=='audio/'+c.id+'.mp3'||ids.has(c.id)||sources.has(c.sourceId)||
      !['A','B'].includes(c.crowd)||!events.includes(c.event)||!/^[a-f0-9]{64}$/.test(c.sha256)||
      !Number.isSafeInteger(c.bytes)||c.bytes<1||c.bytes>120000||!Number.isFinite(c.durationSec)||
      c.durationSec<(bed?8:.8)||c.durationSec>(bed?15.5:6.5)||c.review?.verdict!=='approved')throw Error('Invalid audience recording');
    ids.add(c.id);sources.add(c.sourceId);total+=c.bytes;
  }
  if(total>32*1024*1024)throw Error('Audience pack too large');
  return value;
}
function createAudienceVibes(env) {
  const base=new URL('./audience-vibes/',env.location.href),markerURL=new URL('installed.json',base).href;
  const indexName='drafti-audience-index-v1',prefix='drafti-audience-audio-v1-';
  const buffers=new Map(),active=new Set(),lastIds=[],lastEvents=new Map(),counts=new Map();
  let installed=null,installing=false,epoch=null,serial=0,pending=[],lastReaction=-Infinity,nextBed=0,checking=false,jokes=0;
  const now=()=>env.now(),status=text=>env.status(text),settings=env.settings;
  const digest=async bytes=>Array.from(new Uint8Array(await env.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const capable=()=>!!env.caches&&!!env.crypto?.subtle&&/^https?:$/.test(env.location.protocol);
  const report=()=>installed ? installed.manifest.clips.length+' audience recordings ready for offline play.' : 'Optional audience pack · not downloaded.';
  const permitted=()=>{const c=env.context();return settings.audienceEnabled&&settings.sound&&!c.menu&&!c.hidden&&!c.paused&&!c.conflict&&!c.ceremony&&env.bank.sceneLockUntil<=now();};
  function stop(){serial++;pending=[];for(const a of active){try{a.source.stop();}catch{}}active.clear();}
  function reset(){stop();epoch=env.context().epoch;counts.clear();jokes=0;nextBed=now()+2000;}
  async function init(){
    if(!capable()){status('Download the audience pack from the online game. Core game sounds remain available offline.');return;}
    try{
      const cache=await env.caches.open(indexName),r=await cache.match(markerURL);
      if(r){const saved=await r.json();validateAudiencePack(saved.manifest);
        if(typeof saved.cache==='string'&&saved.cache.startsWith(prefix)&&await env.caches.has(saved.cache))installed=saved;}
      status(report());
    }catch{status('Audience download unavailable. You can retry without changing your game.');}
  }
  async function install(){
    if(installing)return false;if(!capable()){status('Open the online game to download audience recordings.');return false;}
    installing=true;let staging='';
    try{
      const r=await env.fetch(new URL('manifest.json',base).href,{cache:'no-store'});if(!r.ok)throw Error('Pack unavailable');
      const raw=await r.arrayBuffer(),manifest=validateAudiencePack(JSON.parse(new TextDecoder().decode(raw)));
      staging=prefix+await digest(raw);const cache=await env.caches.open(staging);let done=0;
      for(const c of manifest.clips){
        const url=new URL(c.file,base).href;let response=await cache.match(url);
        if(!response&&installed)response=await(await env.caches.open(installed.cache)).match(url);
        let bytes=response?await response.arrayBuffer():null;
        if(!bytes||bytes.byteLength!==c.bytes||await digest(bytes)!==c.sha256){
          response=await env.fetch(url);if(!response.ok)throw Error('Recording unavailable');bytes=await response.arrayBuffer();
          if(bytes.byteLength!==c.bytes||await digest(bytes)!==c.sha256)throw Error('Recording check failed');
        }
        await cache.put(url,new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}}));
        status('Downloading audience · '+(++done)+' / '+manifest.clips.length);
      }
      const next={cache:staging,manifest},index=await env.caches.open(indexName);
      await index.put(markerURL,new Response(JSON.stringify(next),{headers:{'Content-Type':'application/json'}}));
      const previous=installed;stop();installed=next;buffers.clear();
      if(previous&&previous.cache!==staging)await env.caches.delete(previous.cache).catch(()=>{});
      status(report());return true;
    }catch{if(staging&&staging!==installed?.cache)await env.caches.delete(staging).catch(()=>{});status('Audience download paused. Retry to keep going; your previous pack is safe.');return false;}
    finally{installing=false;}
  }
  async function remove(){
    stop();settings.audienceEnabled=false;env.save();
    if(installed)await env.caches.delete(installed.cache);
    if(capable())await(await env.caches.open(indexName)).delete(markerURL);
    installed=null;buffers.clear();status(report());
  }
  async function load(c){
    if(buffers.has(c.id)){const b=buffers.get(c.id);buffers.delete(c.id);buffers.set(c.id,b);return b;}
    const cache=await env.caches.open(installed.cache),response=await cache.match(new URL(c.file,base).href);
    if(!response)return null;const bytes=await response.arrayBuffer();
    if(bytes.byteLength!==c.bytes||await digest(bytes)!==c.sha256)return null;
    const ctx=env.fx.ensure();if(!ctx)return null;const decoded=await ctx.decodeAudioData(bytes);
    buffers.set(c.id,decoded);while(buffers.size>8)buffers.delete(buffers.keys().next().value);return decoded;
  }
  function choose(side,event){
    const crowd=side===1?'A':'B',types=event==='cheer'?['cheer','cheer_kids']:[event];
    let pool=installed.manifest.clips.filter(c=>c.crowd===crowd&&types.includes(c.event)&&!lastIds.slice(-12).includes(c.id));
    if(!pool.length&&event==='encouragement_chant')pool=installed.manifest.clips.filter(c=>c.crowd===crowd&&c.event==='applause'&&!lastIds.slice(-12).includes(c.id));
    return pool.length?pool[Math.floor(env.random()*pool.length)]:null;
  }
  function crowdGain(level,bed,ducked){
    const volume=Math.max(0,Math.min(1,settings.audienceVolume??.35));
    const boost=1+2.5*Math.max(0,(volume-.35)/.65);
    return Math.min(bed?.24:.78,level*volume*boost)*(ducked?.12:1);
  }
  async function play(side,event,bed=false){
    if(!installed||!permitted())return false;
    if([...env.bank.activeSources.values()].some(a=>a.spoken)&&!bed)return false;
    const c=choose(side,event);if(!c)return false;
    const token=serial,game=env.context().epoch,buffer=await load(c);
    if(!buffer||token!==serial||game!==env.context().epoch||!permitted()||(!bed&&[...env.bank.activeSources.values()].some(a=>a.spoken)))return false;
    const ctx=env.fx.ensure(),source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.playbackRate.value=1;
    const compensate=Math.min(2.5,Math.pow(10,(-24-(Number.isFinite(c.loudnessLufs)?c.loudnessLufs:-24))/20));
    const level=(bed?.035:.24)*compensate;
    const speaking=[...env.bank.activeSources.values()].some(a=>a.spoken||a.priority>=70);
    gain.gain.value=crowdGain(level,bed,speaking);source.connect(gain);
    const pan=ctx.createStereoPanner?.();if(pan){pan.pan.value=side===1?-.32:.32;gain.connect(pan);pan.connect(env.fx.out||ctx.destination);}else gain.connect(env.fx.out||ctx.destination);
    const record={source,gain,pan,bed,side,level,spoken:!!c.speech};active.add(record);
    source.onended=()=>{active.delete(record);source.disconnect();gain.disconnect();pan?.disconnect();};source.start();
    lastIds.push(c.id);if(lastIds.length>30)lastIds.shift();
    if(!bed)lastReaction=now();env.played?.({id:c.id,event:c.event,purpose:event,side,crowd:c.crowd,bed,durationSec:c.durationSec});return true;
  }
  function bankStarted(info){
    if(info.priority>=100){stop();return;}
    if(info.spoken||info.priority>=70)for(const a of active){
      if(a.spoken&&!a.bed){try{a.source.stop();}catch{}}else a.gain.gain.setTargetAtTime(crowdGain(a.level,a.bed,true),env.fx.ctx.currentTime,.06);
    }
  }
  function cue(side,event,priority){
    const c=env.context(),key=side+':'+event;
    if(!permitted()||!installed||now()-(lastEvents.get(key)??-Infinity)<18000||(counts.get(key)||0)>=4)return;
    pending=pending.filter(p=>p.side!==side);pending.push({side,event,priority,at:now(),epoch:c.epoch});pending.sort((a,b)=>b.priority-a.priority);pending=pending.slice(0,2);
    return true;
  }
  function move(side,captures,crowned,remaining){
    if(captures>=2)cue(side,'cheer',60);else if(captures&&env.random()<.35)cue(side,'applause',40);
    if(captures>=2&&remaining<=5)cue(-side,'encouragement_chant',30);
    else if(captures>=2&&env.random()<.35)cue(-side,'gasp',45);
    if(crowned)cue(side,'applause',55);
  }
  function mistake(side){if(!jokes&&env.random()<.12&&cue(-side,'funny_laugh',45))jokes++;}
  function finish(winner){if(winner){const sympathy=env.random()<.25;cue(winner,'cheer',sympathy?55:80);cue(-winner,'disappointment',sympathy?70:45);}else{for(const side of env.random()<.5?[1,-1]:[-1,1])cue(side,'applause',50);}}
  async function pulse(){
    const c=env.context();if(c.epoch!==epoch)reset();
    if(!permitted()){if(active.size)stop();return;}
    const bankSources=[...env.bank.activeSources.values()];
    const speaking=bankSources.some(a=>a.spoken);
    const ducked=speaking||bankSources.some(a=>a.priority>=70);
    for(const a of active)a.gain.gain.setTargetAtTime(crowdGain(a.level,a.bed,ducked),env.fx.ctx.currentTime,.1);
    if(checking||!installed)return;checking=true;
    try{
      pending=pending.filter(p=>p.epoch===c.epoch&&now()-p.at<1800);
      if(!speaking&&now()-lastReaction>=6500&&!Array.from(active).some(a=>!a.bed)&&pending.length){
        const p=pending.shift();if(await play(p.side,p.event)){const k=p.side+':'+p.event;lastEvents.set(k,now());counts.set(k,(counts.get(k)||0)+1);}
      }
      if(!c.over&&now()>=nextBed){
        for(const side of [1,-1])if(!Array.from(active).some(a=>a.bed&&a.side===side)){
          for(const event of c.tension?['tension_bed','chatter_bed','venue_bed']:['chatter_bed','venue_bed'])if(await play(side,event,true))break;
        }
        nextBed=now()+10000+env.random()*8000;
      }
    }catch{status('Audience playback is resting. Your game continues normally.');}finally{checking=false;}
  }
  return {init,install,remove,reset,stop,pulse,move,mistake,finish,bankStarted,installed:()=>!!installed,installing:()=>installing};
}
