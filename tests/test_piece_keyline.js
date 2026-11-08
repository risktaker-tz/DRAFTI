'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const css = fs.readFileSync(path.join(__dirname, '../src/styles.css'), 'utf8');
assert.match(css, /filter:\s*drop-shadow\(0 0 \.7px rgba\(8, 12, 20, \.82\)\)/,
  'the disc keeps a soft dark perimeter shadow');
assert.match(css, /\.piece \.body::before\s*\{[^}]*border:\s*1\.5px solid rgba\(8, 12, 20, \.9\)/s,
  'the material face keeps a visible dark bevel beneath the outer keyline');
assert.match(css, /--disc-keyline:\s*clamp\(2px, calc\(var\(--board-span\) \* \.005\), 3\.2px\)/,
  'keyline thickness scales with the rendered board size');
assert.match(css, /--disc-depth:\s*clamp\(1\.5px, calc\(var\(--board-span\) \* \.0044\), 2\.8px\)/,
  'the light side of the rim remains visible on small and full-size boards');
assert.match(css, /\.piece \.body::after\s*\{[^}]*border:\s*var\(--disc-keyline\) solid rgba\(5, 8, 14, \.98\);[^}]*outline:\s*var\(--disc-depth\) solid rgba\(255, 252, 243, \.98\)/s,
  'every piece has a size-aware dark/light keyline that reads on either square');
assert.match(css, /body\.pieces-glass \.piece \.body::after\s*\{[^}]*border-width:\s*calc\(var\(--disc-keyline\) \+ clamp\(\.1px, calc\(var\(--board-span\) \* \.0008\), \.4px\)\);[^}]*outline-width:\s*calc\(var\(--disc-depth\) \+ clamp\(\.1px, calc\(var\(--board-span\) \* \.0006\), \.32px\)\)/s,
  'translucent material keeps a subtly reinforced, responsive silhouette');
assert.match(css, /body\.hv\.pieces-glass \.piece \.body::after\s*\{[^}]*border-width:\s*calc\(var\(--disc-keyline\) \+ clamp\(\.25px, calc\(var\(--board-span\) \* \.0012\), \.65px\)\);[^}]*outline-width:\s*calc\(var\(--disc-depth\) \+ clamp\(\.25px, calc\(var\(--board-span\) \* \.0008\), \.5px\)\)/s,
  'high-visibility Neon Glass strengthens only its responsive dual-tone rim');
assert.match(css, /body\.flags-on \.pieces \.piece\.ivory \.body\s*\{[^}]*border-color:\s*var\(--side-a-edge/s,
  'the outline treatment does not replace flag-specific piece edges');
assert.match(css, /body\.flags-on \.pieces \.piece\.ebony \.body\s*\{[^}]*border-color:\s*var\(--side-b-edge/s,
  'both flagged sides retain their own edge colors');
console.log('Piece material keyline and flag-edge preservation passed.');
