'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/audio.manifest.js'), 'utf8'), context);
const bank = context.window.DRAFTI_SFX;
const synths = new Set(['select','move','capture','king','win','lose','draw','illegal','undo','trap_snap','denied','relief','levelup','think-rustle']);
function verifySoundLog(input, requirements = {}) {
  const issues = [], rows = [], categories = {}, modes = {}, last = new Map(), narrators = new Map();
  if (!Array.isArray(input.audio)) throw Error('Expected a captured audio array');
  if (Object.values(input.dropped || {}).some(count => count > 0)) issues.push('Playback report is truncated; earlier events were dropped');
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
  const starts = new Map(), completedGames = [];
  for (const point of input.checkpoints || []) {
    const key = point.run + ':' + point.epoch;
    if (point.event === 'game-start' && point.ply === 0) starts.set(key, point);
    if (point.event !== 'game-end') continue;
    const start = starts.get(key);
    if (!start || point.mode !== start.mode || point.rsId !== start.rsId || point.at < start.at ||
        !Number.isInteger(point.ply) || point.ply < 1 || !point.result || typeof point.result.reason !== 'string') continue;
    const sounds = rows.filter(row => row.run === point.run && row.epoch === point.epoch && row.at >= start.at && row.at <= point.at).length;
    if (!sounds) continue;
    completedGames.push({ mode: point.mode, rsId: point.rsId, run: point.run, epoch: point.epoch,
      season: start.season, bout: start.bout, plies: point.ply, sounds, result: point.result });
    starts.delete(key); // Repeated end markers cannot manufacture extra games.
  }
  const seasonGames = new Map();
  for (const game of completedGames.filter(game => game.mode === 'aivai' && Number.isInteger(game.season) && Number.isInteger(game.bout))) {
    const key = game.run + ':' + game.season;
    if (!seasonGames.has(key)) seasonGames.set(key, new Set());
    seasonGames.get(key).add(game.bout);
  }
  const completedSeasons = [...seasonGames].filter(([, bouts]) => Array.from({ length: 12 }, (_, i) => i).every(i => bouts.has(i)))
    .map(([key]) => ({ runAndSeason: key, bouts: 12 }));
  if (requirements.mode && !completedGames.some(game => game.mode === requirements.mode))
    issues.push('No complete observed game in required mode: ' + requirements.mode);
  if (requirements.season && !completedSeasons.length) issues.push('No complete observed twelve-bout arena season');
  return { scope: input.scope || 'Captured playback events only', sounds: rows.length,
    distinctIds: new Set(rows.map(row => row.id)).size, categories, observedModes: modes, completedGames, completedSeasons, issues,
    limitations: 'Checks logged starts, IDs, clip cooldowns, supplied narrator context and matching fresh-start/end checkpoints. Resumed or partial games do not prove a full playthrough. It does not certify audible quality, every clip, installation or modes/seasons without matching complete evidence.' };
}
module.exports = { verifySoundLog };
if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node scripts/verify_sound_log.js <captured-browser-log.json>'); process.exitCode = 1; }
  else {
    const modeArg = process.argv.find(value => value.startsWith('--require-mode='));
    const report = verifySoundLog(JSON.parse(fs.readFileSync(file, 'utf8')), {
      mode: modeArg?.slice('--require-mode='.length), season: process.argv.includes('--require-season'),
    });
    console.log(JSON.stringify(report, null, 2));
    if (report.issues.length) process.exitCode = 1;
  }
}
