#!/usr/bin/env node
'use strict';
// Wait for the confirmed running batch; only retry after that process is terminal.
const fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const root = path.resolve(__dirname, '../..');
const directory = path.join(root, 'scripts/research_media/audience_raw');
const arg = process.argv.find(x => x.startsWith('--after-pid='));
const pid = arg ? Number(arg.slice(12)) : 0;
if (!Number.isSafeInteger(pid) || pid < 1) throw Error('Supply the actual current batch PID');
const alive = () => {
  try { process.kill(pid, 0); return true; }
  catch (e) { if (e.code === 'ESRCH') return false; throw e; }
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  console.log('Finisher ' + process.pid + ': leave batch ' + pid + ' running; retry only after it exits');
  while (alive()) await pause(5000);
  for (let pass = 1; pass <= 2; pass++) {
    const filename = path.join(directory, 'download-progress.json');
    const previous = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (Object.keys(previous.entries).length === previous.selected && !Object.keys(previous.failures).length) {
      console.log('All pinned raw files verified; no retry needed'); return;
    }
    fs.copyFileSync(filename, path.join(directory, 'download-pass-before-retry-' + process.pid + '-' + pass + '.json'));
    console.log('Retry pass ' + pass + ': verify cache and retry missing files with eight workers and size-aware timeouts');
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(__dirname, 'download_pinned.js'), '--workers=8'], { cwd: root, stdio: 'inherit', windowsHide: true });
      child.once('error', reject); child.once('exit', resolve);
    });
    if (code === 0) return;
    await pause(10000);
  }
  throw Error('Two bounded retry passes finished with failures; inspect download-progress.json');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
