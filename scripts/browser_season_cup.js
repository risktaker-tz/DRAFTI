window.seasonCupQA={done:false,errors:[],scope:'Isolated legal final-capture fixture; only long review timers are held for screenshots. No public player progress is modified.'};
(async()=>{
  const a=__drafti,g=a.state,$=id=>document.getElementById(id),season=window.cupReviewSeason||3;
  a.settings.sound=false;a.menu.open();
  document.querySelector('#segMode [data-v="aivai"]').click();if(!$('modalConfirm').hidden)$('cfYes').click();
  if(!g.aiPaused)$('btnAivaiPause').click();
  const nativeTimeout=window.cupNativeTimeout||setTimeout;
  for(let i=0;g.phase==='animating'&&i<200;i++)await new Promise(resolve=>nativeTimeout(resolve,50));
  if(g.phase==='animating')throw Error('Existing move did not reach its paused boundary');
  if(a.settings.retireEvents)$('btnRetire').click();
  a.menu.close();a.settings.aivaiAuto=true;
  window.cupNativeTimeout=nativeTimeout;
  window.cupHeld=[];window.setTimeout=(fn,ms,...args)=>ms>=5000?(cupHeld.push({fn,ms}),-cupHeld.length):nativeTimeout(fn,ms,...args);
  Object.assign(a.arena(),{season,bouts:11});
  const b=new Int8Array(g.rs.n*g.rs.n);b[42]=2;b[33]=-2;
  Object.assign(g,{board:b,side:1,history:[],noProg:0,phase:'idle',over:false,result:null,recorded:false,
    arenaSeason:season,arenaBout:11,nationalMatch:true,sel:null,hint:null,lastMove:null,repMap:new Map(),aiPaused:true});
  g.legal=a.engine.legalMoves(g.rs,b,1);a.rebuild();
  a.settings.sound=true;a.fx.ensure();
  const original=a.sfx.effect.bind(a.sfx);
  a.sfx.effect=(event,opts)=>{const source=original(event,opts);if(event==='trophy')seasonCupQA.music={started:!!source,duration:source?.buffer?.duration,context:a.fx.ctx?.state,master:a.fx.out?.gain.value,priority:source?a.sfx.activeSources.get(source)?.priority:null};return source;};
  const winning=g.legal.find(m=>m.caps.includes(33));if(!winning)throw Error('Fixture has no winning capture');
  await a.executeMove(winning);
  seasonCupQA.result=g.result;seasonCupQA.season=season;seasonCupQA.seats=[g.seatIvory,g.seatEbony];
  seasonCupQA.awards=JSON.parse(localStorage.getItem('drafti.season-honours.v1'));
  seasonCupQA.card={hidden:$('ceremony').hidden,tier:document.querySelector('.season-cup-card')?.dataset.cupTier,
    flags:[...document.querySelectorAll('.cup-flags .cer-face')].map(el=>el.dataset.flagCode),
    title:document.querySelector('.season-cup-card .cer-name')?.textContent};
  seasonCupQA.done=true;
})().catch(error=>{seasonCupQA.errors.push(String(error.stack||error));seasonCupQA.done=true;});
