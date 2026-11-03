'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/audio.manifest.js'), 'utf8'), context);
const bank = context.window.DRAFTI_SFX;
const synths = new Set(['select','move','capture','king','win','lose','draw','illegal','undo','trap_snap','denied','relief','levelup','think-rustle']);
function verifySoundLog(input) {
  const issues = [], rows = [], categories = {}, modes = {}, last = new Map(), narrators = new Map();
  if (!Array.isArray(input.audio)) throw Error('Expected a captured audio array');
  if (input.errors?.length) issues.push('Browser console contains ' + input.errors.length + ' errors');
  for (const [index, entry] of input.audio.entries()) {
    let row;
    try {
      if (typeof entry.message !== 'string' || !entry.message.startsWith('[DRAFTI audio] ')) throw Error('Not an audio log entry');
      row = JSON.parse(entry.message.slice('[DRAFTI audio] '.length));
      if (typeof row.id !== 'string' || !Number.isFinite(row.at) || row.at < 0) throw Error('Missing sound ID or valid playback time');
    } catch (error) { issues.push('Row ' + index + ': ' + error.message); continue; }
    rows.push(row);
    categories[row.category] = (categories[row.category] || 0) + 1;
    modes[row.mode || 'unrecorded'] = (modes[row.mode || 'unrecorded'] || 0) + 1;
    const run = row.run ?? 'legacy';
    if (row.kind === 'synth') {
      if (!row.id.startsWith('synth:') || !synths.has(row.id.slice(6))) issues.push('Unknown generated sound ' + row.id);
      continue; // Generated action layers are not repeated recordings.
    }
    if (!Object.hasOwn(bank, row.id)) { issues.push('Unknown recording ' + row.id); continue; }
    if (row.category !== bank[row.id].c) issues.push('Wrong category for ' + row.id);
    const key = run + ':' + row.id, previous = last.get(key);
    if (previous !== undefined && row.at - previous < (row.category === 'ui' ? 150 : 8000) - 1)
      issues.push('Recording repeated before cooldown: ' + row.id + ' (' + (row.at - previous) + 'ms)');
    last.set(key, row.at);
    if (!row.narrator) continue;
    if (row.phase === 'over' || row.phase === 'animating') issues.push('Narrator started in ' + row.phase);
    if (row.narratorActor === 'engine' && (row.phase !== 'thinking' || /^(th_h\d+|t[1-5][a-e])/.test(row.id)))
      issues.push('Human/idle card used for engine: ' + row.id);
    if (row.narratorActor === 'human' && (row.phase !== 'idle' || row.mode === 'aivai' || /^th_n\d+/.test(row.id)))
      issues.push('Engine/arena card used for human: ' + row.id);
    if (row.id === 'v_time') issues.push('Move-clock deadline used as a narrator joke');
    const history = narrators.get(run) || { families: [] };
    if (row.mood) {
      if (row.mood === history.mood) issues.push('Consecutive narrator mood ' + row.mood);
      if (history.families.slice(-3).includes(row.family)) issues.push('Repeated narrator joke family ' + row.family);
      history.mood = row.mood; history.families.push(row.family); history.families = history.families.slice(-8);
    }
    if (['jam', 'kazi'].includes(row.voice)) {
      if (row.voice === history.voice) issues.push('Consecutive authored narrator voice ' + row.voice);
      history.voice = row.voice;
    }
    narrators.set(run, history);
  }
  if (!rows.length) issues.push('No actual sound starts captured');
  return { scope: input.scope || 'Captured playback events only', sounds: rows.length,
    distinctIds: new Set(rows.map(row => row.id)).size, categories, observedModes: modes, issues,
    limitations: 'Checks logged starts, IDs, clip cooldowns and supplied narrator context. It does not prove audible output, every clip, a completed match or a full season. Full three-mode playthrough and installation acceptance require their own evidence.' };
}
module.exports = { verifySoundLog };
if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node scripts/verify_sound_log.js <captured-browser-log.json>'); process.exitCode = 1; }
  else {
    const report = verifySoundLog(JSON.parse(fs.readFileSync(file, 'utf8')));
    console.log(JSON.stringify(report, null, 2));
    if (report.issues.length) process.exitCode = 1;
  }
}
