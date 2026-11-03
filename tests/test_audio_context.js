'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const ui = fs.readFileSync(path.join(__dirname, '../src/ui.js'), 'utf8');
function setup() {
  let now = 0;
  const defs = { first: { c: 'voice' }, second: { c: 'judge' }, thinking: { c: 'think', voice: 'kazi' }, click: { c: 'ui' } };
  const context = { destination: {}, createBufferSource: () => ({ playbackRate: {}, connect() {}, disconnect() {}, start() {}, stop() {} }),
    createGain: () => ({ gain: {}, connect() {}, disconnect() {} }) };
  const c = { window: { DRAFTI_SFX: defs }, settings: { sound: true, sfx: { voice: true, judge: true, think: true, ui: true } },
    G: { phase: 'thinking', history: [{}, {}], side: 1, over: false }, performance: { now: () => now },
    FX: { ensure: () => context }, URLSearchParams, location: { search: '' }, console };
  vm.runInNewContext(ui.slice(ui.indexOf('  const SFX_BANK ='), ui.indexOf('  // ---------------- game state')) + 'this.bank=SFX_BANK;', c);
  const b = c.bank; b.decodeAll = () => {};
  for (const id of Object.keys(defs)) b.buffers.set(id, { duration: 1 });
  return { b, G: c.G, advance: ms => { now += ms; } };
}
for (const transition of [g => g.history.push({}), g => { g.side = -1; }, g => { g.over = true; g.phase = 'over'; }, g => { g.history.pop(); }]) {
  const { b, G } = setup();
  const first = b.play('first'); assert(first);
  assert.equal(b.play('second'), null); assert.equal(b.queue.length, 1);
  transition(G); first.onended();
  assert.equal(b.queue.length, 0);
  assert.equal(b.activeSources.size, 0, 'Stale tactical speech cannot start after a move, undo, seat change or result');
  assert.equal(b.lastPlayed.has('second'), false, 'Discarding stale speech must not consume its cooldown');
}
{
  const { b, G } = setup(); const first = b.play('first'); b.play('second');
  G.phase = 'idle'; first.onended();
  assert.equal(b.activeSources.size, 1, 'Same-position comment remains valid when thinking ends without a move');
}
{
  const { b, G } = setup();
  G.phase = 'animating'; assert.equal(b.play('thinking'), null);
  G.phase = 'over'; assert.equal(b.play('thinking'), null);
  G.phase = 'idle'; G.over = true; assert.equal(b.play('thinking'), null);
  G.over = false; G.phase = 'thinking'; assert(b.play('thinking'));
}
{
  const { b, advance } = setup(); const click = b.play('click'); assert(click); click.onended();
  assert.equal(b.play('click'), null, 'Playback at time zero must still record a real cooldown');
  advance(151); assert(b.play('click'), 'UI cue becomes eligible after its own cooldown');
}
console.log('PASS audio context: queued speech expires on position/result changes, same-position pacing survives, thinking gates and zero-time cooldown hold');
