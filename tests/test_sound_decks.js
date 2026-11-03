'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), ui = fs.readFileSync(path.join(root, 'src/ui.js'), 'utf8');
const manifest = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/audio.manifest.js'), 'utf8'), manifest);
function setup(actor = 'engine') {
  let now = 100000, timer, seed = actor === 'human' ? 12345 : 54321;
  const math = Object.create(Math); math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const ctx = { destination: {}, createBufferSource: () => ({ playbackRate: {}, connect() {}, disconnect() {}, start() {}, stop() {} }),
    createGain: () => ({ gain: {}, connect() {}, disconnect() {} }) };
  const settings = { sound: true, clock: 0, sfx: { animals: true, comedy: true, voice: true, judge: true, think: true, ui: true, drama: true, party: true } };
  const G = { phase: actor === 'engine' ? 'thinking' : 'idle', mode: actor === 'engine' ? 'aivai' : 'ai',
    history: [], side: 1, humanSide: 1, over: false, aiSpeed: 1, diffIvory: 'l10' };
  const c = { window: manifest.window, settings, G, Math: math, performance: { now: () => now }, Date: { now: () => now },
    FX: { ensure: () => ctx }, URLSearchParams, location: { search: '' }, console,
    setInterval: fn => { timer = fn; }, turnKey: () => G.history.length, humanTurn: () => false,
    hintPending: false, IVORY: 1, LEVELS: { l10: { budgetMs: 1 } }, $: () => ({}), flashWhisper() {} };
  vm.createContext(c);
  vm.runInContext(ui.slice(ui.indexOf('  function makeDeck('), ui.indexOf('  const THINK_POOL =')), c);
  vm.runInContext(ui.slice(ui.indexOf('  const SFX_BANK ='), ui.indexOf('  // ---------------- game state')) + 'this.bank=SFX_BANK;', c);
  vm.runInContext(ui.slice(ui.indexOf('  const pick = (arr)'), ui.indexOf('  function thump(')) + 'this.pick=pick;', c);
  vm.runInContext(ui.slice(ui.indexOf('  const THINK_POOL ='), ui.indexOf('  // ---------------- boot')) +
    'this.think=thinkSound;this.quota=()=>aiCardsThisGame;', c);
  const b = c.bank; b.decodeAll = () => {};
  for (const id of Object.keys(b.defs)) b.buffers.set(id, { duration: 1 });
  return { b, c, G, settings, tick: () => timer(), advance: ms => { now += ms; } };
}
for (const actor of ['human', 'engine']) {
  const { b, c, advance } = setup(actor);
  const voices = manifest.window.DRAFTI_VOICES;
  let previousVoice, previousMood, families = [], heard = new Set(), spoken = 0;
  for (let i = 0; i < 300; i++) {
    advance(9000);
    const id = c.think(actor);
    assert(id, actor + ' deck must not strand after exhausting one voice or mood');
    const info = b.narratorInfo(id);
    assert(info.role === 'either' || info.role === actor, 'Never address the wrong thinking actor');
    assert.notEqual(info.role, 'clock', 'An unexpired move clock cannot announce Time');
    const source = b.play(id, { narrator: true, narratorActor: actor, queue: false });
    assert(source, 'A selected eligible card must really be accepted');
    if (info.mood) {
      assert.notEqual(info.mood, previousMood, 'Narrator moods must alternate');
      assert(!families.slice(-3).includes(info.family), 'Alternate voices cannot repeat the same joke family');
      previousMood = info.mood; families.push(info.family); spoken++;
    }
    if (['jam', 'kazi'].includes(voices[id])) {
      assert.notEqual(voices[id], previousVoice, 'Authored narrator voices must alternate');
      previousVoice = voices[id];
    }
    heard.add(id); source.onended();
  }
  assert(heard.size >= 35 && spoken >= 40, actor + ' retains a varied usable speaking/effect pool');
  console.log(actor + ': 300 accepted draws, ' + heard.size + ' different recordings, ' + spoken + ' spoken cards');
}
{
  const { b, c, advance, settings } = setup();
  const ids = ['a', 'b', 'c', 'd'].map(x => 'deck_fixture_' + x);
  for (const id of ids) { b.defs[id] = { c: 'ui', event: 'fixture' }; b.buffers.set(id, { duration: 1 }); }
  const selections = [];
  for (let i = 0; i < 20; i++) {
    advance(1300); const source = b.effect('fixture'); assert(source);
    selections.push(b.recent.at(-1)); source.onended();
  }
  for (let i = 0; i < selections.length; i += 4) assert.equal(new Set(selections.slice(i, i + 4)).size, 4);
  assert(['a label', 'another label'].includes(c.pick(['a label', 'another label'])), 'Label selection stays intact');
  const allowed = ids.slice(0, 2);
  for (let i = 0; i < 4; i++) {
    advance(1000); const choice = c.pick(allowed); assert(allowed.includes(choice), 'Sound selection cannot escape its meaningful pool');
    const sound = b.play(choice); assert(sound); sound.onended();
  }
  settings.sfx.ui = false; advance(1300); assert.equal(b.effect('fixture'), null);
  settings.sfx.ui = true; settings.sound = false; assert.equal(b.effect('fixture'), null);
  settings.sound = true; b.sceneLockUntil = Infinity; advance(1300);
  assert(b.effect('fixture'), 'Protected ceremony still permits interface feedback');
  b.defs.deck_drama = { c: 'drama', event: 'drama_fixture' }; b.buffers.set('deck_drama', { duration: 1 });
  assert.equal(b.effect('drama_fixture'), null, 'Ordinary effects cannot interrupt the protected ceremony');
}
for (const reason of ['mute', 'speech', 'decoding', 'fast']) {
  const { b, c, settings, G, tick, advance } = setup();
  tick();
  if (reason === 'mute') settings.sound = false;
  if (reason === 'speech') b.activeSources.set({}, { spoken: true });
  if (reason === 'decoding') b.buffers.clear();
  if (reason === 'fast') G.aiSpeed = 4;
  advance(4000); tick();
  assert.equal(c.quota(), 0, reason + ': rejected narrator card must not spend the per-game quota');
}
{
  const { c, tick, advance } = setup(); tick(); advance(4000); tick(); assert.equal(c.quota(), 1);
}
{
  const { c, G, tick, advance } = setup();
  G.mode = 'ai'; G.side = -1; G.diff = 'l10'; G.aiSpeed = 16;
  tick(); advance(4000); tick();
  assert.equal(c.quota(), 1, 'Saved arena speed cannot silence a normal-speed human/computer game');
}
for (const change of ['move', 'epoch']) {
  const { c, b, G, tick } = setup('human'), delayed = [];
  c.humanTurn = () => true; c.setTimeout = fn => delayed.push(fn);
  c.THINK_TIERS = [{ at: 0, say: 'fixture' }];
  c.thinkArmedKey = -1; c.humanThinkStart = 0; c.thinkFired = 0;
  tick(); assert.equal(delayed.length, 1);
  if (change === 'move') G.history.push({}); else b.audioEpoch++;
  delayed[0](); assert.equal(b.activeSources.size, 0, 'A pending heckle must expire after ' + change);
}
console.log('PASS category decks, actor/mood/voice/family awareness, no stranded decks, priority/mute/decoding gates and accepted-only narrator quota');
