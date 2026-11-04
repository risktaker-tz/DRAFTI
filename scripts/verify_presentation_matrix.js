'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const report = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'));
assert.equal(report.running, false, 'Observation must have finished');
assert.equal(report.complete, true, 'Partial matrices cannot pass');
assert.deepEqual(report.errors, []);
assert.equal(report.rows.length, 1008);
const themes = new Set(report.rows.map(row => row.theme));
const materials = new Set(report.rows.map(row => row.material));
assert.equal(themes.size, 21);
assert.equal(materials.size, 8);
const expected = { eastafrica8: [64, 24], eastafrica10: [100, 40], eastafrica12: [144, 60] };
const keys = new Set();
for (const row of report.rows) {
  assert(Object.hasOwn(expected, row.ruleset));
  assert.equal(typeof row.hv, 'boolean');
  const key = [row.ruleset, row.theme, row.material, row.hv].join('/');
  assert(!keys.has(key), 'Duplicate case ' + key);
  keys.add(key);
  assert.equal(row.cells, expected[row.ruleset][0], key + ' board cells');
  assert.equal(row.pieces, expected[row.ruleset][1], key + ' opening population');
  assert(row.boardWidth > 0 && Math.abs(row.boardWidth - row.boardHeight) < 1, key + ' square board');
  assert(row.maxCircleError < 1, key + ' circular discs');
  assert(row.documentWidth <= report.viewport.width + 1, key + ' horizontal overflow');
  for (const side of ['ivory', 'ebony']) {
    assert(row[side].width > 0 && row[side].height > 0);
    assert.equal(typeof row[side].background, 'string');
    assert.equal(typeof row[side].shadow, 'string');
  }
}
console.log('PASS: 1,008 distinct rendered opening layouts; 21 themes × 8 materials × 3 board sizes × 2 high-visibility states. Square boards, circular discs, correct populations and no horizontal overflow. Contrast, flags, kings and event effects require separate proof.');
