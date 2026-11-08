'use strict';
// Capture the actual rendered opening pieces across every table/material/HV
// combination. Using argv arrays avoids PowerShell quoting differences in the
// JavaScript expression sent to the isolated Chromium runner.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const browse = process.env.DRAFTI_BROWSE_EXE ||
  'C:/Users/Risk Taker/.codex/skills/gstack/browse/dist/browse.exe';
const serverScript = process.env.BROWSE_SERVER_SCRIPT ||
  'C:/Users/Risk Taker/.codex/skills/gstack/browse/dist/server-node.mjs';
const url = process.argv[2] || 'http://127.0.0.1:8080/?contrast-audit';
const output = path.resolve(root, process.argv[3] || 'docs/contrast-raster-current');
const themes = ['arcade','baize','club','cyberjade','glass','greenbuff','hologlass','ice',
  'maplewood','marble','mono','neon','royale','sakura','solar','space','synth','tourney',
  'travel','vapor','walnut'];
const filter = (process.env.DRAFTI_CONTRAST_THEME_FILTER || '').split(',').map(x => x.trim()).filter(Boolean);
const selectedThemes = filter.length ? themes.filter(theme => filter.includes(theme)) : themes;
const materials = ['theme','tourney','woodturn','ivoryjet','bakelite','steel','glass','stone'];
if (!selectedThemes.length || selectedThemes.length !== new Set(filter).size && filter.length) {
  throw new Error('Unknown theme in DRAFTI_CONTRAST_THEME_FILTER');
}

function call(args) {
  const result = spawnSync(browse, args, {cwd: root, encoding: 'utf8', windowsHide: true,
    env: {...process.env, BROWSE_SERVER_SCRIPT: serverScript}});
  if (result.error || result.status !== 0) {
    throw new Error(`Browser command failed: ${args[0]}\n${result.stderr || result.error || ''}`);
  }
  return (result.stdout || '').trim();
}

function select(theme, material, hv) {
  return `(()=>{const a=window.__drafti;if(!a?.menu)throw Error('DRAFTI preview is not ready');` +
    `let s=document.getElementById('contrast-matrix-clean');if(!s){s=document.createElement('style');s.id='contrast-matrix-clean';s.textContent='#whisperLabel,#eventLabel{display:none!important}';document.head.appendChild(s)}` +
    `document.querySelectorAll('#whisperLabel,#eventLabel').forEach(x=>x.remove());` +
    `a.menu.open();if(a.settings.rsId!=='eastafrica8'){document.querySelector('.east-africa-rule[data-v="eastafrica8"]').click();if(!document.getElementById('modalConfirm').hidden)document.getElementById('cfYes').click()}` +
    `const t=[...document.querySelectorAll('.theme-sw')].find(x=>x.dataset.v===${JSON.stringify(theme)});` +
    `const m=[...document.querySelectorAll('#segPieces [data-v]')].find(x=>x.dataset.v===${JSON.stringify(material)});` +
    `if(!t||!m)throw Error('Missing picker: ${theme}/${material}');t.click();m.click();` +
    `if(a.settings.hv!==${hv})document.querySelector('#btnHV').click();a.menu.close();` +
    `return new Promise(r=>setTimeout(()=>r('ready'),180))})()`;
}

function main() {
  fs.mkdirSync(output, {recursive: true});
  call(['goto', url]);
  call(['hover', '.brand']);
  let captured = 0;
  const expected = selectedThemes.length * materials.length * 2;
  for (const theme of selectedThemes) {
    // The isolated browser may recycle its page after a batch. Reopening the
    // same origin at each theme boundary is deterministic and retains settings.
    call(['goto', url]); call(['hover', '.brand']);
    for (const material of materials) for (const hv of [false, true]) {
      const suffix = hv ? 'hv' : 'normal';
      const file = path.join(output, `${theme}-${material}-${suffix}.png`);
      call(['js', select(theme, material, hv)]);
      call(['screenshot', '--selector', '#board', file]);
      captured++;
      if (captured % 16 === 0 || captured === expected) console.log(`Captured ${captured}/${expected} rendered boards`);
    }
  }
  console.log(`Complete: ${captured} captures in ${output}`);
}

main();
