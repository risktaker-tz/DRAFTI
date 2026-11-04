'use strict';
// Constructed legal terminal position in a dedicated Render QA profile.
// This checks result rendering, not a complete naturally played match.
window.qaResultName={running:true,scope:'Constructed legal capture fixture through production move execution',errors:[]};
(async()=>{
  const app=__drafti,G=app.state,E=app.engine;
  if(G.mode!=='aivai'||!G.nationalMatch||!G.aiPaused||G.phase!=='idle'||G.rs.n!==8){
    throw Error('Pause a national 8x8 match, disable automatic rematches, and use the dedicated Render QA profile');
  }
  G.board.fill(0);G.board[35]=2;G.board[28]=-1;G.board[49]=1;
  G.side=1;G.history=[];G.repMap=new Map();G.noProg=0;G.over=false;G.result=null;
  G.legal=E.legalMoves(G.rs,G.board,G.side);app.rebuild();
  const move=G.legal.find(move=>move.from===35&&move.caps.length===1&&move.caps[0]===28);
  if(!move)throw Error('The constructed final capture is not legal');
  qaResultName.seats=[G.seatIvory,G.seatEbony];qaResultName.move=move;
  await app.executeMove(move);
  qaResultName.result=G.result;qaResultName.remainingOpponents=G.board.filter(piece=>piece<0).length;
  qaResultName.complete=G.over&&G.result.winner===1&&G.result.reason==='Every Kenya piece has been captured.';
  qaResultName.running=false;
})().catch(error=>{qaResultName.running=false;qaResultName.errors.push(String(error));});
'Started actual result-rendering fixture';
