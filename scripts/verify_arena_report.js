'use strict';
// Verify the recorded run against its preserved production kernel, not today's changed rules menu.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const report = JSON.parse(fs.readFileSync(path.resolve(root, process.argv[2] || 'docs/arena-fairness.json'), 'utf8'));
assert.match(report.sourceCommit, /^[a-f0-9]{40}$/);
const snapshot = path.join(root, 'scripts/research_media/fairness-source-' + report.sourceCommit);
for (const file of ['src/engine.js', 'src/ui.js', 'scripts/arena_harness.js']) {
  const bytes = execFileSync('git', ['show', report.sourceCommit + ':' + file], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  const filename = path.join(snapshot, file);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  // This run was made in a Windows CRLF checkout. The original harness normalizes
  // engine text but hashes Function.toString() verbatim, retaining UI line ends.
  fs.writeFileSync(filename, bytes.toString('utf8').replace(/\r?\n/g, '\r\n'));
}
const h = require(path.join(snapshot, 'scripts/arena_harness.js')).createHarness();
assert.equal(h.fingerprint, report.sourceFingerprint, 'Recorded kernel must match the historical production source');
assert(h.E.RULESETS[report.ruleset || 'american']);
const openingLevels = h.api.ROSTER.map(nation => h.api.rosterLevel(nation.id)).sort((a,b) => a-b);
const openingMedian = (openingLevels[96] + openingLevels[97]) / 2;
assert.equal(report.bouts.length, 36);
assert.equal(report.nations.length, 194);
const played = {}, wins = {};
for (const [index, bout] of report.bouts.entries()) {
  assert.equal(bout.bout, index + 1);
  assert.equal(bout.season, Math.floor(index / 12) + 1);
  assert.equal(bout.stage, h.api.stageOfBout(index % 12));
  assert.notEqual(bout.ivory, bout.ebony);
  assert(bout.nodes > 0 && bout.plies > 0 && bout.deepest > 0);
  assert.notEqual(bout.unresolved, true, 'An unresolved simulation is incomplete evidence');
  assert(!/simulation safety cap/i.test(bout.reason), 'A capped run is incomplete evidence');
  assert([-1,0,1].includes(bout.winner), 'Every recorded bout needs a genuine result');
  assert.equal(bout.winnerId, bout.winner === 1 ? bout.ivory : bout.winner === -1 ? bout.ebony : null);
  for (const id of [bout.ivory, bout.ebony]) played[id] = (played[id] || 0) + 1;
  if (bout.winnerId) wins[bout.winnerId] = (wins[bout.winnerId] || 0) + 1;
}
for (const nation of report.nations) {
  assert.equal(nation.played, played[nation.id] || 0);
  assert.equal(nation.wins, wins[nation.id] || 0);
  assert(nation.level >= 4 && nation.level <= 10);
}
assert.deepEqual(report.growth.map(x => [x.season, x.medianLevel]),
  [1, 2, 3, 4].map(season => [season, openingMedian + season - 1]));
assert.equal(report.openers[0].challenger, 'KE');
assert.equal(new Set(report.openers.map(x => x.challenger)).size, 3);
assert(report.nations.some(x => x.bonusXp > 0));
let champion = 'TZ', dethronings = 0;
for (const bout of report.bouts) {
  assert([bout.ivory, bout.ebony].includes(champion));
  if (bout.winnerId && bout.winnerId !== champion) { champion = bout.winnerId; dethronings++; }
}
assert.equal(dethronings, report.dethronings);
assert(dethronings > 0);
console.log('PASS: production kernel hash, all 36 bouts/194 nation totals, rotating openers, stage bonuses and dethroning. Rules: ' +
  (report.ruleset || 'american') + '. Median progression: ' + report.growth.map(x => x.medianLevel).join(' → ') +
  '. Winner-stays scheduling yields unequal appearances.');
