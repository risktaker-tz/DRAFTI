'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ui=fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8'),bank={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/audio.manifest.js'),'utf8'),{window:bank});
let now=1000;const played=[];
const c={settings:{streamer:'female',sound:true,sfx:{voice:true}},drawerOpen:false,document:{hidden:false},
  FX:{ctx:null},
  G:{history:[{move:{caps:[],promotes:false}}],lastMoveAt:1000,phase:'idle',mode:'ai',humanSide:1,over:false},
  performance:{now:()=>now},Date:class{getHours(){return 20;}},Math:{random:()=>0,abs:Math.abs},
  SFX_BANK:{defs:bank.DRAFTI_SFX,buffers:new Map(Object.keys(bank.DRAFTI_SFX).map(k=>[k,{}])),sceneLockUntil:0,activeSources:new Map(),
    play(id,opts){played.push({id,opts});return {};}}};
vm.createContext(c);vm.runInContext(ui.slice(ui.indexOf('  const STREAMER ='),ui.indexOf('  function flashLabel('))+'this.S=STREAMER;',c);
const S=c.S;S.reset();
const openingTimers=[], openingPlayed=[];
const openingContext={gameEpoch:1,drawerOpen:false,greeter:{intro:'fixture_intro'},
  G:{mode:'ai',over:false,history:[]},Math:{random:()=>0},
  setTimeout:fn=>openingTimers.push(fn),SFX_BANK:{play:id=>openingPlayed.push(id)}};
vm.runInNewContext(ui.slice(ui.indexOf('    const openingEpoch = gameEpoch;'),
  ui.indexOf('    // AI vs AI: the arena announcer opens the show')),openingContext);
openingContext.gameEpoch=2;openingTimers[0]();
assert.equal(openingPlayed.length,0,'A restarted game cannot inherit an old introduction');
openingContext.gameEpoch=1;openingContext.G.history=Array(5);openingTimers[0]();
assert.equal(openingPlayed.length,0,'An introduction cannot describe an established game');
openingContext.G.history=[];openingTimers[0]();
assert.deepEqual(openingPlayed,['fixture_intro'],'A current opening keeps its original recording');
c.SFX_BANK.activeSources.set(1,{spoken:true});S.pulse();assert.equal(played.length,0);
c.SFX_BANK.activeSources.clear();S.pulse();assert(played.at(-1).id.startsWith('sf_greet'),'Opening retries after a competing voice finishes');
const afterWelcome=played.length;S.reset();S.openGame();assert.equal(played.length,afterWelcome,'New bouts preserve the livestream session instead of saying we are beginning again');
now+=23000;c.G.phase='thinking';S.pulse();assert.equal(played.at(-1).id,'sf_think');
now+=23000;c.G.phase='idle';S.pulse();assert(played.at(-1).id.startsWith('sf_cta'));
const count=played.length;now+=23000;S.pulse();assert.equal(played.length,count,'Quiet routine moves cannot generate false tactical commentary');
c.drawerOpen=true;now+=100000;S.pulse();assert.equal(played.length,count,'Settings stay silent');
c.drawerOpen=false;c.G.aiPaused=true;c.G.mode='aivai';S.pulse();assert.equal(played.length,count,'Paused spectator games stay quiet');
c.G.aiPaused=false;S.intermission();assert(played.at(-1).id.startsWith('sf_cta'),'Intermission uses engagement, never the stream-ending outro');
now+=100000;c.SFX_BANK.sceneLockUntil=now+15000;const before=played.length;assert.equal(S.intermission(),false);assert.equal(played.length,before,'Retirement original is protected');
c.SFX_BANK.sceneLockUntil=0;c.settings.streamer='male';S.reset();S.joinedMidgame=true;c.G.over=false;c.G.phase='thinking';S.pulse();assert.equal(played.at(-1).id,'sm_think','Midgame joins use the selected real voice and present context');
now+=100000;c.settings.streamer='off';S.pulse();assert.equal(played.at(-1).id,'sm_think');
const stored=new Map();c.sessionStorage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};
S.sessionOpened=false;S.rememberSession();assert.equal(stored.get('drafti.stream.welcomed.v1'),'1');
const reload={...c};vm.createContext(reload);vm.runInContext(ui.slice(ui.indexOf('  const STREAMER ='),ui.indexOf('  function flashLabel('))+'this.S=STREAMER;',reload);
assert.equal(reload.S.sessionOpened,true,'Reloading the same livestream tab preserves its welcome state');
console.log('PASS opening retry, selected voice, quiet-moment cadence, correct intermission, menu/pause/mute/ceremony gates and no stale tactical speech');

async function checkVocabulary() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../web/streamer-vocabulary/manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
  const fetched = [];
  c.settings.streamer = 'funny';
  c.FX.ctx = { decodeAudioData: async () => ({duration: 3}) };
  c.fetch = async url => {
    fetched.push(url);
    return {ok: true, json: async () => manifest, arrayBuffer: async () => new ArrayBuffer(1)};
  };
  const before = played.length;
  await S.warmVoice();
  assert.equal(played.length, before, 'Loading vocabulary does not start speech');
  const activeRoles = new Set(['session_open', 'new_bout', 'rematch_draw', 'season_advance',
    'capture1', 'capture2', 'capture3plus', 'new_king', 'new_challenger', 'stage_quarter',
    'stage_semi', 'stage_final', 'win', 'after_loss', 'trap', 'pressure', 'turnaround']);
  assert.equal(fetched.length, 1 + manifest.filter(clip => clip.mode === 'funny' && activeRoles.has(clip.role)).length,
    'Only approved event roles are downloaded for the selected voice');
  for (const [role, source] of Object.entries({capture: 'capture1', feast: 'capture2', capture_chain: 'capture3plus', crowning: 'new_king'})) {
    assert(S.extraPools.funny[role].length > 0);
    assert(S.extraPools.funny[role].every(id => manifest.some(clip => clip.id === id && clip.role === source)));
  }
  for (const [role, id] of Object.entries({next_bout: 'sj2_007', upset: 'sj2_011', next_rematch: 'sj2_016',
    next_season: 'sj2_018', stage_quarter: 'sj2_022', capture: 'sj2_040', defeat: 'sj2_075', victory: 'sj2_076'})) {
    assert(S.extraPools.funny[role]?.includes(id), `${id} is loaded for its specific ${role} moment`);
  }
  assert(S.extraPools.funny.victory.includes('sj2_077') && S.extraPools.funny.victory.includes('sj2_078'));
  assert(S.extraPools.funny.next_season.includes('sj2_019'));
  assert(ui.includes("const stageRole = { 1: 'stage_quarter', 2: 'stage_semi', 3: 'stage_final' }[stage]"),
    'Only actual tournament stage advances announce the corresponding stage');
  for (const [mode, ids] of Object.entries({
    female: { stage_quarter: ['sf2_021','sf2_022','sf2_023'], stage_semi: ['sf2_024','sf2_025','sf2_026'],
      stage_final: ['sf2_027','sf2_028','sf2_029'], capture: ['sf2_037','sf2_038','sf2_039','sf2_040','sf2_041','sf2_042'],
      feast: ['sf2_043','sf2_044','sf2_045','sf2_046','sf2_047','sf2_048'],
      capture_chain: ['sf2_049','sf2_050','sf2_051','sf2_052'], crowning: ['sf2_053','sf2_054','sf2_055','sf2_056','sf2_057'] },
    male: { stage_semi: ['sm2_026'], stage_final: ['sm2_027','sm2_028','sm2_029'],
      capture: ['sm2_037','sm2_038','sm2_039','sm2_040','sm2_041','sm2_042'],
      feast: ['sm2_043','sm2_044','sm2_045','sm2_046','sm2_047','sm2_048'],
      capture_chain: ['sm2_049','sm2_050','sm2_051','sm2_052'], crowning: ['sm2_053','sm2_054','sm2_055','sm2_056','sm2_057'] },
  })) {
    S.loadingVoices.delete(mode);
    c.settings.streamer = mode;
    await S.warmVoice();
    for (const [role, expected] of Object.entries(ids)) {
      assert(expected.every(id => S.extraPools[mode][role]?.includes(id)),
        `${mode} vocabulary only uses accepted ${role} lines in its matching situation`);
    }
    const withheldCleanMoves = mode === 'female'
      ? ['sf2_030','sf2_031','sf2_032','sf2_033','sf2_034','sf2_035','sf2_036']
      : ['sm2_032'];
    const loadedIds = Object.values(S.extraPools[mode]).flat();
    assert(withheldCleanMoves.every(id => !loadedIds.includes(id)),
      `${mode} clean-move praise stays gated until an engine quality signal is available`);
  }
  assert(S.extraPools.male.trap_set.includes('sm2_067'),
    'The verified trap-set line is available only to the existing engine trap event');
  assert(S.extraPools.funny.trap_set.includes('sj2_067') && S.extraPools.funny.trap_spring.includes('sj2_069'),
    'Funny trap narration stays separated between setting a real trap and seeing it spring');
  assert(S.extraPools.female.pressure.includes('sf2_058') && S.extraPools.male.pressure.includes('sm2_058') &&
    S.extraPools.funny.pressure.includes('sj2_058'), 'Every voice has material-pressure lines');
  assert(S.extraPools.female.turnaround.includes('sf2_063') && S.extraPools.funny.turnaround.includes('sj2_063') &&
    !S.extraPools.male.turnaround, 'Turnaround lines are limited to voices with accepted recordings');
  assert.deepEqual(S.materialShift({boardBefore:[2,1,1,-2,-1]},[2,1,-2,-1,-1]),
    {turnaround:true,pressure:false}, 'Only a real change from a lead to a deficit is a turnaround');
  assert.deepEqual(S.materialShift({boardBefore:[1,1,-1,-1]},[1,0,-1,-1]),
    {turnaround:false,pressure:true}, 'New pressure is measured from the committed before/after boards');
  assert.deepEqual(S.materialShift({boardBefore:[2,1,1,1,-2]},[2,1,1,0,-2]),
    {turnaround:false,pressure:false}, 'A shrinking material lead is not announced as pressure');
  assert.equal(S.materialShift({boardBefore:[1,1]},[1]),null,
    'Incomplete board evidence cannot trigger material commentary');
  const originalSay = S.say;
  function observeMaterial(beforeBoard, afterBoard, speaks) {
    const heard = [];
    c.settings.streamer = 'female';
    c.G.mode = 'ai'; c.G.over = false; c.G.result = null; c.G.phase = 'idle';
    c.G.history = [{move:{caps:[0],promotes:false},boardBefore:beforeBoard}];
    c.G.board = afterBoard; c.G.lastMoveAt = c.performance.now() - 1000;
    S.joinedMidgame = true; S.sessionOpened = true; S.opened = true; S.observedPly = -1;
    S.lastSpokeAt = -Infinity; S.busyUntil = 0;
    S.say = role => { heard.push(role); return role === speaks; };
    S.pulse();
    return heard;
  }
  assert.deepEqual(observeMaterial([2,1,1,-2,-1],[2,1,-2,-1,-1],'turnaround'),['turnaround'],
    'A real lead reversal takes priority over generic capture commentary');
  const pressureHeard = observeMaterial([1,1,-1,-1],[1,0,-1,-1],'pressure');
  assert.deepEqual(pressureHeard,['capture','pressure'],
    'A newly verified material deficit can use a pressure line when no capture line plays: '+JSON.stringify(pressureHeard));
  const reducedLeadHeard = observeMaterial([2,1,1,1,-2],[2,1,1,0,-2],'pressure');
  assert.deepEqual(reducedLeadHeard,['capture','cta'],
    'A reduced lead never reaches pressure narration: '+JSON.stringify(reducedLeadHeard));
  S.say = originalSay;
  const say = S.say;
  const roles = [];
  S.say = role => { roles.push(role); return role === 'next_rematch'; };
  assert(S.intermission('next_rematch'));
  assert.deepEqual(roles, ['next_rematch'], 'A factual transition line takes precedence over a generic CTA');
  roles.length = 0;
  S.say = role => { roles.push(role); return false; };
  assert.equal(S.intermission('next_season'), false);
  assert.deepEqual(roles, ['next_season', 'cta'], 'A CTA is the fallback when the event has no eligible line');
  S.say = say;
}
checkVocabulary().catch(error => { console.error(error); process.exitCode = 1; });
