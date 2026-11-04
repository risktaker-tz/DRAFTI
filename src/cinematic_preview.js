/* Optional cinematic review layer. No rules, search budgets or original audio are changed. */
(() => {
  'use strict';
  const app=window.__drafti;if(!app)return;
  const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
  const catalogue=[
    ['b1','Board','Directional edge lights'],['b2','Board','Landing ripples'],['b3','Board','Capture fracture shimmer'],
    ['b4','Board','Multi-capture energy paths'],['b5','Board','Advantage sweeps'],['b6','Board','Promotion runway lights'],
    ['b7','Board','Last-stand square pulses'],['b8','Board','Clutch-move focus'],['b9','Board','Victory perimeter lights'],['b10','Board','Balanced draw waves'],
    ['p1','Pieces','Soft impact compression'],['p2','Pieces','Directional movement lean'],['p3','Pieces','Material-aware glints'],
    ['p4','Pieces','Multi-capture charge halos'],['p5','Pieces','Crowning spark orbits'],['p6','Pieces','Winner salutes'],
    ['p7','Pieces','Threat reactions'],['p8','Pieces','Hint-wink sparkles'],['p9','Pieces','Survivor relief reactions'],['p10','Pieces','Fading movement echoes'],
    ['a1','Background','Active-side spotlights'],['a2','Background','Team-coloured crowd washes'],['a3','Background','Pointer-responsive lighting'],
    ['a4','Background','Theme-matched atmosphere'],['a5','Background','Tournament mood lighting'],['a6','Background','Comeback horizon glow'],
    ['a7','Background','Crowning aurora'],['a8','Background','Celebration sparkles'],['a9','Background','Calm draw transitions'],['a10','Background','Intermission ambience'],
  ];
  const KEY='drafti.cinema.preview.v1';let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
  const options={enabled:saved.enabled!==false,energy:['subtle','balanced','stream'].includes(saved.energy)?saved.energy:'balanced',disabled:new Set(saved.disabled||[])};
  const liveNodes=new Set(),timers=new Set(),motions=new Set(),played=[],director=createCinematicDirector();
  let plane,atmosphere,epoch=0,latest=null,previousThreats=new Set(),previousBoard=[],pointerFrame=0,lastIntermission='',phaseKey='',phaseAt=0,stageKey='',pointerUntil=0;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const energy=()=>({subtle:.6,balanced:1,stream:1.25})[options.energy];
  const allowed=id=>options.enabled&&!options.disabled.has(id);
  const later=(fn,ms)=>{const generation=epoch;const id=setTimeout(()=>{timers.delete(id);if(generation===epoch)fn();},ms);timers.add(id);return id;};
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify({...options,disabled:[...options.disabled]}));}catch{}};
  const tone=(side=1)=>{
    const piece=document.querySelector('.piece.'+(side===1?'ivory':'ebony'));
    const css=getComputedStyle(piece||document.body);
    return css.getPropertyValue('--disc-hi').trim()||css.getPropertyValue(side===1?'--pl-l-1':'--pl-d-1').trim()||'#f4ce88';
  };
  const n=()=>app.state.rs.n;
  const point=sq=>({x:(sq%n()+.5)*100/n(),y:(Math.floor(sq/n())+.5)*100/n()});
  const pieceAt=sq=>[...document.querySelectorAll('#pieces > .piece')].find(el=>Math.round(parseFloat(el.style.left)*n()/100)+Math.round(parseFloat(el.style.top)*n()/100)*n()===sq);
  function ensure(){
    if(!plane?.isConnected){plane=document.createElement('div');plane.className='cine-board-plane';plane.setAttribute('aria-hidden','true');$('pieces').appendChild(plane);}
    if(!atmosphere?.isConnected){atmosphere=document.createElement('div');atmosphere.className='cine-atmosphere';atmosphere.setAttribute('aria-hidden','true');atmosphere.innerHTML='<div class="cine-turn-light"></div><div class="cine-stage-light"></div>';document.body.prepend(atmosphere);}
    document.body.classList.toggle('cine-enabled',options.enabled);
    document.body.dataset.cineEnergy=options.energy;
    document.body.style.setProperty('--cine-energy',energy());
  }
  function node(parent,tag,cls,side,ms=1000){
    if(liveNodes.size>=80)return null;
    const el=tag==='svg'?document.createElementNS(NS,'svg'):document.createElement(tag);
    el.classList.add(...cls.split(' '));el.setAttribute('aria-hidden','true');el.style.setProperty('--cue',tone(side));
    parent.appendChild(el);liveNodes.add(el);later(()=>{el.remove();liveNodes.delete(el);},ms);return el;
  }
  function at(el,sq,span=1){if(!el)return;const p=point(sq);el.style.left=p.x+'%';el.style.top=p.y+'%';el.style.width=span*100/n()+'%';el.style.height=span*100/n()+'%';}
  function svg(cls,side,ms){const el=node(plane,'svg',cls,side,ms);if(el){el.setAttribute('viewBox','0 0 100 100');el.setAttribute('preserveAspectRatio','none');}return el;}
  function shape(root,tag,attrs){const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);root.appendChild(el);return el;}
  function animate(el,keyframes,settings){
    if(!el||reduced())return;
    const motion=el.animate?.(keyframes,{duration:500,easing:'cubic-bezier(.2,.7,.25,1)',...settings});
    if(motion){motions.add(motion);motion.finished.catch(()=>{}).finally(()=>motions.delete(motion));}
  }
  function pulse(sq,side,cls='cine-ripple',count=1){for(let i=0;i<count;i++){const el=node(plane,'i',cls,side,1000);at(el,sq,1.1+i*.15);if(el)el.style.animationDelay=i*75+'ms';}}
  function aura(sq,side,cls='cine-halo',ms=900){const piece=pieceAt(sq);if(!piece)return null;const el=node(piece,'i',cls,side,ms);return el;}
  function rays(sq,side,kind='cine-fracture'){
    const root=svg(kind,side,1000);if(!root)return;const p=point(sq),r=100/n();
    // Tapered branches open out of the actual captured square, then dissolve.
    for(let i=0;i<7;i++){const a=(i*2.39996+sq)*1.1,x=p.x+Math.cos(a)*r*.45,y=p.y+Math.sin(a)*r*.45;
      const line=shape(root,'path',{d:`M${p.x} ${p.y} L${x} ${y} l${Math.cos(a+.8)*r*.28} ${Math.sin(a+.8)*r*.28}`,fill:'none','stroke-width':'.13',pathLength:100,'stroke-dasharray':'100 100'});
      animate(line,[{strokeDashoffset:100,opacity:0},{strokeDashoffset:0,opacity:.85,offset:.3},{strokeDashoffset:0,opacity:0}],{duration:850,delay:i*18});
      shape(root,'path',{d:`M${x} ${y} l${Math.cos(a-.9)*r*.22} ${Math.sin(a-.9)*r*.22}`,fill:'none','stroke-width':'.065'});
    }
  }
  function perimeter(side,dir=1,cls='cine-perimeter'){
    const root=svg(cls,side,1400);if(!root)return;
    const ring=shape(root,'rect',{x:1,y:1,width:98,height:98,rx:2,fill:'none',pathLength:100,'stroke-width':'.55','stroke-dasharray':'15 85'});
    animate(ring,[{strokeDashoffset:dir>0?100:-100,opacity:0},{opacity:.9,offset:.2},{strokeDashoffset:0,opacity:0}],{duration:1200});
  }
  function wash(side,cls='cine-wash',ms=1300){return node(atmosphere,'div',cls,side,ms);}
  function spray(parent,side,cls='cine-spark',count=8,sq){
    for(let i=0;i<Math.round(count*energy());i++){
      const el=node(parent,'i',cls,side,1600);if(!el)break;
      const a=i*2.39996;el.style.setProperty('--dx',Math.cos(a)*(22+i*3)+'px');el.style.setProperty('--dy',Math.sin(a)*(22+i*2)+'px');
      el.style.setProperty('--spin',i*47+'deg');el.style.animationDelay=i*22+'ms';
      if(sq!==undefined){const p=point(sq);el.style.left=p.x+'%';el.style.top=p.y+'%';}else{el.style.left=(8+(i*17)%84)+'%';el.style.top=(16+(i*23)%68)+'%';}
    }
  }
  function bodyMove(sq,frames,duration=350){if(!app.settings.shake)return;animate(pieceAt(sq)?.querySelector('.body'),frames,{duration});}
  function scene(c={}){
    const G=app.state,move=c.move||G.legal[0],from=c.from??move?.from??G.board.findIndex(Boolean);
    const to=c.to??move?.path?.at(-1)??from;
    return{...c,side:c.side??G.side,from,to,move,path:c.path||move?.path||[from,to],captures:c.captures??move?.caps?.length??0};
  }
  const effects={
    b1:c=>{const p=point(c.from),q=point(c.to);perimeter(c.side,q.x!==p.x?q.x-p.x:q.y-p.y);},
    b2:c=>pulse(c.to,c.side,'cine-ripple',3),
    b3:c=>rays(c.impact??c.to,c.side),
    b4:c=>{const root=svg('cine-route',c.side,1300);if(!root)return;root.style.setProperty('--cine-route-time',Math.max(180,Math.min(1100,(c.path.length-1)*560/(app.state.mode==='aivai'?app.state.aiSpeed:1)))+'ms');shape(root,'polyline',{points:c.path.map(sq=>{const p=point(sq);return p.x+','+p.y;}).join(' '),fill:'none','stroke-width':'.6',pathLength:100,'stroke-dasharray':'100 100'});},
    b5:c=>node(plane,'div','cine-advantage',c.side,1400),
    b6:c=>{const row=c.side===1?0:n()-1;for(let col=0;col<n();col++)if((row+col)%2)pulse(row*n()+col,c.side,'cine-runway',1);},
    b7:c=>{const squares=c.squares||Array.from(app.state.board).flatMap((v,i)=>Math.sign(v)===c.side?[i]:[]);for(const sq of squares.slice(0,4))pulse(sq,c.side,'cine-last-stand',1);},
    b8:c=>{node(plane,'div','cine-focus',c.side,900);},
    b9:c=>{perimeter(c.side,1,'cine-victory-edge');later(()=>perimeter(c.side,-1,'cine-victory-edge'),180);},
    b10:c=>{const a=node(plane,'div','cine-balance cine-balance-a',1,1600),b=node(plane,'div','cine-balance cine-balance-b',-1,1600);},
    p1:c=>bodyMove(c.to,[{scale:'1 1'},{scale:'1.045 .955',offset:.35},{scale:'1 1'}],220),
    p2:c=>bodyMove(c.from,[{rotate:'0deg'},{rotate:(point(c.to).x>=point(c.from).x?3:-3)+'deg',offset:.35},{rotate:'0deg'}],450),
    p3:c=>{const el=aura(c.to,c.side,'cine-glint',700);if(el)el.style.setProperty('--flight-angle',Math.atan2(point(c.to).y-point(c.from).y,point(c.to).x-point(c.from).x)+'rad');},
    p4:c=>{const el=aura(c.to,c.side,'cine-halo cine-charge',1100);if(el){const value=document.createElement('em');value.textContent=Math.max(2,c.captures)+'×';el.appendChild(value);}},
    p5:c=>{const el=aura(c.to,c.side,'cine-orbit',1300);if(el)for(let i=0;i<5;i++){const dot=document.createElement('b');dot.style.setProperty('--orbit',i*72+'deg');el.appendChild(dot);}},
    p6:c=>{for(const el of document.querySelectorAll('.piece.'+(c.side===1?'ivory':'ebony')+' .body'))animate(el,[{rotate:'0deg'},{rotate:'-2deg',offset:.3},{rotate:'2deg',offset:.6},{rotate:'0deg'}],{duration:900});},
    p7:c=>{for(const sq of (c.squares||[c.to]).slice(0,3)){aura(sq,c.side,'cine-halo cine-threat',1200);bodyMove(sq,[{rotate:'0deg'},{rotate:'-2deg',offset:.3},{rotate:'1deg',offset:.7},{rotate:'0deg'}],600);}},
    p8:c=>{const piece=pieceAt(c.from);if(piece){spray(plane,c.side,'cine-wink-star',5,c.from);aura(c.from,c.side,'cine-halo cine-wink-aura',850);}},
    p9:c=>{aura(c.to,c.side,'cine-halo cine-relief',1000);bodyMove(c.to,[{scale:'1'},{scale:'1.025',offset:.35},{scale:'1'}],700);},
    p10:c=>{const body=pieceAt(c.from)?.querySelector('.body')||pieceAt(c.to)?.querySelector('.body');const el=node(plane,'i','cine-echo',c.side,750);at(el,c.from,.72);if(el&&body)el.style.background=getComputedStyle(body).background;},
    a1:c=>wash(c.side,'cine-spotlights',1800),
    a2:c=>wash(c.side,'cine-crowd-wash',1600),
    a3:c=>{const el=wash(c.side,'cine-pointer-bloom',1700);},
    a4:c=>spray(atmosphere,c.side,'cine-dust',12),
    a5:c=>{const el=wash(c.side,'cine-stakes',2000);if(el)el.dataset.stage=String(c.stage??3);},
    a6:c=>wash(c.side,'cine-horizon',1900),
    a7:c=>wash(c.side,'cine-aurora',1800),
    a8:c=>spray(atmosphere,c.side,'cine-celebration',14),
    a9:c=>wash(c.side,'cine-calm',1700),
    a10:c=>{const el=wash(c.side,'cine-intermission',1400);},
  };
  function fire(id,input={},demo=false){
    ensure();if(!allowed(id)||reduced()||document.hidden)return false;
    if(id.startsWith('a')&&app.settings.ambient===false)return false;
    if(!demo&&(!$('ceremony').hidden||app.menu.isOpen()||app.state.aiPaused))return false;
    const c=scene(input);if(!director.allow(id,c,demo))return false;
    if(['a6','a7','a8','a9'].includes(id))for(const el of liveNodes)if(el.matches('.cine-crowd-wash,.cine-horizon,.cine-aurora')){el.remove();liveNodes.delete(el);}
    const now=performance.now();effects[id](c);played.push({id,at:now,demo,moment:c.moment,ply:c.ply});if(played.length>200)played.shift();
    if(demo)$('cineStatus').textContent='Preview: '+catalogue.find(row=>row[0]===id)[2];return true;
  }
  function fireMany(ids,c,demo=false){for(const id of ids)fire(id,c,demo);}
  function clear(){epoch++;for(const id of timers)clearTimeout(id);timers.clear();for(const motion of motions)motion.cancel();motions.clear();for(const el of liveNodes)el.remove();liveNodes.clear();previousThreats.clear();previousBoard=[];phaseKey='';pointerUntil=0;}
  function refresh(G=app.state){
    latest=G;ensure();const side=G.side;
    document.body.style.setProperty('--cine-active',tone(side));
    document.body.dataset.cineTurn=String(side);
    const active=!G.over&&!G.aiPaused&&!app.menu.isOpen()&&$('ceremony').hidden&&!document.hidden;
    const key=[G.phase,G.history.length,G.side,active].join(':');
    if(key!==phaseKey){phaseKey=key;phaseAt=performance.now();if(active&&['idle','thinking'].includes(G.phase))later(()=>{if(key===phaseKey){refresh();fire('a4',{moment:'deliberation',quietMs:performance.now()-phaseAt});}},G.phase==='thinking'?1900:7000);}
    const quiet=performance.now()-phaseAt;
    const ambient=active&&!reduced()&&app.settings.ambient!==false;
    document.body.classList.toggle('cine-spot-on',allowed('a1')&&ambient&&G.phase==='thinking'&&quiet>=1800);
    document.body.classList.toggle('cine-pointer-on',allowed('a3')&&ambient&&performance.now()<pointerUntil);
    document.body.classList.toggle('cine-idle-atmosphere',allowed('a4')&&ambient&&quiet>=(G.phase==='thinking'?1800:6500));
    const arena=app.arena(),stage=G.mode==='aivai'&&G.nationalMatch?(arena.bouts<5?0:arena.bouts<9?1:arena.bouts<11?2:3):null;
    document.body.dataset.cineStage=allowed('a5')&&stage!==null&&ambient?stage:'off';
    const nextStage=stage===null?'':arena.season+':'+stage;
    if(nextStage&&nextStage!==stageKey&&active){stageKey=nextStage;fire('a5',{moment:'stage',stage,stageChanged:true});}
  }
  const api={
    refresh,
    reset(){clear();director.resetGame();refresh();},
    moveStart(move,side){const to=move.path.at(-1),c={moment:'move',move,side,from:move.from,to,captures:move.caps.length,king:Math.abs(app.state.board[move.from])===2,distance:Math.abs(to%n()-move.from%n())};fireMany(['p2','p10','b4','b6'],c);},
    moveEnd(move,side,before){
      const to=move.path.at(-1),c={moment:move.caps.length?'capture':'land',move,side,to,from:move.from,captures:move.caps.length,impact:move.caps.at(-1),king:Math.abs(before?.[move.from])===2,distance:Math.abs(to%n()-move.from%n())};
      if(move.promotes)fireMany(['p5','a7','p3'],{...c,moment:'promotion'});
      fireMany(['p1','p3','b3','a2','p4'],c);
      const count=board=>board.reduce((value,piece)=>value+(piece?Math.sign(piece):0),0);
      if(before&&count(before)*side<0&&count(app.state.board)*side>0)fireMany(['b5','a6'],{...c,moment:'comeback'});
      const threats=new Set(app.state.legal.flatMap(m=>m.caps));
      const remaining=Array.from(app.state.board).filter(p=>Math.sign(p)===side).length;
      const critical=remaining<=3||app.state.legal.some(m=>m.caps.length>=2);
      const fresh=[...threats].filter(sq=>!previousThreats.has(sq));
      if(fresh.length)fire('p7',{moment:'threat',criticalThreat:critical,squares:fresh,side});
      for(const sq of previousThreats){const target=sq===move.from?to:sq;if(!move.caps.includes(sq)&&!threats.has(target)&&app.state.board[target]&&Math.sign(previousBoard[sq])===Math.sign(app.state.board[target])){fire('p9',{moment:'relief',verified:true,to:target,side:Math.sign(app.state.board[target])});break;}}
      previousThreats=critical?threats:new Set();previousBoard=Array.from(app.state.board);refresh();
    },
    verdict(data){const G=app.state,q=assessCinematicMove(data,{over:G.over,phase:G.phase,ply:G.history.length});if(q.intelligent)fireMany(['b1','b2','b8','p3','a2','a1'],{...data,...q,moment:'quality',captures:data.move.caps.length});},
    hint(sq,side){fire('p8',{moment:'hint',from:sq,to:sq,side});},
    doom(side){fireMany(['b7','a1'],{moment:'doom',verified:true,side});},
    result(side){if(side===null)fireMany(['b10','a9'],{moment:'draw',side:1});else fireMany(['b9','p6','a8'],{moment:'win',side});},
    intermission(){if($('autoNext').hidden){lastIntermission='';return;}if(!lastIntermission){lastIntermission='active';fire('a10',{moment:'intermission',countdownVisible:true});}},
    preview(id){const G=app.state,move=G.legal[0],from=move?.from??G.board.findIndex(Boolean),side=Math.sign(G.board[from])||1;
      const to=move?.path.at(-1)??from;const path=[from,to,Math.max(0,Math.min(G.board.length-1,to+(side===1?-2:2)*n()+2))];
      const displayTo=id.startsWith('p')&&!['p2','p10'].includes(id)?from:to;
      if(!fire(id,{from,to:displayTo,side,path,captures:3,stage:3,squares:[from,to]},true)){$('cineStatus').textContent=reduced()?'Reduced motion · animated effects suppressed':'Effect disabled · enable it to preview';return false;}
      try{app.fx.ensure();app.sfx.effect(id==='p5'||id==='a7'||id==='b6'?'crown':id==='b9'||id==='a8'||id==='p6'?'victory':id==='b10'||id==='a9'?'draw':id==='b3'||id==='b4'||id==='p4'?'impact':'landing',{vol:.14});}catch{}
    },
    debug(){return{catalogue:catalogue.map(([id,group,name])=>({id,group,name})),played:played.slice(),director:director.inspect(),nodes:liveNodes.size,motions:motions.size,timers:timers.size,reduced:reduced(),options:{...options,disabled:[...options.disabled]}};},
  };
  globalThis.DRAFTI_CINEMA=api;
  const launch=document.createElement('button');launch.id='cineLaunch';launch.className='btn cine-launch';launch.textContent='✦ Preview studio';launch.setAttribute('aria-expanded','true');document.body.appendChild(launch);
  const panel=document.createElement('aside');panel.id='cineStudio';panel.className='cine-studio';panel.setAttribute('aria-label','Cinematic preview studio');
  panel.innerHTML='<div class="cine-studio-head"><div><span class="cine-eyebrow">REVIEW PREVIEW</span><h2>Make the moment.</h2></div><button class="btn" id="cineClose" aria-label="Close preview studio">×</button></div><p>Gameplay saves effects for qualified moments. Buttons below stage a demonstration without changing the match.</p><div class="cine-controls"><button class="btn" id="cineCompare">Compare original</button><select id="cineEnergy" aria-label="Effect intensity"><option value="subtle">Subtle</option><option value="balanced">Balanced</option><option value="stream">Livestream</option></select><button class="btn" id="cineTour">Play showcase</button></div><p class="cine-status" id="cineStatus" role="status">30 situational effects · original sounds preserved</p><div id="cineCatalogue"></div>';
  document.body.appendChild(panel);
  for(const group of ['Board','Pieces','Background']){
    const details=document.createElement('details');details.open=group==='Board';const summary=document.createElement('summary');summary.textContent=group+' · 10 effects';details.appendChild(summary);
    for(const [id,category,name]of catalogue.filter(row=>row[1]===group)){
      const row=document.createElement('div');row.className='cine-option';
      const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=!options.disabled.has(id);toggle.setAttribute('aria-label','Enable '+name);
      toggle.addEventListener('change',()=>{toggle.checked?options.disabled.delete(id):options.disabled.add(id);clear();refresh();persist();});
      const button=document.createElement('button');button.className='btn';button.dataset.cue=id;button.textContent=name;button.addEventListener('click',()=>{if(innerWidth<900){togglePanel(false);$('boardFrame').scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'});later(()=>api.preview(id),350);}else api.preview(id);});row.append(toggle,button);details.appendChild(row);
    }
    $('cineCatalogue').appendChild(details);
  }
  const togglePanel=open=>{panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));};
  launch.addEventListener('click',()=>togglePanel(panel.hidden));$('cineClose').addEventListener('click',()=>togglePanel(false));
  $('btnMenu').addEventListener('click',()=>togglePanel(false));
  $('cineCompare').addEventListener('click',()=>{options.enabled=!options.enabled;clear();refresh();persist();$('cineCompare').textContent=options.enabled?'Compare original':'Restore preview';$('cineStatus').textContent=options.enabled?'Cinematic preview enabled':'Original presentation · new effects off';});
  $('cineEnergy').value=options.energy;$('cineEnergy').addEventListener('change',event=>{options.energy=event.target.value;refresh();persist();});
  $('cineTour').addEventListener('click',()=>{clear();options.enabled=true;refresh();persist();$('cineCompare').textContent='Compare original';if(innerWidth<900)togglePanel(false);catalogue.forEach(([id],i)=>later(()=>api.preview(id),i*1500));});
  const pointer=event=>{if(pointerFrame||!allowed('a3')||reduced()||!event.target.closest?.('#boardFrame')||app.menu.isOpen())return;pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;pointerUntil=performance.now()+1700;document.body.style.setProperty('--cine-pointer-x',event.clientX/innerWidth*100+'%');document.body.style.setProperty('--cine-pointer-y',event.clientY/innerHeight*100+'%');refresh();fire('a3',{moment:'interaction',boardInteraction:true});later(refresh,1800);});};
  document.addEventListener('pointermove',pointer,{passive:true});document.addEventListener('pointerdown',pointer,{passive:true});
  new MutationObserver(()=>api.intermission()).observe($('autoNext'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  new MutationObserver(()=>refresh()).observe($('drawer'),{attributes:true,attributeFilter:['aria-hidden']});
  new MutationObserver(()=>refresh()).observe($('ceremony'),{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();refresh();});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',()=>{clear();refresh();});
  ensure();refresh();
  togglePanel(innerWidth>=900);
})();
