'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');

const ui = fs.readFileSync(path.join(__dirname, '../src/ui.js'), 'utf8');
let activeDecodes = 0, peakDecodes = 0, shouldFail = true;
const context = {
  decodeAudioData: async bytes => {
    activeDecodes++; peakDecodes = Math.max(peakDecodes, activeDecodes);
    await new Promise(resolve => setTimeout(resolve, 2));
    activeDecodes--;
    if (shouldFail && bytes.id === 'clip-7') throw new Error('temporary decode failure');
    return { id: bytes.id, duration: 1 };
  }
};
const c = {
  window: { DRAFTI_SFX: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`clip-${i}`, { d: `clip-${i}` }])) },
  FX: { ctx: context },
  fetch: async id => ({ arrayBuffer: async () => ({ id }) }),
  URLSearchParams, location: { search: '' }, console,
  performance: { now: () => 0 }, settings: { sound: true, sfx: {} }, G: { history: [], side: 1 }
};
vm.createContext(c);
vm.runInContext(ui.slice(ui.indexOf('  const SFX_BANK ='), ui.indexOf('  // ---------------- game state')) + 'this.bank=SFX_BANK;', c);

async function waitForQueue(bank) {
  for (let i = 0; i < 500 && bank.decoding; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(bank.decoding, false, 'decode queue drains');
}

(async () => {
  const bank = c.bank;
  bank.decodeAll();
  assert.equal(bank.decoding, true);
  await waitForQueue(bank);
  assert(peakDecodes <= 4, `expected at most four parallel decodes, observed ${peakDecodes}`);
  assert.equal(bank.buffers.size, 19, 'all successful clips are retained when one decode fails');
  assert.equal(bank.buffers.has('clip-7'), false);

  shouldFail = false; peakDecodes = 0;
  bank.decodeAll();
  await waitForQueue(bank);
  assert.equal(bank.buffers.size, 20, 'a failed clip can be retried on a later decodeAll call');
  assert(peakDecodes <= 4, 'retry remains within the concurrency bound');
  console.log('PASS bounded sound decoding: four-way maximum, queue drains after errors, and failed samples can retry');
})().catch(error => { console.error(error); process.exitCode = 1; });
