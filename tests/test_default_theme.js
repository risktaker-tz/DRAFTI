'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const source = fs.readFileSync(path.join(__dirname,'../src/ui.js'),'utf8');
const { createHarness } = require('../scripts/arena_harness'), h = createHarness();
const part = (a,b) => source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function boot(storage) {
  const c = { E: h.E, IVORY: 1, LEVELS: h.api.LEVELS, STYLES: h.api.STYLES,
    playerProgress: { routes: () => false }, localStorage: { getItem: key => storage.get(key) ?? null,
      setItem: (key,value) => storage.set(key,value) } };
  vm.createContext(c);
  vm.runInContext(part('  const SETTINGS_KEY =','  const PRESENTATION_KEY ='),c);
  vm.runInContext(part('  const THEME_BASE =','  function billboardPalette(') + 'this.preferences=settings;this.themes=THEMES;',c);
  return c;
}
const empty = new Map(), fresh = boot(empty);
assert.equal(fresh.preferences.theme,'marble');
assert.equal(fresh.themes.find(t=>t.id===fresh.preferences.theme).name,'Marble Lux');
assert.equal(fresh.preferences.pieces,'theme','New pieces still follow the selected table');
assert.equal(empty.size,0,'Reading defaults must not overwrite storage');
for (const theme of fresh.themes) {
  const store = new Map([['drafti.settings.v1',JSON.stringify({theme:theme.id,rsId:'russian',pname:'Custom player'})]]);
  const c = boot(store);
  assert.equal(c.preferences.theme,theme.id,'Retain saved theme ' + theme.id);
  assert.equal(c.preferences.rsId,'russian'); assert.equal(c.preferences.pname,'Custom player');
}
for (const raw of ['{"theme":"unavailable"}','{broken', 'null','{}'])
  assert.equal(boot(new Map([['drafti.settings.v1',raw]])).preferences.theme,'marble');
let callback, applied;
fresh.themeGrid = { addEventListener: (_,fn) => { callback=fn; } };
fresh.applyTheme = id => { applied=id; }; fresh.updateSegs = () => {};
fresh.SFX_BANK = { play() {},effect() {} };
vm.runInContext(part("  themeGrid.addEventListener('click',",'  // piece-style picker:'),fresh);
callback({target:{closest:()=>({dataset:{v:'neon'}})}});
assert.equal(applied,'neon'); assert.equal(boot(empty).preferences.theme,'neon','A changed preference survives reload');
callback({target:{closest:()=>({dataset:{v:'marble'}})}});
assert.equal(boot(empty).preferences.theme,'marble','The default remains freely selectable');
console.log('PASS Marble Lux fresh default and invalid-setting fallback; all 21 saved themes/custom settings retained; real picker changes persist');
