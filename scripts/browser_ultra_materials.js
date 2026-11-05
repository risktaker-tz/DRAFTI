(() => {(async()=>{
  window.ultraVisualQA={rows:[],errors:[],done:false,scope:'Static rendered king/men fixtures across all eight materials, three board sizes and both physical orientations; no search or device frame-rate claim.'};
  addEventListener('error',e=>ultraVisualQA.errors.push(e.message));
  const a=__drafti,g=a.state,$=id=>document.getElementById(id);
  document.querySelector('#segMode [data-v="hotseat"]').click();if(!$('modalConfirm').hidden)$('cfYes').click();a.menu.close();
  $('cineStudio').hidden=true;a.settings.sound=false;$('boardFrame').style.transition='none';
  if(a.settings.hv)$('btnHV').click();
  const crown=()=>{for(const side of [1,-1]){const sq=g.board.findIndex(v=>v===side);if(sq>=0)g.board[sq]=side*2;}a.rebuild();for(const p of g.pieces)p.el.style.animation='none';};
  for(const rules of ['eastafrica8','eastafrica10','eastafrica12']){
    document.querySelector('#segRules [data-v="'+rules+'"]').click();if(!$('modalConfirm').hidden)$('cfYes').click();crown();
    for(const material of ['tourney','woodturn','ivoryjet','bakelite','steel','glass','stone','theme']){
      document.querySelector('#segPieces [data-v="'+material+'"]').click();
      for(const flip of [false,true]){
        $('boardFrame').classList.toggle('flip',flip);
        const bodies=[...document.querySelectorAll('#pieces>.piece .body')].map(el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height};});
        const kings=[...document.querySelectorAll('#pieces>.piece.king')].map(el=>{const b=el.querySelector('.body').getBoundingClientRect(),s=el.querySelector('.stack').getBoundingClientRect();return{body:b.width,stack:s.width,lowerOffset:s.top+s.height/2-b.top-b.height/2};});
        ultraVisualQA.rows.push({rules,material,flip,pieces:bodies.length,maxCircleError:Math.max(...bodies.map(r=>Math.abs(r.width-r.height))),kings,
          documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth});
      }
    }
  }
  document.querySelector('#segRules [data-v="eastafrica8"]').click();if(!$('modalConfirm').hidden)$('cfYes').click();
  document.querySelector('.theme-sw[data-v="marble"]').click();document.querySelector('#segPieces [data-v="theme"]').click();crown();
  $('boardFrame').classList.remove('flip');a.menu.close();ultraVisualQA.done=true;
})().catch(e=>{ultraVisualQA.errors.push(String(e.stack||e));ultraVisualQA.done=true;});})();
