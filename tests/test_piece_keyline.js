'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const css = fs.readFileSync(path.join(__dirname, '../src/styles.css'), 'utf8');
assert.match(css, /filter:\s*drop-shadow\(0 0 \.7px rgba\(8, 12, 20, \.82\)\)/,
  'the disc keeps a soft dark perimeter shadow');
assert.match(css, /\.piece \.body::before\s*\{[^}]*border:\s*1px solid rgba\(8, 12, 20, \.78\)/s,
  'the material face keeps a fine dark bevel');
assert.match(css, /\.piece \.body\s*\{\s*outline:\s*1px solid rgba\(255, 250, 238, \.88\);\s*outline-offset:\s*0/s,
  'every piece has a light outer keyline');
assert.match(css, /body\.flags-on \.pieces \.piece\.ivory \.body\s*\{[^}]*border-color:\s*var\(--side-a-edge/s,
  'the outline treatment does not replace flag-specific piece edges');
assert.match(css, /body\.flags-on \.pieces \.piece\.ebony \.body\s*\{[^}]*border-color:\s*var\(--side-b-edge/s,
  'both flagged sides retain their own edge colors');
console.log('Piece material keyline and flag-edge preservation passed.');
