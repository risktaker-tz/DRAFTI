'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const { verifySoundLog } = require('../scripts/verify_sound_log');
const ui = fs.readFileSync(path.join(__dirname, '../src/ui.js'), 'utf8'), logs = [];
const noop = () => {}, node = () => ({ connect: noop, disconnect: noop, frequency: {}, gain: {} });
const ctx = { sampleRate: 100, createBuffer: (_, length) => ({ getChannelData: () => new Float32Array(length) }),
  createBiquadFilter: node, createGain: node,
  createBufferSource: () => ({ ...node(), playbackRate: {}, start: noop, stop: noop }) };
let now = 1000;
const c = { window: { DRAFTI_SFX: { ui_open: { c: 'ui' }, th_n01: { c: 'think', voice: 'jam' } } },
  settings: { sound: true, sfx: { classic: true, drama: true, ui: true, think: true } },
  G: { mode: 'ai', phase: 'idle', history: [], side: 1 }, URLSearchParams, location: { search: '?audio-audit' },
  performance: { now: () => now, timeOrigin: 123456 }, console: { info: (...args) => logs.push({ message: args.join(' ') }) } };
vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  const FX ='), ui.indexOf('  // ---------------- sample sound bank')) + 'this.fx=FX;', c);
c.fx.ctx = ctx; c.fx.ensure = () => ctx; c.fx.woodKnock = noop; c.fx.tone = noop; c.FX = c.fx;
vm.runInContext(ui.slice(ui.indexOf('  const SFX_BANK ='), ui.indexOf('  // ---------------- game state')) + 'this.bank=SFX_BANK;', c);
c.bank.decodeAll = noop; c.bank.buffers.set('ui_open', { duration: 1 }); c.bank.buffers.set('th_n01', { duration: 2 });
c.fx.play('move');
c.fx.play('unknown'); assert.equal(logs.length, 1, 'Unknown generated names must not appear as started sounds');
c.settings.sfx.classic = false; c.fx.play('move'); assert.equal(logs.length, 1);
c.settings.sfx.classic = true; c.fx.breathe();
const started = c.bank.play('ui_open'); assert(started); started.onended();
c.G.phase = 'thinking'; now += 10000;
assert(c.bank.play('th_n01', { narrator: true, narratorActor: 'engine' }));
const rows = logs.map(entry => JSON.parse(entry.message.slice('[DRAFTI audio] '.length)));
assert.deepEqual(rows.map(row => row.id), ['synth:move', 'synth:think-rustle', 'ui_open', 'th_n01']);
assert(rows.every(row => row.mode === 'ai' && row.run === 123456 && row.ply === 0));
assert.equal(rows.at(-1).narratorActor, 'engine'); assert.equal(rows.at(-1).durationSec, 2);
assert.equal(verifySoundLog({ audio: logs, errors: [] }).issues.length, 0);
const entry = row => ({ message: '[DRAFTI audio] ' + JSON.stringify(row) });
const invalid = rows.map(row => ({ ...row }));
invalid.push({ ...rows[2], at: rows[2].at + 10 });
assert(verifySoundLog({ audio: invalid.map(entry) }).issues.some(issue => issue.includes('cooldown')));
assert(verifySoundLog({ audio: [entry({ id: 'not-real', category: 'voice', at: 1 })] }).issues.some(issue => issue.includes('Unknown recording')));
assert(verifySoundLog({ audio: [entry({ ...rows.at(-1), phase: 'idle' })] }).issues.some(issue => issue.includes('engine')));
assert(verifySoundLog({ audio: [entry({ ...rows.at(-1), narratorActor: 'human', phase: 'idle' })] }).issues.some(issue => issue.includes('human')));
assert(verifySoundLog({ audio: [] }).issues.length);
assert(verifySoundLog({ audio: logs, errors: [{ message: 'real failure' }] }).issues.some(issue => issue.includes('console')));
console.log('PASS actual production sample/synth audit emission, mute/category gates, metadata and detection of unknown/early/wrong-actor/empty/error logs');
