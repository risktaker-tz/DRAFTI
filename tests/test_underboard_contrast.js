'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/ui.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../src/styles.css'), 'utf8');
const part = (a,b) => source.slice(source.indexOf(a), source.indexOf(b, source.indexOf(a)));
const c = {}; vm.createContext(c);
vm.runInContext(part('  const hexRgb =','  // flags never disappear'), c);
vm.runInContext(part('  const THEME_BASE =','  if (!THEMES.some') + 'this.themes=THEMES;', c);
vm.runInContext(part('  function billboardPalette(','  function applyTheme('), c);
const channels = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0);
const ratio = (a,b) => (Math.max(luminance(a),luminance(b)) + .05) / (Math.min(luminance(a),luminance(b)) + .05);
let checked = 0;
assert.equal(c.themes.length,21);
for (const theme of c.themes) {
  const palette = c.billboardPalette(theme.v), bg = channels(palette['--panel-opaque']);
  assert.equal(palette['--panel-opaque'], palette['--billboard-bg'], theme.id + ' opaque controls follow their theme');
  for (const ink of ['--billboard-ink','--billboard-dim']) {
    assert(ratio(channels(palette[ink]),bg) >= 4.5, theme.id + ' readable default/count text'); checked++;
  }
  const weak = theme.v['--accent-weak'].match(/[\d.]+/g).map(Number), maxAlpha = 1-(1-weak[3]) ** 2;
  for (let step = 0; step <= 20; step++) {
    const a = maxAlpha * step / 20, surface = bg.map((v,i) => v * (1-a) + weak[i] * a);
    assert(ratio(channels(palette['--underboard-active-ink']),surface) >= 4.5,
      theme.id + ' active/hover text over layered accent at ' + a);
    checked++;
  }
}
assert.match(css, /\.aivai-bar \.seg-btns button:hover[^{}]*\{[^{}]*color:\s*var\(--underboard-active-ink/,
  'Inactive speed hover must bind the foreground tested over the accent layers');
assert.match(css, /\.qa-bar \.btn:hover:not\(:disabled\) \.kbd[^{}]*\{[^{}]*color:\s*var\(--underboard-active-ink/,
  'Shortcut badges must use the tested foreground when the action background changes');
assert.match(css, /\.qa-bar \.btn:hover:not\(:disabled\)[^{}]*\.qa-bar \.btn.active[^{}]*\{[^{}]*background:\s*linear-gradient\(var\(--accent-weak\),\s*var\(--accent-weak\)\),\s*var\(--panel-opaque\)/,
  'Quick-action hover/active must retain the opaque panel beneath its accent, rather than exposing the page gradient');
console.log('PASS ' + checked + ' independent contrast measurements across all 21 themes plus actual hover CSS bindings: names/counts, opaque control faces and translucent active/hover layers');
