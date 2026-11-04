window.qaPlayback = {startedAt:Date.now(),mode:window.__drafti.state.mode,observed:[],sounds:[],errors:[],done:false};
window.qaConsoleInfoBase ||= console.info.bind(console);
console.info=(...args)=>{
  window.qaConsoleInfoBase(...args);
  if(args[0]==='[DRAFTI audio]') {
    try { window.qaPlayback.sounds.push(JSON.parse(args[1])); } catch {}
  }
};
window.addEventListener('error',event=>window.qaPlayback.errors.push(event.message));
window.addEventListener('unhandledrejection',event=>window.qaPlayback.errors.push(String(event.reason)));
(async()=>{
  const app=window.__drafti, state=app.state;
  let lastPly=-1;
  while(!state.over && Date.now()-window.qaPlayback.startedAt<240000){
    if(state.history.length!==lastPly){
      lastPly=state.history.length;
      window.qaPlayback.observed.push({ply:lastPly,pieces:state.board.filter(Boolean).length,phase:state.phase});
    }
    const human=state.mode==='hotseat'||(state.mode==='ai'&&state.side===state.humanSide);
    if(human&&state.phase==='idle'&&state.legal.length){
      const move=state.legal[0];
      app.tap(move.from);
      for(const landing of move.path.slice(1)) app.tap(landing);
    }
    await new Promise(resolve=>setTimeout(resolve,75));
  }
  window.qaPlayback.done=!!state.over;
  window.qaPlayback.finishedAt=Date.now();
  window.qaPlayback.plies=state.history.length;
  window.qaPlayback.result=state.result;
})().catch(error=>window.qaPlayback.errors.push(String(error)));
'Started full game playback';
