'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/index.template.html'), 'utf8');
const preview = fs.readFileSync(path.join(root, 'src/cinematic_preview.js'), 'utf8');
const menuStart = html.indexOf('<aside class="drawer"');
const menuEnd = html.indexOf('</aside>', menuStart);
const launch = html.indexOf('id="cineLaunch"');

assert(menuStart >= 0 && menuEnd > menuStart, 'settings drawer exists');
assert(launch > menuStart && launch < menuEnd, 'Preview Studio launcher stays inside the settings drawer');
assert.equal((html.match(/id="cineLaunch"/g) || []).length, 1, 'there is only one launcher');
assert(preview.includes("launch.addEventListener('click',()=>{app.menu.close();togglePanel(true);})"),
  'the menu launcher opens the preview panel');
assert(preview.includes("$('btnMenu').addEventListener('click',()=>togglePanel(false))"),
  'opening the settings menu closes the preview panel');
assert(preview.includes("togglePanel(false);"), 'preview panel starts hidden');
console.log('PASS Preview Studio is reachable from the menu and has no launcher on the play surface');
