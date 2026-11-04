/* Presentation decisions consume existing engine verdicts; they never start searches. */
function assessCinematicMove(data,state) {
  const r=data.verdict||{},m=data.move;
  const none={intelligent:false,brilliant:false,significant:false};
  if(!m||state.over||state.phase==='animating'||data.ply!==state.ply||r.onlyMove||
      !Number.isFinite(r.delta)||!Number.isFinite(r.playedScore))return none;
  const rescue=Number.isFinite(r.preBest)&&r.preBest<=-180&&r.playedScore>=-30;
  const good=r.delta<=8&&(r.playedScore>-70||rescue);
  const onlyWay=Number.isFinite(r.bestOther)&&r.bestOther<=r.playedScore-140;
  const trap=!m.caps.length&&Number.isFinite(r.preBest)&&r.preBest<=90&&r.playedScore>=190;
  const brilliant=good&&(onlyWay||trap||rescue||r.delta<=-120&&r.playedScore>40);
  const intelligent=good&&(m.caps.length>0||m.promotes||brilliant);
  return{intelligent,brilliant,significant:intelligent&&(m.caps.length>=2||brilliant||m.promotes&&r.playedScore>=140)};
}
function createCinematicDirector({now=()=>performance.now()}={}) {
  const quality=c=>c.moment==='quality'&&c.intelligent;
  const multi=c=>c.moment==='capture'&&c.captures>=2;
  const longKing=c=>c.king&&c.distance>=3;
  // Predicate, quiet interval, quota per game, competing visual family, importance.
  const rules={
    b1:[c=>quality(c)&&c.significant,22000,2,'signature',70],
    b2:[quality,10000,3,'surface',40],
    b3:[multi,7000,4,'surface',60],
    b4:[c=>c.moment==='move'&&c.captures>=2,3000,8,null,20],
    b5:[c=>c.moment==='comeback',20000,1,'signature',80],
    b6:[c=>c.moment==='move'&&c.move?.promotes,5000,4,null,40],
    b7:[c=>c.moment==='doom'&&c.verified,20000,2,null,40],
    b8:[c=>quality(c)&&c.significant,18000,2,'signature',60],
    b9:[c=>c.moment==='win',8000,1,null,100],
    b10:[c=>c.moment==='draw',8000,1,null,90],
    p1:[c=>c.moment==='capture'||c.moment==='land'&&longKing(c),2000,8,null,10],
    p2:[c=>c.moment==='move'&&(c.captures>=2||c.move?.promotes||longKing(c)),4000,5,null,10],
    p3:[c=>quality(c)||c.moment==='promotion'||c.moment==='land'&&longKing(c),5000,5,null,20],
    p4:[multi,5000,4,'pieceHero',40],
    p5:[c=>c.moment==='promotion',5000,4,'pieceHero',80],
    p6:[c=>c.moment==='win',8000,1,null,100],
    p7:[c=>c.moment==='threat'&&c.criticalThreat,10000,3,null,30],
    p8:[c=>c.moment==='hint',5000,6,null,10],
    p9:[c=>c.moment==='relief'&&c.verified,12000,3,null,30],
    p10:[c=>c.moment==='move'&&(c.captures>=2||longKing(c)),4000,5,null,10],
    a1:[c=>c.moment==='doom'&&c.verified||quality(c)&&c.brilliant,12000,3,null,30],
    a2:[c=>multi(c)||quality(c)&&c.brilliant,12000,3,'backdrop',40],
    a3:[c=>c.moment==='interaction'&&c.boardInteraction,8000,4,null,5],
    a4:[c=>c.moment==='deliberation'&&c.quietMs>=1800,30000,3,null,5],
    a5:[c=>c.moment==='stage'&&c.stageChanged,15000,4,null,40],
    a6:[c=>c.moment==='comeback',20000,1,'backdrop',65],
    a7:[c=>c.moment==='promotion',8000,3,'backdrop',70],
    a8:[c=>c.moment==='win',8000,1,'backdrop',100],
    a9:[c=>c.moment==='draw',8000,1,'backdrop',90],
    a10:[c=>c.moment==='intermission'&&c.countdownVisible,12000,1,null,10],
  };
  const times=new Map(),counts=new Map(),families=new Map();let edgePly=-Infinity;
  return {
    allow(id,c,demo=false){
      const rule=rules[id];if(!rule)return false;if(demo)return true;
      const [test,gap,quota,family,priority]=rule,t=now();
      if(!test(c)||t-(times.get(id)??-Infinity)<gap||(counts.get(id)||0)>=quota)return false;
      if(id==='b1'&&c.ply-edgePly<6)return false;
      const prior=families.get(family),rest=family==='surface'?1500:family==='signature'?4500:2200;
      if(family&&prior&&t-prior.at<rest&&priority<=prior.priority)return false;
      times.set(id,t);counts.set(id,(counts.get(id)||0)+1);
      if(family)families.set(family,{at:t,priority});if(id==='b1')edgePly=c.ply;
      return true;
    },
    resetGame(){counts.clear();edgePly=-Infinity;}, // Keep quiet intervals across rapid arena bouts.
    inspect(){return{counts:Object.fromEntries(counts),times:Object.fromEntries(times)};},
  };
}
