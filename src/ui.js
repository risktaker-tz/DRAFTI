'use strict';
/* DRAFTI web UI — game state, rendering, input, animation, AI worker, extras. */
(function () {
  const E = makeEngine();
  const IVORY = E.IVORY, EBONY = E.EBONY;
  const HOP_MS = 200;
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const CROWN = '<svg class="crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18h17l1.4-9.2-5.4 3.6L12 5.2 7.5 12.4 2.1 8.8z" stroke-width="1"/></svg>';

  // ---------------- difficulty ladder ----------------
  // Ten rungs from first-timer to superhuman. `blunder` is the chance the
  // engine throws in a deliberately random move, `pool` is how far (in
  // centipawns) from the best move alternatives stay attractive — together
  // they make the low rungs human-beatable without making them silly.
  const LEVELS = {
    l1: { name: 'Beginner',       budgetMs: 90,   maxDepth: 2,  jitter: 45, blunder: .35, pool: 160 },
    l2: { name: 'Novice',         budgetMs: 120,  maxDepth: 3,  jitter: 30, blunder: .22, pool: 120 },
    l3: { name: 'Casual',         budgetMs: 220,  maxDepth: 5,  jitter: 16, blunder: .12, pool: 80 },
    l4: { name: 'Club',           budgetMs: 320,  maxDepth: 8,  jitter: 9,  blunder: .06, pool: 55 },
    l5: { name: 'Expert',         budgetMs: 420,  maxDepth: 10, jitter: 6,  blunder: .03, pool: 0 },
    l6: { name: 'Master',         budgetMs: 700,  maxDepth: 13, jitter: 4,  blunder: .015, pool: 0 },
    l7: { name: 'Grandmaster',    budgetMs: 1200, maxDepth: 18, jitter: 2,  blunder: 0,   pool: 0 },
    l8: { name: 'Super GM',       budgetMs: 1800, maxDepth: 22, jitter: 1,  blunder: 0,   pool: 0 },
    l9: { name: 'World Champion', budgetMs: 2600, maxDepth: 26, jitter: 0,  blunder: 0,   pool: 0 },
    l10: { name: 'The Machine',   budgetMs: 4200, maxDepth: 30, jitter: 0,  blunder: 0,   pool: 0 },
  };
  const LEVEL_IDS = Object.keys(LEVELS);

  // ---------------- world playing styles ----------------
  // National schools as AI personalities. The `w` weights feed the engine's
  // evaluator (aggression, back-rank guard, king hunger, willingness to
  // trade, centre play); `chaos` widens the move pool so loose styles feel
  // improvisational; the voice lines give every school its own table talk.
  const STYLES = [
    { id: 'classic',   flag: '🌎', name: 'Classic',   blurb: 'The balanced all-rounder — solid book play, no favours.',
      w: { aggr: 1, guard: 1, king: 1, trade: 1, center: 1 }, chaos: .2 },
    { id: 'american',  flag: '🇺🇸', name: 'American',  blurb: 'Straight-shooting English draughts: structure first, morals later.',
      w: { aggr: 1.05, guard: 1.05, king: 1, trade: 1, center: 1.05 }, chaos: .25 },
    { id: 'english',   flag: '🇬🇧', name: 'English',   blurb: 'Positional, patient, suffocating. Wins you with a shrug.',
      w: { aggr: .85, guard: 1.25, king: .9, trade: 1.05, center: 1.2 }, chaos: .15 },
    { id: 'italian',   flag: '🇮🇹', name: 'Italian',   blurb: 'Furioso! Sacrifices for attack, and drama by the move.',
      w: { aggr: 1.6, guard: .8, king: 1.1, trade: 1.15, center: 1.1 }, chaos: .55 },
    { id: 'spanish',   flag: '🇪🇸', name: 'Spanish',   blurb: 'Flank and king play — the long diagonal is a promise.',
      w: { aggr: 1.15, guard: 1.05, king: 1.3, trade: .9, center: .85 }, chaos: .35 },
    { id: 'czech',     flag: '🇨🇿', name: 'Czech',     blurb: 'The Fortress. Fortify, trade down, grind out the endgame.',
      w: { aggr: .7, guard: 1.5, king: .95, trade: .8, center: 1.05 }, chaos: .1 },
    { id: 'french',    flag: '🇫🇷', name: 'French',    blurb: 'Élégance above all — central beauty, complications declined.',
      w: { aggr: .9, guard: 1.1, king: 1.05, trade: .85, center: 1.25 }, chaos: .2 },
    { id: 'russian',   flag: '🇷🇺', name: 'Russian',   blurb: 'Bold gambits and sharp tactics — the piece is a decoy.',
      w: { aggr: 1.45, guard: .85, king: 1.2, trade: 1.2, center: 1.05 }, chaos: .6 },
    { id: 'kenyan',    flag: '🇰🇪', name: 'Kenyan',    blurb: 'The Hustle — fast, fearless trap-setting street checkers.',
      w: { aggr: 1.7, guard: .7, king: 1.15, trade: 1.3, center: .9 }, chaos: .85 },
    { id: 'tanzanian', flag: '🇹🇿', name: 'Tanzanian', blurb: 'The Joker — unpredictable, tricky, allergic to routine.',
      w: { aggr: 1.5, guard: .75, king: 1.25, trade: 1.2, center: .95 }, chaos: 1 },
    { id: 'brazilian', flag: '🇧🇷', name: 'Brazilian', blurb: 'Samba draughts: rhythm, swings and attacking flair.',
      w: { aggr: 1.3, guard: .9, king: 1.15, trade: 1.1, center: 1 }, chaos: .6 },
    { id: 'mongolian', flag: '🇲🇳', name: 'Mongolian', blurb: 'Raider kings — crown early, raid everywhere.',
      w: { aggr: 1.2, guard: .8, king: 1.6, trade: 1, center: .9 }, chaos: .5 },
  ];
  const styleById = (id) => STYLES.find((s) => s.id === id) || STYLES[0];

  // Which personality drives the engine currently thinking? `side` is the
  // side the ENGINE is searching for. Hotseat has no engines.
  function styleForSide(side) {
    if (G.mode === 'ai') return side === G.humanSide ? null : styleById(settings.style);
    if (G.mode === 'aivai') return styleById(side === IVORY ? settings.styleIvory : settings.styleEbony);
    return null;
  }

  // ---------------- persistence ----------------
  const SETTINGS_KEY = 'drafti.settings.v1';
  const STATS_KEY = 'drafti.stats.v1';
  function loadJSON(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : fb; } catch { return fb; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode etc. */ } }

  const settings = Object.assign(
    { rsId: 'american', mode: 'ai', diff: 'l5', humanSide: IVORY, sound: true, rotate: true, theme: 'neon', clock: 0, speed: 1, hv: false, ambient: true, style: 'classic', styleIvory: 'italian', styleEbony: 'czech', pname: 'UHAKIKA', pname2: 'Challenger', aivaiAuto: true, jumpPaths: true, shake: true },
    loadJSON(SETTINGS_KEY, {})
  );
  if (!E.RULESETS[settings.rsId]) settings.rsId = 'american';
  if (settings.mode !== 'ai' && settings.mode !== 'hotseat' && settings.mode !== 'aivai') settings.mode = 'ai';
  // difficulty ladder: migrate the old three strengths onto the new rungs
  const OLD_DIFF = { easy: 'l2', medium: 'l5', hard: 'l7' };
  if (OLD_DIFF[settings.diff]) settings.diff = OLD_DIFF[settings.diff];
  if (!LEVELS[settings.diff]) settings.diff = 'l5';
  if (!STYLES.some((s) => s.id === settings.style)) settings.style = 'classic';
  if (!STYLES.some((s) => s.id === settings.styleIvory)) settings.styleIvory = 'italian';
  if (!STYLES.some((s) => s.id === settings.styleEbony)) settings.styleEbony = 'czech';
  if (![0, 30, 60, 90].includes(settings.clock)) settings.clock = 0;
  if (![1, 2, 4].includes(settings.speed)) settings.speed = 1;
  settings.sfx = Object.assign(
    { master: 0.9, animals: true, judge: true, comedy: true, voice: true, classic: true, think: true, ui: true, drama: true, party: true },
    (settings.sfx && typeof settings.sfx === 'object') ? settings.sfx : {}
  );
  // player names: short, non-empty, one line
  const cleanName = (v, fb) => {
    const s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 18);
    return s || fb;
  };
  settings.pname = cleanName(settings.pname, 'UHAKIKA');
  settings.pname2 = cleanName(settings.pname2, 'Challenger');

  // ---------------- themes ----------------
  // Every theme overrides the CSS custom properties defined in styles.css.
  // The base palette (Neon Circuit) is always applied first so nothing leaks
  // between themes.
  const THEME_BASE = {
    '--bg-image': 'radial-gradient(1100px 620px at 12% -8%, rgba(58,224,255,.13), transparent 55%),radial-gradient(950px 640px at 106% 106%, rgba(139,123,255,.15), transparent 55%),linear-gradient(180deg,#070b14,#0a1120 55%,#060a12)',
    '--panel': 'rgba(13,22,38,.78)', '--panel-line': 'rgba(90,200,255,.22)',
    '--modal-bg': 'linear-gradient(170deg,#0e1a2c,#091220)', '--backdrop': 'rgba(3,6,12,.72)',
    '--ink': '#e8f4fb', '--ink-dim': '#8fa8bd',
    '--accent': '#3ae0ff', '--accent-2': '#8b7bff',
    '--accent-soft': 'rgba(58,224,255,.5)', '--accent-weak': 'rgba(58,224,255,.13)',
    '--accent-ink': '#04222c', '--danger': '#ff6d5a',
    '--frame-hi': '#1c2f47', '--frame': '#101d30', '--frame-lo': '#0a1422',
    '--frame-glow': 'rgba(58,224,255,.16)',
    '--sq-light-hi': '#3f6f9d', '--sq-light': '#35608c', '--sq-light-lo': '#2b5178',
    '--sq-dark-hi': '#16293e', '--sq-dark': '#112238', '--sq-dark-lo': '#0c1a2e',
    '--grid-line': 'rgba(96,205,255,.18)',
    '--sqnum-l': 'rgba(9,20,32,.8)', '--sqnum-d': 'rgba(150,220,255,.75)',
    '--pl-l-1': '#ffffff', '--pl-l-2': '#dbeefa', '--pl-l-3': '#a8c8dd',
    '--pl-l-edge': '#7fa7c2', '--pl-l-glow': 'rgba(120,220,255,.35)',
    '--pl-d-1': '#5d7295', '--pl-d-2': '#364260', '--pl-d-3': '#1a2234',
    '--pl-d-edge': '#0a0f18', '--pl-d-glow': 'rgba(139,123,255,.4)',
  };
  const T = (id, name, fx, o) => ({ id, name, fx: fx || null, v: Object.assign({}, THEME_BASE, o) });
  const GLOW0 = 'rgba(0,0,0,0)';
  const THEMES = [
    T('neon', 'Neon Circuit', null, {}),
    T('hologlass', 'Hologlass', null, {
      '--bg-image': 'radial-gradient(1000px 600px at 20% -10%, rgba(69,232,194,.14), transparent 55%),radial-gradient(900px 600px at 100% 110%, rgba(127,157,255,.14), transparent 55%),linear-gradient(180deg,#050d12,#0b1926 60%,#04090e)',
      '--panel': 'rgba(10,24,30,.8)', '--panel-line': 'rgba(90,240,210,.22)',
      '--modal-bg': 'linear-gradient(170deg,#0c2029,#07141b)', '--backdrop': 'rgba(2,8,11,.72)',
      '--ink': '#e6f7f2', '--ink-dim': '#8fb3ab',
      '--accent': '#45e8c2', '--accent-2': '#7f9dff',
      '--accent-soft': 'rgba(69,232,194,.5)', '--accent-weak': 'rgba(69,232,194,.12)',
      '--accent-ink': '#03231b', '--danger': '#ff7a68',
      '--frame-hi': '#14262e', '--frame': '#0c1a21', '--frame-lo': '#071118',
      '--frame-glow': 'rgba(69,232,194,.15)',
      '--sq-light-hi': '#2b5a63', '--sq-light': '#234b54', '--sq-light-lo': '#1b3c44',
      '--sq-dark-hi': '#0e2c35', '--sq-dark': '#0a232b', '--sq-dark-lo': '#071a20',
      '--grid-line': 'rgba(90,240,210,.18)',
      '--sqnum-l': 'rgba(5,20,24,.8)', '--sqnum-d': 'rgba(130,240,215,.75)',
      '--pl-l-1': '#f2fffb', '--pl-l-2': '#d2f2e8', '--pl-l-3': '#9fd4c6',
      '--pl-l-edge': '#7fb5a6', '--pl-l-glow': 'rgba(80,240,200,.3)',
      '--pl-d-1': '#46707e', '--pl-d-2': '#2a4a56', '--pl-d-3': '#122630',
      '--pl-d-edge': '#08131a', '--pl-d-glow': 'rgba(127,157,255,.35)',
    }),
    T('cyberjade', 'Cyber Jade', null, {
      '--bg-image': 'radial-gradient(1000px 620px at 50% -12%, rgba(61,255,156,.12), transparent 55%),linear-gradient(180deg,#030805,#06100a 55%,#020604)',
      '--panel': 'rgba(8,22,15,.82)', '--panel-line': 'rgba(61,255,156,.22)',
      '--modal-bg': 'linear-gradient(170deg,#0a1c12,#050f09)', '--backdrop': 'rgba(1,5,3,.74)',
      '--ink': '#e8fff2', '--ink-dim': '#85ad97',
      '--accent': '#3dff9c', '--accent-2': '#21d4a0',
      '--accent-soft': 'rgba(61,255,156,.5)', '--accent-weak': 'rgba(61,255,156,.11)',
      '--accent-ink': '#02271a', '--danger': '#ff6d5a',
      '--frame-hi': '#142e20', '--frame': '#0c1e14', '--frame-lo': '#071309',
      '--frame-glow': 'rgba(61,255,156,.15)',
      '--sq-light-hi': '#215f3a', '--sq-light': '#1a512f', '--sq-light-lo': '#144326',
      '--sq-dark-hi': '#0d2e1c', '--sq-dark': '#0a2415', '--sq-dark-lo': '#071a0e',
      '--grid-line': 'rgba(61,255,156,.18)',
      '--sqnum-l': 'rgba(3,16,9,.8)', '--sqnum-d': 'rgba(120,245,180,.75)',
      '--pl-l-1': '#f0fff6', '--pl-l-2': '#c2ecd6', '--pl-l-3': '#8cc4a6',
      '--pl-l-edge': '#63a583', '--pl-l-glow': 'rgba(61,255,156,.3)',
      '--pl-d-1': '#456a52', '--pl-d-2': '#2a4434', '--pl-d-3': '#12241a',
      '--pl-d-edge': '#050806', '--pl-d-glow': 'rgba(61,255,156,.25)',
    }),
    T('synth', 'Synthwave', null, {
      '--bg-image': 'radial-gradient(1000px 600px at 50% 115%, rgba(255,79,216,.2), transparent 60%),radial-gradient(800px 500px at 85% -10%, rgba(255,157,69,.12), transparent 55%),linear-gradient(180deg,#170b2b,#1f1038 55%,#120826)',
      '--panel': 'rgba(26,14,44,.82)', '--panel-line': 'rgba(255,79,216,.26)',
      '--modal-bg': 'linear-gradient(170deg,#2a1846,#1a0e2e)', '--backdrop': 'rgba(8,2,16,.74)',
      '--ink': '#fdeaf7', '--ink-dim': '#bd9fc0',
      '--accent': '#ff4fd8', '--accent-2': '#ff9d45',
      '--accent-soft': 'rgba(255,79,216,.5)', '--accent-weak': 'rgba(255,79,216,.13)',
      '--accent-ink': '#2c0620', '--danger': '#ff5a3c',
      '--frame-hi': '#3a2657', '--frame': '#271840', '--frame-lo': '#180d29',
      '--frame-glow': 'rgba(255,79,216,.18)',
      '--sq-light-hi': '#5f4690', '--sq-light': '#523b7c', '--sq-light-lo': '#432f66',
      '--sq-dark-hi': '#342056', '--sq-dark': '#281541', '--sq-dark-lo': '#1d0e33',
      '--grid-line': 'rgba(255,79,216,.2)',
      '--sqnum-l': 'rgba(12,4,24,.8)', '--sqnum-d': 'rgba(255,160,230,.8)',
      '--pl-l-1': '#fff3fb', '--pl-l-2': '#f0d5ea', '--pl-l-3': '#c9a3d4',
      '--pl-l-edge': '#a878b8', '--pl-l-glow': 'rgba(255,79,216,.35)',
      '--pl-d-1': '#5f4a94', '--pl-d-2': '#463470', '--pl-d-3': '#251a44',
      '--pl-d-edge': '#120a20', '--pl-d-glow': 'rgba(255,157,69,.4)',
    }),
    T('vapor', 'Vapor Dreams', null, {
      '--bg-image': 'radial-gradient(1000px 600px at 15% -10%, rgba(255,154,213,.16), transparent 55%),radial-gradient(900px 560px at 105% 105%, rgba(154,213,255,.14), transparent 55%),linear-gradient(180deg,#241b3d,#332252 55%,#1e1536)',
      '--panel': 'rgba(38,28,64,.8)', '--panel-line': 'rgba(255,154,213,.24)',
      '--modal-bg': 'linear-gradient(170deg,#3a2a5e,#271b44)', '--backdrop': 'rgba(10,6,22,.7)',
      '--ink': '#fdf3fb', '--ink-dim': '#c3aede',
      '--accent': '#ff9ad5', '--accent-2': '#9ad5ff',
      '--accent-soft': 'rgba(255,154,213,.55)', '--accent-weak': 'rgba(255,154,213,.13)',
      '--accent-ink': '#33102a', '--danger': '#ff6d5a',
      '--frame-hi': '#54427a', '--frame': '#3e3060', '--frame-lo': '#291f44',
      '--frame-glow': 'rgba(255,154,213,.18)',
      '--sq-light-hi': '#9380be', '--sq-light': '#8372ae', '--sq-light-lo': '#71619a',
      '--sq-dark-hi': '#5a4880', '--sq-dark': '#4b3a6e', '--sq-dark-lo': '#3d2e59',
      '--grid-line': 'rgba(255,154,213,.18)',
      '--sqnum-l': 'rgba(20,12,40,.75)', '--sqnum-d': 'rgba(255,205,240,.75)',
      '--pl-l-1': '#fffdf7', '--pl-l-2': '#f2e6f5', '--pl-l-3': '#d4b8e0',
      '--pl-l-edge': '#b191c4', '--pl-l-glow': 'rgba(255,154,213,.4)',
      '--pl-d-1': '#8a7ab4', '--pl-d-2': '#6f5d9e', '--pl-d-3': '#3b2f60',
      '--pl-d-edge': '#0e0a1a', '--pl-d-glow': 'rgba(154,213,255,.35)',
    }),
    T('solar', 'Solar Storm', null, {
      '--bg-image': 'radial-gradient(1100px 620px at 50% 120%, rgba(255,90,60,.18), transparent 60%),radial-gradient(800px 500px at 90% -10%, rgba(255,157,69,.1), transparent 55%),linear-gradient(180deg,#0c0502,#160903 55%,#080302)',
      '--panel': 'rgba(24,12,5,.84)', '--panel-line': 'rgba(255,157,69,.24)',
      '--modal-bg': 'linear-gradient(170deg,#2a1408,#1a0c04)', '--backdrop': 'rgba(6,2,0,.76)',
      '--ink': '#fdf0e2', '--ink-dim': '#c4a586',
      '--accent': '#ff9d45', '--accent-2': '#ff5a3c',
      '--accent-soft': 'rgba(255,157,69,.5)', '--accent-weak': 'rgba(255,157,69,.12)',
      '--accent-ink': '#2c1202', '--danger': '#ff5a3c',
      '--frame-hi': '#4a2c14', '--frame': '#331d0c', '--frame-lo': '#1f1005',
      '--frame-glow': 'rgba(255,157,69,.18)',
      '--sq-light-hi': '#74431f', '--sq-light': '#633717', '--sq-light-lo': '#512b0f',
      '--sq-dark-hi': '#3a1e0b', '--sq-dark': '#2b1505', '--sq-dark-lo': '#1d0d02',
      '--grid-line': 'rgba(255,157,69,.2)',
      '--sqnum-l': 'rgba(16,6,2,.8)', '--sqnum-d': 'rgba(255,195,140,.75)',
      '--pl-l-1': '#fff4e0', '--pl-l-2': '#f5ddb8', '--pl-l-3': '#d4ac78',
      '--pl-l-edge': '#b08850', '--pl-l-glow': 'rgba(255,157,69,.35)',
      '--pl-d-1': '#6e5240', '--pl-d-2': '#4e3828', '--pl-d-3': '#2a1c12',
      '--pl-d-edge': '#0d0805', '--pl-d-glow': 'rgba(255,90,60,.35)',
    }),
    T('glass', 'Neon Glass', 'glass', {
      '--bg-image': 'radial-gradient(1000px 620px at 18% -12%, rgba(0,229,255,.16), transparent 55%),radial-gradient(900px 600px at 105% 108%, rgba(255,61,245,.14), transparent 55%),linear-gradient(180deg,#070312,#0d0524 55%,#050210)',
      '--panel': 'rgba(16,10,36,.8)', '--panel-line': 'rgba(0,229,255,.3)',
      '--modal-bg': 'linear-gradient(170deg,#150c30,#0b0620)', '--backdrop': 'rgba(2,0,10,.74)',
      '--ink': '#eaf6ff', '--ink-dim': '#9a8fc4',
      '--accent': '#00e5ff', '--accent-2': '#ff3df5',
      '--accent-soft': 'rgba(0,229,255,.5)', '--accent-weak': 'rgba(0,229,255,.12)',
      '--accent-ink': '#021b26', '--danger': '#ff5a8a',
      '--frame-hi': '#241a4a', '--frame': '#171040', '--frame-lo': '#0d0830',
      '--frame-glow': 'rgba(0,229,255,.22)',
      '--sq-light-hi': '#3a8cbc', '--sq-light': '#2e7ca8', '--sq-light-lo': '#24678d',
      '--sq-dark-hi': '#20144e', '--sq-dark': '#180e3c', '--sq-dark-lo': '#100829',
      '--grid-line': 'rgba(0,229,255,.3)',
      '--sqnum-l': 'rgba(2,20,30,.8)', '--sqnum-d': 'rgba(140,240,255,.8)',
      '--pl-l-1': '#ffffff', '--pl-l-2': '#d9f6ff', '--pl-l-3': '#9fd4e8',
      '--pl-l-edge': '#6fb3cc', '--pl-l-glow': 'rgba(0,229,255,.5)',
      '--pl-d-1': '#8a76b4', '--pl-d-2': '#423468', '--pl-d-3': '#201643',
      '--pl-d-edge': '#0e0820', '--pl-d-glow': 'rgba(255,61,245,.45)',
    }),
    T('ice', 'Quantum Ice', null, {
      '--bg-image': 'radial-gradient(1000px 600px at 15% -10%, rgba(255,255,255,.7), transparent 55%),linear-gradient(180deg,#eef5fa,#d9e8f2 60%,#cbdeeb)',
      '--panel': 'rgba(255,255,255,.8)', '--panel-line': 'rgba(14,127,168,.28)',
      '--modal-bg': 'linear-gradient(170deg,#ffffff,#e8f2f8)', '--backdrop': 'rgba(90,120,140,.4)',
      '--ink': '#16303f', '--ink-dim': '#4f7086',
      '--accent': '#0b87b8', '--accent-2': '#5a7bd8',
      '--accent-soft': 'rgba(11,135,184,.45)', '--accent-weak': 'rgba(11,135,184,.1)',
      '--accent-ink': '#ffffff', '--danger': '#d05a3c',
      '--frame-hi': '#c2d6e4', '--frame': '#a4bdce', '--frame-lo': '#87a3b6',
      '--frame-glow': 'rgba(11,135,184,.18)',
      '--sq-light-hi': '#f7fbfe', '--sq-light': '#dcecf6', '--sq-light-lo': '#c8e0ee',
      '--sq-dark-hi': '#9ec2d6', '--sq-dark': '#8ab2c9', '--sq-dark-lo': '#74a0b8',
      '--grid-line': 'rgba(30,90,120,.16)',
      '--sqnum-l': 'rgba(20,60,85,.55)', '--sqnum-d': 'rgba(255,255,255,.78)',
      '--pl-l-1': '#ffffff', '--pl-l-2': '#f8fcfe', '--pl-l-3': '#c9dde9',
      '--pl-l-edge': '#6f9cb5', '--pl-l-glow': 'rgba(11,135,184,.15)',
      '--pl-d-1': '#56788e', '--pl-d-2': '#3a566b', '--pl-d-3': '#22374a',
      '--pl-d-edge': '#16283a', '--pl-d-glow': 'rgba(90,123,216,.25)',
    }),
    T('space', 'Deep Space', null, {
      '--bg-image': 'radial-gradient(1.2px 1.2px at 12% 22%, rgba(255,255,255,.8), transparent 100%),radial-gradient(1px 1px at 34% 68%, rgba(255,255,255,.6), transparent 100%),radial-gradient(1.4px 1.4px at 58% 12%, rgba(255,255,255,.7), transparent 100%),radial-gradient(1px 1px at 76% 42%, rgba(255,255,255,.55), transparent 100%),radial-gradient(1.2px 1.2px at 88% 78%, rgba(255,255,255,.7), transparent 100%),radial-gradient(1px 1px at 22% 88%, rgba(255,255,255,.5), transparent 100%),radial-gradient(900px 600px at 80% -10%, rgba(157,140,255,.14), transparent 55%),linear-gradient(180deg,#05060f,#0a0c1c 55%,#04050c)',
      '--panel': 'rgba(14,16,34,.82)', '--panel-line': 'rgba(255,209,102,.22)',
      '--modal-bg': 'linear-gradient(170deg,#161a36,#0d0f22)', '--backdrop': 'rgba(2,3,10,.76)',
      '--ink': '#eef0ff', '--ink-dim': '#9aa0c4',
      '--accent': '#ffd166', '--accent-2': '#9d8cff',
      '--accent-soft': 'rgba(255,209,102,.5)', '--accent-weak': 'rgba(255,209,102,.11)',
      '--accent-ink': '#2c1e04', '--danger': '#ff6d5a',
      '--frame-hi': '#23274a', '--frame': '#171a36', '--frame-lo': '#0d0f22',
      '--frame-glow': 'rgba(255,209,102,.14)',
      '--sq-light-hi': '#3c4472', '--sq-light': '#313860', '--sq-light-lo': '#272d4f',
      '--sq-dark-hi': '#171a38', '--sq-dark': '#12142e', '--sq-dark-lo': '#0d0f24',
      '--grid-line': 'rgba(255,209,102,.17)',
      '--sqnum-l': 'rgba(6,8,20,.8)', '--sqnum-d': 'rgba(255,225,160,.75)',
      '--pl-l-1': '#f5f7ff', '--pl-l-2': '#d8ddf2', '--pl-l-3': '#a9b2d4',
      '--pl-l-edge': '#7f8ab5', '--pl-l-glow': 'rgba(255,209,102,.3)',
      '--pl-d-1': '#4d5480', '--pl-d-2': '#333a5e', '--pl-d-3': '#1b1e38',
      '--pl-d-edge': '#0b0c1a', '--pl-d-glow': 'rgba(157,140,255,.4)',
    }),
    T('club', 'Midnight Club', 'wood', {
      '--bg-image': 'radial-gradient(1200px 700px at 50% -10%, #1c4029 0%, #14301f 45%, #0c2013 100%)',
      '--panel': 'rgba(16,32,22,.82)', '--panel-line': 'rgba(211,169,95,.25)',
      '--modal-bg': 'linear-gradient(170deg,#1d3527,#122319)', '--backdrop': 'rgba(5,12,8,.68)',
      '--ink': '#f0e7d3', '--ink-dim': '#b8ad93',
      '--accent': '#d3a95f', '--accent-2': '#e8cf9a',
      '--accent-soft': 'rgba(211,169,95,.55)', '--accent-weak': 'rgba(211,169,95,.13)',
      '--accent-ink': '#241708', '--danger': '#c96a4a',
      '--frame-hi': '#7a4d26', '--frame': '#4a2c15', '--frame-lo': '#38200e',
      '--frame-glow': 'rgba(211,169,95,.12)',
      '--sq-light-hi': '#f0debc', '--sq-light': '#e9d5a7', '--sq-light-lo': '#d9c193',
      '--sq-dark-hi': '#8a5629', '--sq-dark': '#7c4a24', '--sq-dark-lo': '#6d3f1d',
      '--grid-line': 'transparent',
      '--sqnum-l': 'rgba(90,60,25,.6)', '--sqnum-d': 'rgba(240,231,211,.55)',
      '--pl-l-1': '#fffdf4', '--pl-l-2': '#ecdcb4', '--pl-l-3': '#c6ab7c',
      '--pl-l-edge': '#8f7448', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#6a553f', '--pl-d-2': '#35261a', '--pl-d-3': '#150d07',
      '--pl-d-edge': '#0c0703', '--pl-d-glow': GLOW0,
    }),
    T('walnut', 'Walnut Classic', 'wood', {
      '--bg-image': 'linear-gradient(180deg,#f3e9d8,#e6d5bc 60%,#dcc9ac)',
      '--panel': 'rgba(255,252,246,.85)', '--panel-line': 'rgba(165,105,45,.3)',
      '--modal-bg': 'linear-gradient(170deg,#fffaf2,#f0e4d0)', '--backdrop': 'rgba(60,40,20,.5)',
      '--ink': '#3a2a18', '--ink-dim': '#7d6850',
      '--accent': '#a5692d', '--accent-2': '#c98a3e',
      '--accent-soft': 'rgba(165,105,45,.5)', '--accent-weak': 'rgba(165,105,45,.12)',
      '--accent-ink': '#ffffff', '--danger': '#b8482e',
      '--frame-hi': '#5d3a1a', '--frame': '#472b12', '--frame-lo': '#33200c',
      '--frame-glow': 'rgba(90,55,20,.25)',
      '--sq-light-hi': '#f5e3bd', '--sq-light': '#eed7ab', '--sq-light-lo': '#e2c795',
      '--sq-dark-hi': '#96602c', '--sq-dark': '#8a5629', '--sq-dark-lo': '#7a4a22',
      '--grid-line': 'transparent',
      '--sqnum-l': 'rgba(90,60,25,.55)', '--sqnum-d': 'rgba(248,236,214,.6)',
      '--pl-l-1': '#fffdf4', '--pl-l-2': '#ecdcb4', '--pl-l-3': '#c6ab7c',
      '--pl-l-edge': '#8f7448', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#6a553f', '--pl-d-2': '#35261a', '--pl-d-3': '#150d07',
      '--pl-d-edge': '#0c0703', '--pl-d-glow': GLOW0,
    }),
    T('royale', 'Walnut Royale', 'wood', {
      '--bg-image': 'radial-gradient(1200px 700px at 50% -10%, rgba(255,220,160,.15), transparent 60%),linear-gradient(180deg,#2a1d13,#1f150d 55%,#150d07)',
      '--panel': 'rgba(38,26,16,.85)', '--panel-line': 'rgba(214,178,120,.28)',
      '--modal-bg': 'linear-gradient(170deg,#332316,#221710)', '--backdrop': 'rgba(10,6,2,.62)',
      '--ink': '#f3e8d4', '--ink-dim': '#bfa887',
      '--accent': '#d6b278', '--accent-2': '#a97e46',
      '--accent-soft': 'rgba(214,178,120,.5)', '--accent-weak': 'rgba(214,178,120,.12)',
      '--accent-ink': '#241708', '--danger': '#c96a4a',
      '--frame-hi': '#5a3a1e', '--frame': '#3f2812', '--frame-lo': '#2b1a0a',
      '--frame-glow': 'rgba(214,178,120,.16)',
      '--sq-light-hi': '#ecd3a4', '--sq-light': '#e2c48f', '--sq-light-lo': '#d3b37a',
      '--sq-dark-hi': '#8a5a2e', '--sq-dark': '#7c4e26', '--sq-dark-lo': '#6a401d',
      '--grid-line': 'rgba(60,35,15,.25)',
      '--sqnum-l': 'rgba(80,50,20,.6)', '--sqnum-d': 'rgba(245,230,200,.65)',
      '--pl-l-1': '#fbf3dd', '--pl-l-2': '#f6ead0', '--pl-l-3': '#e2cda0',
      '--pl-l-edge': '#a8895c', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#6b4526', '--pl-d-2': '#472c14', '--pl-d-3': '#241305',
      '--pl-d-edge': '#140a02', '--pl-d-glow': GLOW0,
    }),
    T('tourney', 'Tournament', null, {
      '--bg-image': 'linear-gradient(180deg,#eef0e8,#dfe4d4 60%,#d4dbc6)',
      '--panel': 'rgba(255,255,255,.82)', '--panel-line': 'rgba(46,125,79,.3)',
      '--modal-bg': 'linear-gradient(170deg,#f8faf4,#e6ecdc)', '--backdrop': 'rgba(40,60,40,.5)',
      '--ink': '#22301f', '--ink-dim': '#5c6e55',
      '--accent': '#2e7d4f', '--accent-2': '#67a867',
      '--accent-soft': 'rgba(46,125,79,.5)', '--accent-weak': 'rgba(46,125,79,.11)',
      '--accent-ink': '#ffffff', '--danger': '#c05a3a',
      '--frame-hi': '#2e5238', '--frame': '#24422c', '--frame-lo': '#18301e',
      '--frame-glow': 'rgba(30,70,40,.25)',
      '--sq-light-hi': '#f2e0b0', '--sq-light': '#ecd6a0', '--sq-light-lo': '#dfc68c',
      '--sq-dark-hi': '#4a7a4a', '--sq-dark': '#3f6d3e', '--sq-dark-lo': '#345c34',
      '--grid-line': 'transparent',
      '--sqnum-l': 'rgba(40,70,40,.55)', '--sqnum-d': 'rgba(240,240,220,.65)',
      '--pl-l-1': '#fffdf3', '--pl-l-2': '#f0e6c8', '--pl-l-3': '#cdbf94',
      '--pl-l-edge': '#91805a', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#4a4536', '--pl-d-2': '#2a281c', '--pl-d-3': '#14130c',
      '--pl-d-edge': '#0a0906', '--pl-d-glow': GLOW0,
    }),
    T('marble', 'Marble Lux', null, {
      '--bg-image': 'linear-gradient(180deg,#f2f3f6,#e2e5ea 60%,#d8dce3)',
      '--panel': 'rgba(255,255,255,.85)', '--panel-line': 'rgba(70,98,138,.25)',
      '--modal-bg': 'linear-gradient(170deg,#ffffff,#e8ebf0)', '--backdrop': 'rgba(80,90,105,.45)',
      '--ink': '#262c36', '--ink-dim': '#6a7484',
      '--accent': '#46628a', '--accent-2': '#8a9ab0',
      '--accent-soft': 'rgba(70,98,138,.5)', '--accent-weak': 'rgba(70,98,138,.11)',
      '--accent-ink': '#ffffff', '--danger': '#cc4a3a',
      '--frame-hi': '#d0d5dc', '--frame': '#b8bfc9', '--frame-lo': '#9aa3b0',
      '--frame-glow': 'rgba(70,98,138,.2)',
      '--sq-light-hi': '#fafbfc', '--sq-light': '#f1f3f5', '--sq-light-lo': '#e2e6ea',
      '--sq-dark-hi': '#6a7686', '--sq-dark': '#5c6672', '--sq-dark-lo': '#4c5664',
      '--grid-line': 'rgba(90,100,115,.16)',
      '--sqnum-l': 'rgba(60,70,85,.5)', '--sqnum-d': 'rgba(255,255,255,.7)',
      '--pl-l-1': '#ffffff', '--pl-l-2': '#f0f2f5', '--pl-l-3': '#cfd4dc',
      '--pl-l-edge': '#8b95a3', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#4a5462', '--pl-d-2': '#323a48', '--pl-d-3': '#1c222c',
      '--pl-d-edge': '#10141c', '--pl-d-glow': GLOW0,
    }),
    T('mono', 'Ivory & Ebony', null, {
      '--bg-image': 'linear-gradient(180deg,#fafafa,#ececec 60%,#e2e2e2)',
      '--panel': 'rgba(255,255,255,.9)', '--panel-line': 'rgba(0,0,0,.18)',
      '--modal-bg': 'linear-gradient(170deg,#ffffff,#eeeeee)', '--backdrop': 'rgba(0,0,0,.5)',
      '--ink': '#141414', '--ink-dim': '#666666',
      '--accent': '#141414', '--accent-2': '#555555',
      '--accent-soft': 'rgba(20,20,20,.55)', '--accent-weak': 'rgba(20,20,20,.08)',
      '--accent-ink': '#ffffff', '--danger': '#d03a2a',
      '--frame-hi': '#e0e0e0', '--frame': '#c8c8c8', '--frame-lo': '#a8a8a8',
      '--frame-glow': 'rgba(0,0,0,.12)',
      '--sq-light-hi': '#fbfbfb', '--sq-light': '#f2f2f2', '--sq-light-lo': '#e4e4e4',
      '--sq-dark-hi': '#1c1c1c', '--sq-dark': '#121212', '--sq-dark-lo': '#080808',
      '--grid-line': 'rgba(0,0,0,.1)',
      '--sqnum-l': 'rgba(0,0,0,.45)', '--sqnum-d': 'rgba(255,255,255,.6)',
      '--pl-l-1': '#ffffff', '--pl-l-2': '#f0f0f0', '--pl-l-3': '#c8c8c8',
      '--pl-l-edge': '#787878', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#4a4a4a', '--pl-d-2': '#363636', '--pl-d-3': '#0e0e0e',
      '--pl-d-edge': '#000000', '--pl-d-glow': GLOW0,
    }),
    T('sakura', 'Sakura', null, {
      '--bg-image': 'radial-gradient(1000px 600px at 20% -10%, rgba(255,255,255,.75), transparent 55%),linear-gradient(180deg,#fdf0f3,#f9dce4 60%,#f5d0da)',
      '--panel': 'rgba(255,250,251,.85)', '--panel-line': 'rgba(212,80,122,.25)',
      '--modal-bg': 'linear-gradient(170deg,#fff8fa,#f7e3e9)', '--backdrop': 'rgba(90,40,55,.45)',
      '--ink': '#4a2432', '--ink-dim': '#a06a7c',
      '--accent': '#d4507a', '--accent-2': '#f08aa8',
      '--accent-soft': 'rgba(212,80,122,.5)', '--accent-weak': 'rgba(212,80,122,.12)',
      '--accent-ink': '#ffffff', '--danger': '#cc3a3a',
      '--frame-hi': '#e8b4c0', '--frame': '#d493a4', '--frame-lo': '#b8748a',
      '--frame-glow': 'rgba(212,80,122,.2)',
      '--sq-light-hi': '#fff7f8', '--sq-light': '#fdeef2', '--sq-light-lo': '#f8dde4',
      '--sq-dark-hi': '#e08aa0', '--sq-dark': '#d97f96', '--sq-dark-lo': '#c96f88',
      '--grid-line': 'transparent',
      '--sqnum-l': 'rgba(150,70,95,.55)', '--sqnum-d': 'rgba(255,245,247,.7)',
      '--pl-l-1': '#ffffff', '--pl-l-2': '#fdf0f2', '--pl-l-3': '#f0ccd6',
      '--pl-l-edge': '#b57f92', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#7a4a5c', '--pl-d-2': '#57303f', '--pl-d-3': '#331c26',
      '--pl-d-edge': '#1f0f16', '--pl-d-glow': GLOW0,
    }),
    T('arcade', 'Retro Arcade', 'scan', {
      '--bg-image': 'radial-gradient(1000px 620px at 50% -10%, rgba(57,255,20,.09), transparent 55%),linear-gradient(180deg,#050505,#0a0f0a 55%,#030303)',
      '--panel': 'rgba(8,18,8,.85)', '--panel-line': 'rgba(57,255,20,.3)',
      '--modal-bg': 'linear-gradient(170deg,#0c1c0c,#060f06)', '--backdrop': 'rgba(0,6,0,.8)',
      '--ink': '#c8ffc8', '--ink-dim': '#6fae6f',
      '--accent': '#39ff14', '--accent-2': '#ffb000',
      '--accent-soft': 'rgba(57,255,20,.5)', '--accent-weak': 'rgba(57,255,20,.11)',
      '--accent-ink': '#04240a', '--danger': '#ff5030',
      '--frame-hi': '#1d3a1d', '--frame': '#122412', '--frame-lo': '#0a140a',
      '--frame-glow': 'rgba(57,255,20,.2)',
      '--sq-light-hi': '#2a7432', '--sq-light': '#236329', '--sq-light-lo': '#1c5121',
      '--sq-dark-hi': '#102f13', '--sq-dark': '#0b240d', '--sq-dark-lo': '#071a08',
      '--grid-line': 'rgba(57,255,20,.24)',
      '--sqnum-l': 'rgba(160,255,160,.6)', '--sqnum-d': 'rgba(140,235,140,.7)',
      '--pl-l-1': '#eaffea', '--pl-l-2': '#b8f0b8', '--pl-l-3': '#78c878',
      '--pl-l-edge': '#4a9a4a', '--pl-l-glow': 'rgba(57,255,20,.4)',
      '--pl-d-1': '#8a6215', '--pl-d-2': '#563d0e', '--pl-d-3': '#301f05',
      '--pl-d-edge': '#140c02', '--pl-d-glow': 'rgba(255,176,0,.45)',
    }),
  ];
  if (!THEMES.some((t) => t.id === settings.theme)) settings.theme = 'neon';

  function applyTheme(id) {
    const t = THEMES.find((x) => x.id === id) || THEMES[0];
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(t.v)) root.setProperty(k, v);
    document.body.classList.toggle('fx-scan', t.fx === 'scan');
    document.body.classList.toggle('fx-glass', t.fx === 'glass');
    document.body.classList.toggle('fx-wood', t.fx === 'wood');
    const grid = $('themeGrid');
    if (grid) for (const b of grid.querySelectorAll('button')) b.classList.toggle('active', b.dataset.v === t.id);
  }


  const blankStats = () => ({ american: {}, international: {} });
  const stats = Object.assign(blankStats(), loadJSON(STATS_KEY, {}));
  function statEntry() {
    const s = stats[settings.rsId] || (stats[settings.rsId] = {});
    return Object.assign({ p: 0, w: 0, l: 0, d: 0, bestRun: 0, run: 0, runKind: null }, s);
  }
  function saveStats() { saveJSON(STATS_KEY, stats); }

  // ---------------- sound ----------------
  const FX = {
    ctx: null,
    out: null,
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          this.ctx = new AC();
          this.out = this.ctx.createGain();
          this.out.gain.value = settings.sfx.master;
          this.out.connect(this.ctx.destination);
          if (typeof SFX_BANK !== 'undefined') SFX_BANK.decodeAll();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    setMaster(v) {
      settings.sfx.master = v;
      if (this.out) this.out.gain.value = v;
    },
    tone(f, dur, type, vol, when, slideTo) {
      const ctx = this.ensure(); if (!ctx) return;
      const t = ctx.currentTime + (when || 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.out || ctx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    },
    noise(dur, vol, when, freq) {
      const ctx = this.ensure(); if (!ctx) return;
      const t = ctx.currentTime + (when || 0);
      const len = Math.max(1, (dur * ctx.sampleRate) | 0);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = 0.9;
      const g = ctx.createGain(); g.gain.value = vol || 0.2;
      src.connect(f); f.connect(g); g.connect(this.out || ctx.destination);
      src.start(t);
    },
    play(name) {
      if (!settings.sound) return;
      const dramaSynth = name === 'trap_snap' || name === 'denied' ||
        name === 'relief' || name === 'levelup';
      if (dramaSynth) { if (!settings.sfx.drama) return; }
      else if (name !== 'illegal' && !settings.sfx.classic) return;
      try {
        switch (name) {
          // A wooden piece set down on wood: a soft click, a short noise
          // "grain" burst and a low body thump, with natural pitch jitter.
          case 'select': this.tick(0.05); break;
          case 'move': this.woodKnock(0.16, 1); break;
          case 'capture':
            this.woodKnock(0.3, 0.72);
            this.woodKnock(0.15, 0.55, 0.09); // second knock: piece hits the tray
            break;
          case 'king':
            this.tone(587, 0.16, 'triangle', 0.15);
            this.tone(587 * 1.007, 0.16, 'sine', 0.1); // warm detune
            this.tone(880, 0.24, 'triangle', 0.15, 0.11);
            this.tone(880 * 0.996, 0.24, 'sine', 0.09, 0.11);
            break;
          case 'win':
            [523, 659, 784, 1047].forEach((f, i) => {
              this.tone(f, 0.2, 'triangle', 0.17, i * 0.13);
              this.tone(f / 2, 0.22, 'sine', 0.1, i * 0.13);
            });
            break;
          case 'lose':
            [392, 330, 262].forEach((f, i) => {
              this.tone(f, 0.24, 'sine', 0.16, i * 0.16);
              this.tone(f * 1.005, 0.24, 'triangle', 0.07, i * 0.16);
            });
            break;
          case 'draw': this.tone(440, 0.2, 'triangle', 0.16); this.tone(440, 0.28, 'triangle', 0.16, 0.24); break;
          case 'illegal': this.tone(110, 0.07, 'square', 0.1); this.tone(100, 0.08, 'square', 0.1, 0.09); break;
          case 'undo': this.tone(300, 0.09, 'triangle', 0.13, 0, 210); break;
          // ---- trap drama stings (synthesized, category: drama) ----
          case 'trap_snap': // metallic snap: the trap closes
            this.noiseAt(0.05, 0.5, 0, 2400, 2.2);
            this.tone(1400, 0.09, 'square', 0.16, 0, 320);
            this.tone(90, 0.16, 'sine', 0.3, 0.02);
            break;
          case 'denied': // flat double buzz: the idea is refused
            this.tone(138, 0.1, 'sawtooth', 0.14);
            this.tone(138, 0.16, 'sawtooth', 0.14, 0.14);
            break;
          case 'relief': // warm major chime: dodged / lucky
            this.tone(523, 0.14, 'triangle', 0.13);
            this.tone(659, 0.16, 'triangle', 0.12, 0.09);
            this.tone(784, 0.22, 'triangle', 0.11, 0.18);
            break;
          case 'levelup': // promotion fanfare: beaten a new best level
            [392, 523, 659, 784, 1047].forEach((f, i) => {
              this.tone(f, 0.16, 'triangle', 0.15, i * 0.09);
              this.noiseAt(0.02, 0.12, i * 0.09, 3800, 1.4);
            });
            break;
        }
      } catch { /* audio is best-effort */ }
    },
    // soft ceramic tick for piece selection
    tick(vol) {
      const ctx = this.ensure(); if (!ctx) return;
      this.noiseAt(0.012, (vol || 0.05) * 0.8, 0, 3200, 2);
      this.toneAt(1900 + Math.random() * 250, 0.02, 'sine', vol || 0.05, 0);
    },
    // layered wood knock: noise grain + resonant body + contact click
    woodKnock(vol, pitch, when) {
      const ctx = this.ensure(); if (!ctx) return;
      const j = 0.88 + Math.random() * 0.24; // natural variation
      const f0 = 170 * pitch * j;
      this.noiseAt(0.035, vol * 0.75, when || 0, 1250 * pitch * j, 1.1);
      this.toneAt(f0, 0.1, 'sine', vol, when || 0, f0 * 0.55);
      this.noiseAt(0.008, vol * 0.5, when || 0, 5200, 0.7);
    },
    // like tone/noise but with an explicit start offset & filter Q
    toneAt(f, dur, type, vol, when, slideTo) { this.tone(f, dur, type, vol, when, slideTo); },
    noiseAt(dur, vol, when, freq, q) {
      const ctx = this.ensure(); if (!ctx) return;
      const t = ctx.currentTime + (when || 0);
      const len = Math.max(1, (dur * ctx.sampleRate) | 0);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.value = freq || 900; f.Q.value = q || 0.9;
      const g = ctx.createGain(); g.gain.value = vol || 0.2;
      src.connect(f); f.connect(g); g.connect(this.out || ctx.destination);
      src.start(t);
    },
  };

  // ---------------- sample sound bank (embedded open-license audio) ----------------
  const SFX_BANK = {
    defs: window.DRAFTI_SFX || {},
    buffers: new Map(),
    decoding: false,
    CAT_VOL: { majestic: 0.95, comedy: 0.8, voice: 1.0, judge: 1.0, think: 1.0, ui: 0.6, drama: 0.95, party: 1.0 },
    decodeAll() {
      const ctx = FX.ctx;
      if (!ctx || this.decoding) return;
      this.decoding = true;
      for (const [name, def] of Object.entries(this.defs)) {
        if (this.buffers.has(name)) continue;
        fetch(def.d)
          .then((r) => r.arrayBuffer())
          .then((ab) => ctx.decodeAudioData(ab))
          .then((buf) => this.buffers.set(name, buf))
          .catch(() => { /* sample simply won't play */ });
      }
    },
    on(name) {
      const def = this.defs[name];
      if (!def) return false;
      if (def.c === 'majestic') return settings.sfx.animals;
      if (def.c === 'comedy') return settings.sfx.comedy;
      if (def.c === 'voice') return settings.sfx.voice;
      if (def.c === 'judge') return settings.sfx.judge;
      if (def.c === 'think') return settings.sfx.think;
      if (def.c === 'ui') return settings.sfx.ui;
      if (def.c === 'drama') return settings.sfx.drama;
      if (def.c === 'party') return settings.sfx.party;
      return true;
    },
    play(name, opts) {
      if (!name || !settings.sound || !this.on(name)) return null;
      const ctx = FX.ensure(); if (!ctx) return null;
      this.decodeAll();
      const buf = this.buffers.get(name);
      if (!buf) return null;
      const def = this.defs[name] || {};
      const cat = def.c || 'comedy';
      const vol = ((opts && opts.vol != null ? opts.vol : 1) *
        (this.CAT_VOL[cat] || 0.8));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = (opts && opts.rate) || (0.96 + Math.random() * 0.08);
      const g = ctx.createGain();
      g.gain.value = Math.max(0.0001, Math.min(1.2, vol));
      src.connect(g); g.connect(FX.out || ctx.destination);
      src.start();
      return src;
    },
  };

  // ---------------- game state ----------------
  const G = {
    rs: E.RULESETS[settings.rsId],
    rsId: settings.rsId,
    sqn: null,
    mode: settings.mode,
    diff: settings.diff,
    humanSide: settings.humanSide,
    board: null, side: IVORY, noProg: 0,
    pieces: [], nextPieceId: 1,
    history: [],
    repMap: new Map(),
    legal: [],
    over: false, result: null, recorded: false,
    phase: 'idle', // idle | animating | thinking | over
    sel: null, hint: null, lastMove: null,
    aiPaused: false, aiSpeed: settings.speed,
    capStreakSide: 0, capStreak: 0,
  };

  const posKey = (b, s) => b.join(',') + '|' + s;
  const boardAt = (i) => G.board[i];
  const pieceAt = (sq) => G.pieces.find((p) => p.sq === sq);
  const countSide = (s) => { let n = 0; for (let i = 0; i < G.board.length; i++) if (G.board[i] * s > 0) n++; return n; };
  const sideName = (s) => (s === IVORY ? 'Ivory' : 'Ebony');
  // players are people: show their name where a side would feel impersonal
  const displayName = (s) => {
    if (G.mode === 'ai' && s === G.humanSide) return settings.pname;
    if (G.mode === 'hotseat') return s === IVORY ? settings.pname : settings.pname2;
    return sideName(s);
  };
  const humanTurn = () => !G.over && (G.mode === 'hotseat' || G.side === G.humanSide);

  function repAdd(k) { G.repMap.set(k, (G.repMap.get(k) || 0) + 1); }
  function repRemove(k) { const v = (G.repMap.get(k) || 0) - 1; if (v <= 0) G.repMap.delete(k); else G.repMap.set(k, v); }

  // ---------------- AI worker ----------------
  let worker = null, workerBroken = false, reqId = 0, aiPending = false, hintPending = false, thinkStart = 0;

  // The worker source, kept as a named function so tests can spawn the exact
  // production worker and verify the verdict/trap protocol end to end.
  function workerSource() {
    return (
      'const makeEngine = (' + makeEngine.toString() + ');\n' +
        'const E = makeEngine();\n' +
        'self.onmessage = (e) => {\n' +
        '  const d = e.data;\n' +
        '  if (d.cmd === "search") {\n' +
        '    const t0 = Date.now();\n' +
        '    const res = E.search(E.RULESETS[d.rsId], new Int8Array(d.board), d.side, d.opts);\n' +
        '    res.id = d.id; res.cmd = "searchResult"; res.ms = Date.now() - t0;\n' +
        '    postMessage(res);\n' +
        '  } else if (d.cmd === "classify") {\n' +
        '    const rs = E.RULESETS[d.rsId];\n' +
        '    const res = E.search(rs, new Int8Array(d.board), d.side, d.opts);\n' +
        '    const roots = res.rootScores || [];\n' +
        '    let played = null, bestOther = -Infinity, bestScore = -Infinity;\n' +
        '    let playedIsCapture = false, bestCapture = -Infinity;\n' +
        '    for (const r of roots) {\n' +
        '      const key = r.m.path.join(",");\n' +
        '      if (key === d.playedPath) { played = r.score; playedIsCapture = r.m.caps.length > 0; }\n' +
        '      else if (r.score > bestOther) bestOther = r.score;\n' +
        '      if (r.score > bestScore) bestScore = r.score;\n' +
        '      if (r.m.caps.length > 0 && r.score > bestCapture) bestCapture = r.score;\n' +
        '    }\n' +
        '    const out = { cmd: "verdict", id: d.id,\n' +
        '      delta: played == null || !isFinite(bestScore) ? NaN : bestScore - played,\n' +
        '      playedScore: played == null ? 0 : played,\n' +
        '      bestOther: isFinite(bestOther) ? bestOther : NaN,\n' +
        '      preBest: isFinite(bestScore) ? bestScore : NaN,\n' +
        '      onlyMove: roots.length <= 1 };\n' +
        // A won capture declined: the mover had a capture that scored far above
        // the quiet move actually played (only meaningful when captures were
        // optional — a forced capture would have been the played move).
        '    if (d.detectMissed && !playedIsCapture && isFinite(bestCapture) &&\n' +
        '        bestCapture - (played == null ? 0 : played) >= 250) {\n' +
        '      out.missedWin = true;\n' +
        '    }\n' +
        // Bait detection: after this move, does the OPPONENT face captures that
        // are actually bad? Requires that quiet moves exist (otherwise the
        // capture is forced — a tactic, not a trap). If declining beats taking
        // by a wide margin, the mover has set a trap.
        '    if (d.withOpp) {\n' +
        '      const playedRoot = roots.find((r) => r.m.path.join(",") === d.playedPath);\n' +
        '      let opp = { bait: false, doom: false, capWorst: NaN, capWorstPath: null, bestScore: NaN };\n' +
        '      if (playedRoot) {\n' +
        '        const nb = E.applyMove(rs, new Int8Array(d.board), playedRoot.m, d.side);\n' +
        '        const o = E.search(rs, nb, -d.side, { budgetMs: 400, maxDepth: 7, jitter: 0, fullRootWindow: true });\n' +
        '        const oroots = o.rootScores || [];\n' +
        '        let oBest = -Infinity, oWorstCap = Infinity, oWorstPath = null, anyCap = false;\n' +
        '        for (const r of oroots) {\n' +
        '          if (r.score > oBest) oBest = r.score;\n' +
        '          if (r.m.caps.length > 0) {\n' +
        '            anyCap = true;\n' +
        '            if (r.score < oWorstCap) { oWorstCap = r.score; oWorstPath = r.m.path.join(","); }\n' +
        '          }\n' +
        '        }\n' +
        // Captures are mandatory in every ruleset, so a trap is a CHOICE of
        // captures: a safe one exists (oBest >= -30) while the worst capture
        // walks into a shot (150+ below best) — or every capture loses (doom).
        '        const loose = anyCap && isFinite(oBest) && oBest >= -30 && oBest - oWorstCap >= 150;\n' +
        '        const doom = anyCap && isFinite(oBest) && oBest <= -140;\n' +
        '        opp = { bait: loose || doom, doom, capWorst: oWorstCap,\n' +
        '          capWorstPath: oWorstPath, bestScore: oBest };\n' +
        '      }\n' +
        '      out.opp = opp;\n' +
        '    }\n' +
      '    postMessage(out);\n' +
      '  }\n' +
      '};'
    );
  }

  function getWorker() {
    if (worker || workerBroken) return worker;
    try {
      const src = workerSource();
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = (e) => {
        if (e.data && e.data.cmd === 'verdict') handleVerdict(e.data);
        else handleSearch(e.data);
      };
      worker.onerror = () => { workerBroken = true; worker = null; };
    } catch { workerBroken = true; }
    return worker;
  }

  const DIFF_OPTS = null; // replaced by the LEVELS ladder

  function levelOpts(levelId, style) {
    const L = LEVELS[levelId] || LEVELS.l5;
    // Pool-based move picking compares root scores against each other, so it
    // needs exact per-root values: only the shallow rungs (which have a pool)
    // pay for the full-window search.
    const opts = { budgetMs: L.budgetMs, maxDepth: L.maxDepth, jitter: L.jitter,
      fullRootWindow: L.pool > 0 };
    if (style) opts.weights = Object.assign({ for: 0 }, style.w); // for: patched by caller
    return { opts, level: L };
  }

  function runSearch(kind) {
    const id = ++reqId;
    thinkStart = Date.now();
    const style = kind === 'hint' ? null : styleForSide(G.side);
    const payload = {
      cmd: 'search', id, rsId: G.rsId, side: G.side, noProgress: G.noProg,
      board: G.board,
      opts: kind === 'hint'
        ? { budgetMs: 600, maxDepth: 12, jitter: 0 }
        : levelOpts(G.diff, style).opts,
    };
    if (payload.opts.weights) payload.opts.weights.for = G.side;
    aiPending = kind === 'ai'; hintPending = kind === 'hint';
    const w = getWorker();
    if (w) { w.postMessage(payload); return; }
    // fallback: synchronous search off the input path
    setTimeout(() => {
      const res = E.search(E.RULESETS[payload.rsId], payload.board, payload.side, payload.opts);
      res.id = payload.id;
      handleSearch(res);
    }, 30);
  }

  function handleSearch(res) {
    if (res.id !== reqId) return; // stale (game reset / undo / newer search)
    const wasHint = hintPending;
    aiPending = false; hintPending = false;
    if (G.phase !== 'thinking') return;
    G.phase = 'idle';

    const valid = res.best && G.legal.find((m) =>
      m.from === res.best.from && m.path.length === res.best.path.length &&
      m.path.every((v, i) => v === res.best.path[i]));
    const mv = valid || G.legal[(Math.random() * G.legal.length) | 0];

    if (wasHint) {
      G.hint = mv;
      if (Math.random() < 0.5) SFX_BANK.play('v_hint', { vol: 0.85 });
      updateAll();
      return;
    }
    // pacing: aivai keeps a watchable rhythm scaled by the speed selector
    const base = G.mode === 'aivai' ? 700 / G.aiSpeed : 450;
    const delay = Math.max(0, base - (Date.now() - thinkStart));
    setTimeout(() => {
      if (res.id !== reqId || G.phase !== 'idle') return;
      // level ladder: weak rungs blunder and wander; styles widen the pool
      // (pool picking needs exact root scores, so it only runs on the shallow
      // full-window rungs; deep levels and styles differ through jitter)
      const L = LEVELS[G.diff] || LEVELS.l5;
      const style = styleForSide(G.side);
      if (Array.isArray(res.rootScores) && res.rootScores.length > 1 && L.pool > 0) {
        const top = res.rootScores.reduce((a, b) => (b.score > a ? b.score : a), -Infinity);
        const margin = L.pool + (style ? style.chaos * 90 : 0);
        if (L.blunder > 0 && Math.random() < L.blunder) {
          executeMove(G.legal[(Math.random() * G.legal.length) | 0]); return;
        }
        const pool = res.rootScores.filter((r) => r.score >= top - margin);
        const pickM = pool[(Math.random() * pool.length) | 0];
        const m2 = G.legal.find((m) => m.path.join() === pickM.m.path.join());
        if (m2) { executeMove(m2); return; }
      }
      executeMove(mv);
    }, delay);
  }

  // ---------------- board DOM ----------------
  const boardEl = $('board'), piecesEl = $('pieces'), frameEl = $('boardFrame');

  function buildBoard() {
    boardEl.innerHTML = '';
    const n = G.rs.n;
    boardEl.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    const frag = document.createDocumentFragment();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const div = document.createElement('div');
        div.className = 'sq ' + (((r + c) & 1) === 1 ? 'dark' : 'light');
        div.dataset.i = i;
        if ((r + c) & 1) {
          const lbl = document.createElement('span');
          lbl.className = 'sqnum';
          lbl.textContent = G.sqn[i];
          div.appendChild(lbl);
        }
        frag.appendChild(div);
      }
    }
    boardEl.appendChild(frag);
  }

  const squareEls = () => boardEl.children;

  function pieceClasses(p) {
    const side = p.code > 0 ? 'ivory' : 'ebony';
    return 'piece ' + side + (Math.abs(p.code) === 2 ? ' king' : '');
  }

  function createPieceEl(p) {
    const el = document.createElement('div');
    el.className = pieceClasses(p) + ' appear';
    el.innerHTML = '<div class="body"><div class="ring"></div></div>';
    positionEl(el, p.sq);
    const n = G.rs.n;
    el.style.width = (100 / n) + '%';
    el.style.height = (100 / n) + '%';
    if (Math.abs(p.code) === 2) el.querySelector('.body').insertAdjacentHTML('beforeend', CROWN);
    piecesEl.appendChild(el);
    setTimeout(() => el.classList.remove('appear'), 350);
    return el;
  }

  function positionEl(el, sq) {
    const n = G.rs.n, r = (sq / n) | 0, c = sq % n;
    el.style.left = (c * 100 / n) + '%';
    el.style.top = (r * 100 / n) + '%';
  }

  function rebuildPieces() {
    piecesEl.innerHTML = '';
    G.pieces = [];
    G.nextPieceId = 1;
    for (let i = 0; i < G.board.length; i++) {
      if (G.board[i] === 0) continue;
      const p = { id: G.nextPieceId++, code: G.board[i], sq: i, el: null };
      p.el = createPieceEl(p);
      G.pieces.push(p);
    }
  }

  function refreshPiece(p) {
    p.el.className = pieceClasses(p);
    const body = p.el.querySelector('.body');
    if (Math.abs(p.code) === 2 && !body.querySelector('.crown')) body.insertAdjacentHTML('beforeend', CROWN);
  }

  function removePiece(p) {
    const ix = G.pieces.indexOf(p);
    if (ix >= 0) G.pieces.splice(ix, 1);
    if (p.el) {
      p.el.classList.add('captured');
      const el = p.el;
      setTimeout(() => el.remove(), 320);
    }
  }

  // ---------------- highlights ----------------
  function clearHighlights() {
    for (const el of squareEls()) {
      el.classList.remove('sel', 'hop', 'target', 'capture-target', 'last', 'hint', 'landing');
      el.removeAttribute('data-step');
    }
    for (const p of G.pieces) if (p.el) p.el.classList.remove('threat', 'doomed');
  }

  // jump-path preview: make multi-jumps impossible to miss. Before selection,
  // every piece that can be eaten this turn wears a warning glow; once a
  // piece is selected, each candidate route shows numbered landing badges and
  // the pieces those routes would eat carry a doomed ✕.
  function markJumpPaths() {
    if (!settings.jumpPaths || G.over) return;
    if (!G.sel) {
      const spect = G.mode === 'aivai';
      if (!humanTurn() && !spect) return;
      if (!G.legal.some((m) => m.caps.length > 0)) return;
      const seen = new Set();
      for (const m of G.legal) {
        for (const j of m.caps) {
          if (seen.has(j)) continue;
          seen.add(j);
          const v = pieceAt(j);
          if (v && v.el) v.el.classList.add('threat');
        }
      }
      return;
    }
    if (!humanTurn()) return;
    const steps = new Map(); // landing square -> earliest hop number
    const victims = new Set();
    for (const m of G.sel.cands) {
      for (let k = 1; k < m.path.length; k++) {
        const sq = m.path[k];
        if (!steps.has(sq) || steps.get(sq) > k) steps.set(sq, k);
      }
      for (const j of m.caps) victims.add(j);
    }
    for (const [sq, k] of steps) {
      const el = squareEls()[sq];
      if (el) { el.classList.add('landing'); el.dataset.step = k; }
    }
    for (const j of victims) {
      const v = pieceAt(j);
      if (v && v.el) v.el.classList.add('doomed');
    }
  }

  function renderHighlights() {
    clearHighlights();
    const mark = (i, cls) => { const el = squareEls()[i]; if (el) el.classList.add(cls); };
    if (G.lastMove) {
      mark(G.lastMove.from, 'last');
      mark(G.lastMove.path[G.lastMove.path.length - 1], 'last');
    }
    if (G.hint) {
      mark(G.hint.from, 'hint');
      mark(G.hint.path[1], 'hint');
    }
    if (G.sel && humanTurn()) {
      mark(G.sel.from, 'sel');
      const k = G.sel.partial.length;
      for (const sq of G.sel.partial) if (sq !== G.sel.from) mark(sq, 'hop');
      const nexts = new Set();
      for (const m of G.sel.cands) {
        if (m.path.length > k && G.sel.partial.every((s, ix) => m.path[ix] === s)) nexts.add(m.path[k]);
      }
      for (const sq of nexts) {
        const m = G.sel.cands.find((mm) =>
          mm.path.length > k && mm.path[k] === sq && G.sel.partial.every((s, ix) => mm.path[ix] === s));
        mark(sq, m && m.caps.length > 0 ? 'capture-target' : 'target');
      }
    }
    markJumpPaths();
  }

  // ---------------- selection & input ----------------
  function clearSel() { G.sel = null; renderHighlights(); }

  function trySelect(i) {
    const cands = G.legal.filter((m) => m.from === i);
    if (!cands.length) { FX.play('illegal'); return; }
    G.sel = { from: i, partial: [i], cands };
    FX.play('select');
    renderHighlights();
  }

  function onSquareClick(i) {
    if (G.phase !== 'idle') return;
    if (!humanTurn()) return;
    FX.ensure();
    const code = G.board[i];
    if (!G.sel) {
      if (code * G.side > 0) trySelect(i);
      return;
    }
    if (i === G.sel.from) { clearSel(); return; }
    if (code * G.side > 0) { trySelect(i); return; } // switch pieces
    const k = G.sel.partial.length;
    const next = G.sel.cands.filter((m) =>
      m.path.length > k && m.path[k] === i && G.sel.partial.every((s, ix) => m.path[ix] === s));
    if (!next.length) { FX.play('illegal'); return; }
    G.sel.partial.push(i);
    const done = next.find((m) => m.path.length === G.sel.partial.length);
    if (done) { const mv = done; clearSel(); executeMove(mv); }
    else { G.sel.cands = next; FX.play('select'); renderHighlights(); }
  }

  boardEl.addEventListener('pointerdown', (e) => {
    const sq = e.target.closest('.sq');
    if (sq) onSquareClick(+sq.dataset.i);
  });

  // ---------------- move classification & sound events ----------------
  // Every move gets a headline event. Fast signals run at commit time; a
  // worker-based verdict (blunder / brilliant) may upgrade it shortly after.
  // rank: 0 none · 1 awkward/dubious/missed/accurate · 2 blunder · 3 epic blunder
  //       · 4 brilliant/trick · 5 majestic/promo · 6 legendary
  const MOVE_EVENTS = {
    none: { rank: 0 },
    awkward: { rank: 1 },
    missed: { rank: 1 },
    feastmissed: { rank: 1 },
    accurate: { rank: 1 },
    dubious: { rank: 1 },
    blunder: { rank: 2 },
    epic: { rank: 3 },
    brilliant: { rank: 4 },
    trick: { rank: 4 },
    promo: { rank: 5 },
    majestic: { rank: 5 },
    legendary: { rank: 6 },
  };
  let lastEvent = { rank: -1, ply: -1 };
  let pendingVerdict = null;
  let pendingTrap = null; // { ply, setter, capPath } — a bait waiting to be taken or declined
  let verdictId = 0;
  let labelTimer = 0;
  let whisperTimer = 0;

  // post-thought reactions: a long think followed by a great (or awful) move
  const PRAISE_POOL = ['v_bigbrain', 'v_worth', 'v_paidoff', 'v_slowsteady', 'v_genius', 'v_masterpiece'];
  const SAVAGE_POOL = ['v_thought30', 'v_alltime', 'v_nosense'];
  const COMEBACK_POOL = ['v_come1', 'v_come2'];
  let longThinkSavage = false; // set by the verdict when a long think ended badly
  let lastThinkMs = 0;         // how long the human pondered the move just played
  let lastThinkPraised = -1;   // ply already praised (avoid double rewards)
  let lastBlunderPly = -1;     // ply of the last blunder — a quick repair earns a comeback callout

  function flashLabel(text, kind) {
    const host = $('stage');
    if (!host) return;
    let el = $('eventLabel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'eventLabel';
      host.appendChild(el);
    }
    el.className = 'event-label ' + kind;
    el.textContent = text;
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('run');
    clearTimeout(labelTimer);
    labelTimer = setTimeout(() => el.classList.remove('run'), 1650);
  }

  // small, quieter label for heckles and nudges
  function flashWhisper(text) {
    const host = $('stage');
    if (!host) return;
    let el = $('whisperLabel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'whisperLabel';
      host.appendChild(el);
    }
    el.textContent = text;
    void el.offsetWidth;
    el.classList.add('run');
    clearTimeout(whisperTimer);
    whisperTimer = setTimeout(() => el.classList.remove('run'), 2400);
  }

  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function thump() {
    frameEl.classList.remove('thump');
    void frameEl.offsetWidth;
    frameEl.classList.add('thump');
    setTimeout(() => frameEl.classList.remove('thump'), 700);
  }

  // Instant signals, computed at commit time from data we already have.
  function classifySync(mv, moverLegalBefore, ply) {
    let ev = 'none';
    const maxCaps = moverLegalBefore.reduce((a, m) => Math.max(a, m.caps.length), 0);
    if (mv.caps.length >= 3) ev = 'legendary';
    else if (mv.caps.length === 2) ev = 'majestic';
    else if (mv.promotes) ev = 'promo';
    else if (mv.caps.length === 0 && maxCaps >= 2) ev = 'missed';
    else if (mv.caps.length >= 1 && maxCaps >= 3 && mv.caps.length < maxCaps) ev = 'feastmissed';
    else if (mv.caps.length === 0) {
      const end = mv.path[mv.path.length - 1];
      const recapturable = G.legal.some((m) => m.caps.length > 0 && m.caps.includes(end));
      if (recapturable) ev = 'awkward';
    }
    applyMoveEvent(ev, ply, mv.caps.length);
  }

  // impact shake, scaled by how heavy the hit was
  let lastShake = 0;
  function shake(cls) {
    if (!settings.shake) return;
    const now = Date.now();
    if (now - lastShake < 500) return;
    lastShake = now;
    frameEl.classList.remove('shake-m', 'shake-l', 'shake-xl');
    void frameEl.offsetWidth;
    frameEl.classList.add(cls);
    setTimeout(() => frameEl.classList.remove(cls), 850);
  }
  function flare() {
    if (!settings.shake) return;
    frameEl.classList.add('flare');
    setTimeout(() => frameEl.classList.remove('flare'), 550);
  }
  const COUNT_WORD = { 2: 'Double!', 3: 'Triple!', 4: 'Quadruple!', 5: 'UNBELIEVABLE!' };
  const HEAVY_POOL = ['v_heavy1', 'v_heavy2', 'v_heavy3', 'v_heavy4']; // boy & girl alternate
  const FEAST_POOL = ['v_feast1', 'v_feast2', 'v_slau1', 'v_slau2'];

  function applyMoveEvent(ev, ply, flavor) {
    const def = MOVE_EVENTS[ev] || MOVE_EVENTS.none;
    if (def.rank <= lastEvent.rank && lastEvent.ply === ply) return;
    lastEvent = { rank: def.rank, ply };
    if (ev === 'legendary') {
      const roar = ['lion', 'lion_long', 'bear', 'wildroar'][(Math.random() * 4) | 0];
      SFX_BANK.play(roar, { vol: 1 });
      flashLabel(COUNT_WORD[Math.min(5, flavor || 3)] || 'Legendary!', 'party');
      shake('shake-xl');
      flare();
      thump();
      // the table reacts: the greedy shout, then the feast commentary
      setTimeout(() => SFX_BANK.play('badboy', { vol: 1 }), 600);
      setTimeout(() => SFX_BANK.play(pick(FEAST_POOL), { vol: 0.95 }), 1550);
    } else if (ev === 'majestic') {
      SFX_BANK.play(Math.random() < 0.7 ? 'oof' : 'eagle', { vol: 1 }); // "OOF."
      flashLabel('Double!', 'party');
      shake('shake-m');
      setTimeout(() => SFX_BANK.play('badboy', { vol: 1 }), 550);
      setTimeout(() => SFX_BANK.play(pick(HEAVY_POOL), { vol: 0.95 }), 1450);
    } else if (ev === 'promo') {
      SFX_BANK.play('elephant', { vol: 1 });
      SFX_BANK.play('crown_fanfare', { vol: 0.8 });
      SFX_BANK.play('v_king', { vol: 0.9 });
      flashLabel('Crowned!', 'majestic');
    } else if (ev === 'brilliant') {
      if (ply - lastBlunderPly === 2) lastBlunderPly = -1;
      SFX_BANK.play(pick(['wolfwhistle', 'rimshot', 'animewow']), { vol: 0.9 });
      SFX_BANK.play(Math.random() < 0.5 ? 'v_chess' : 'v_ooh1', { vol: 0.85 });
      flashLabel('A chess move!', 'majestic');
    } else if (ev === 'trick') {
      SFX_BANK.play(Math.random() < 0.5 ? 'wolfwhistle' : 'zip', { vol: 0.85 });
      const line = ['v_trick', 'v_trap', 'v_crafty'][(Math.random() * 3) | 0];
      SFX_BANK.play(line, { vol: 0.95 });
      flashLabel(line === 'v_trap' ? 'What a trap!' : line === 'v_crafty' ? 'Crafty!' : 'Sneaky!', 'judge');
    } else if (ev === 'accurate') {
      // A long think that paid off gets the special praise treatment instead.
      if (lastThinkMs > 12000 && lastThinkPraised !== ply) {
        lastThinkPraised = ply;
        SFX_BANK.play('sparkle', { vol: 0.9 });
        SFX_BANK.play(pick(PRAISE_POOL), { vol: 0.95 });
        flashLabel('Worth the wait!', 'majestic');
        return;
      }
      // a clean move straight after a blunder deserves a comeback nod
      if (ply - lastBlunderPly === 2 && Math.random() < 0.75) {
        lastBlunderPly = -1;
        SFX_BANK.play('relief', { vol: 0.7 });
        SFX_BANK.play(pick(COMEBACK_POOL), { vol: 0.9 });
        flashLabel('Repaired!', 'judge');
        return;
      }
      const only = flavor === 'only';
      SFX_BANK.play(only ? pick(['v_only', 'v_hold1', 'v_hold2'])
        : ['v_nice', 'v_sharp', 'v_clean'][(Math.random() * 3) | 0], { vol: 0.9 });
      flashLabel(only ? 'The only move!' : ['Precise.', 'Sharp!', 'Clean.'][(Math.random() * 3) | 0], 'judge');
    } else if (ev === 'dubious') {
      SFX_BANK.play(pick(['v_hmm', 'v_curious', 'v_inacc1', 'v_inacc2']), { vol: 0.9 });
      flashLabel('Hmm…', 'judge');
    } else if (ev === 'blunder') {
      lastBlunderPly = ply;
      SFX_BANK.play('trombone', { vol: 1 });
      // A long think that ended in a blunder earns the savage callout.
      SFX_BANK.play(longThinkSavage ? pick(SAVAGE_POOL)
        : ['v_ohno', 'v_why', 'v_sure', 'v_cost'][(Math.random() * 4) | 0], { vol: 0.9 });
      longThinkSavage = false;
      flashLabel(['Why?!', 'Oh no!'][(Math.random() * 2) | 0], 'comedy');
    } else if (ev === 'epic') {
      SFX_BANK.play(pick(['omg', 'omg', 'wilhelm', 'ahhscary']), { vol: 1 });
      SFX_BANK.play(lastThinkMs > 20000 ? pick(SAVAGE_POOL)
        : (Math.random() < 0.5 ? 'v_wow' : 'v_why'), { vol: 0.9 });
      flashLabel('Disaster!', 'comedy');
      thump();
    } else if (ev === 'missed') {
      SFX_BANK.play('whistle', { vol: 1 });
      SFX_BANK.play('v_onejob', { vol: 0.9 });
      flashLabel('You missed the jump!', 'comedy');
    } else if (ev === 'feastmissed') {
      // the mover grabbed the wrong piece: a bigger feast was on the board
      SFX_BANK.play('trombone', { vol: 1 });
      setTimeout(() => SFX_BANK.play(pick(['v_wrong1', 'v_wrong2', 'v_wrong3', 'v_wrong4']), { vol: 0.95 }), 900);
      flashLabel('Wrong piece!', 'comedy');
    } else if (ev === 'awkward') {
      const pool = ['ahooga', 'woops', 'banana', 'haha', 'klonk', 'shloop', 'gulp', 'smarts', 'fall', 'scramble', 'zip'];
      SFX_BANK.play(pool[(Math.random() * pool.length) | 0], { vol: 0.85 });
      if (Math.random() < 0.6) SFX_BANK.play('v_awkward', { vol: 0.75 });
      flashLabel('Uh… oh', 'comedy');
    }
    // 'none': the classic wooden move sounds (already playing) carry it
  }

  // Ask the worker to judge the move: quality (blunder / brilliant / badge),
  // whether the move just SET a trap (the opponent faces captures that lose),
  // and — for engine moves — whether the engine declined a winning capture.
  // Runs right after the move; its verdict may upgrade the instant one.
  function requestVerdict(mv, preBoard, side, preNoProg, ply) {
    if (G.over) return;
    if (G.mode === 'aivai') return; // spectators keep a clean rhythm
    const w = getWorker();
    if (!w) return;
    const id = ++verdictId;
    pendingVerdict = { id, ply, caps: mv.caps.length, mover: side };
    w.postMessage({
      cmd: 'classify', id, rsId: G.rsId, side, noProgress: preNoProg,
      board: preBoard, playedPath: mv.path.join(),
      detectMissed: G.mode === 'ai' && side !== G.humanSide,
      withOpp: true,
      opts: { budgetMs: 340, maxDepth: 9, jitter: 0 },
    });
  }

  // ---- trap drama: reaction bank for baits taken, dodged and wasted ----
  const DRAMA = {
    trap_win:    { sfx: 'trap_snap', lines: ['v_taw1', 'v_taw2', 'v_taw3'], label: ['The trap springs!', 'Snap!', 'Right into it!'], kind: 'majestic' },
    trap_fail:   { sfx: 'trap_snap', lines: ['v_tbf1', 'v_tbf2', 'v_tbf3'], label: ['You took the bait!', 'It was a trap!', 'Straight into the trap!'], kind: 'comedy' },
    trap_denied: { sfx: 'denied',    lines: ['v_tad1', 'v_tad2', 'v_tad3'], label: ['Denied!', 'Not today!', 'Seen through!'], kind: 'judge' },
    trap_dodge:  { sfx: 'relief',    lines: ['v_tbd1', 'v_tbd2', 'v_tbd3'], label: ['Good read.', 'You dodged it!', 'Not biting.'], kind: 'judge' },
    ai_missed:   { sfx: 'relief',    lines: ['v_aim1', 'v_aim2'], label: ['The trap went unused?!'], kind: 'comedy' },
  };
  let lastDramaAt = 0;
  function applyDrama(kind, big) {
    const d = DRAMA[kind];
    if (!d) return;
    const now = Date.now();
    if (now - lastDramaAt < 2500) return; // never stack drama stings
    lastDramaAt = now;
    FX.play(d.sfx);
    // a slaughter (3+ off the board) gets its own commentary
    SFX_BANK.play(big ? pick(['v_slau1', 'v_slau2']) : pick(d.lines), { vol: 0.95 });
    flashLabel(pick(d.label), d.kind);
  }

  function handleVerdict(res) {
    const pv = pendingVerdict;
    if (!pv || res.id !== pv.id) return;
    pendingVerdict = null;
    if (G.over || G.history.length !== pv.ply) return;
    const h = G.history[pv.ply - 1];

    // ---- score-sheet badge (! brilliant · !? inaccurate · ? mistake · ?? blunder)
    if (h && isFinite(res.delta) && !res.onlyMove) {
      if (res.delta >= 420) h.badge = '??';
      else if (res.delta >= 170) h.badge = '?';
      else if (res.delta >= 70) h.badge = '?!';
      else if (res.delta <= -120 && res.playedScore > 40) h.badge = '!!';
      else if (res.delta <= 8 && isFinite(res.bestOther) && res.bestOther <= res.playedScore - 140) h.badge = '!';
      if (h.badge) updateHistory();
    }

    // ---- this move set a trap: the opponent now faces a capture choice ----
    // loose: a safe capture exists but the wrong one walks into a shot;
    // doom: every capture loses. Either way the next ply is the moment of truth.
    if (res.opp && res.opp.bait) {
      pendingTrap = { ply: pv.ply + 1, setter: pv.mover, doom: !!res.opp.doom, badPath: res.opp.capWorstPath };
    }

    // ---- the engine set a winning trap… and played somewhere else ----
    if (res.missedWin) {
      setTimeout(() => applyDrama('ai_missed'), 480);
      return;
    }

    if (res.onlyMove || !isFinite(res.delta)) return;
    if (res.delta >= 420) {
      longThinkSavage = lastThinkMs > 20000;
      applyMoveEvent('epic', pv.ply);
    } else if (res.delta >= 170) {
      longThinkSavage = lastThinkMs > 20000;
      applyMoveEvent('blunder', pv.ply);
    } else if (res.delta >= 70) applyMoveEvent('dubious', pv.ply);
    else if (res.delta <= -120 && res.playedScore > 40) applyMoveEvent('brilliant', pv.ply);
    else if (res.delta <= 8) {
      // A quiet move that suddenly leaves the opponent lost: a trap was set.
      const preBest = res.preBest;
      if (pv.caps === 0 && res.playedScore >= 190 && isFinite(preBest) && preBest <= 90) {
        applyMoveEvent('trick', pv.ply);
        return;
      }
      // Praising every accurate move would get old — fire sometimes, and
      // always when the played move was the only one that holds the game.
      const onlyWin = isFinite(res.bestOther) && res.bestOther <= res.playedScore - 140;
      if (onlyWin) applyMoveEvent('accurate', pv.ply, 'only');
      else if (Math.random() < 0.35 && res.playedScore > -30) applyMoveEvent('accurate', pv.ply);
    }
  }

  // ---------------- move execution ----------------
  async function animateMove(mv) {
    const p = pieceAt(mv.from);
    if (!p) return;
    p.el.classList.add('lifted');
    for (let k = 1; k < mv.path.length; k++) {
      const to = mv.path[k];
      p.sq = to;
      positionEl(p.el, to);
      const capIdx = mv.caps[k - 1];
      if (capIdx !== undefined) {
        const victim = pieceAt(capIdx);
        if (victim) setTimeout(() => { if (victim.el) victim.el.classList.add('captured'); }, 90);
        FX.play('capture');
      } else {
        FX.play('move');
      }
      await sleep(HOP_MS);
    }
    p.el.classList.remove('lifted');
    if (mv.promotes) {
      p.code = G.side * 2;
      refreshPiece(p);
      FX.play('king');
    }
  }

  let lastSpecAt = 0;
  const SPEC_THINK = ['v_spec2', 'v_spec3', 'v_spec4', 'v_spec5', 'v_spec6'];
  const SPEC_HIT = ['v_spec7', 'v_spec8'];

  async function executeMove(mv) {
    if (!mv || G.phase !== 'idle') return;
    G.phase = 'animating';
    const moverIsHuman = humanTurn();
    if (moverIsHuman) lastThinkMs = thinkArmedKey === turnKey() ? Date.now() - humanThinkStart : 0;
    const preBoard = G.board.slice();
    const preNoProg = G.noProg;
    const preLegal = G.legal.slice();
    const moverSide = G.side;
    G.sel = null; G.hint = null;
    updateAll();
    // a big capture trip gets its build-up call while the hops are airborne
    if (mv.caps.length >= 3) SFX_BANK.play('tellyou', { vol: 0.95 });
    await animateMove(mv);
    const ply = commitMove(mv);
    // trap drama: the mover either walked into the shot or found the safe way
    const trap = pendingTrap;
    pendingTrap = null;
    if (trap && trap.ply === ply && trap.setter === -moverSide && mv.caps.length > 0) {
      const moverIsEngine = G.mode === 'ai' && moverSide !== G.humanSide;
      const tookBadPath = trap.badPath != null && mv.path.join() === trap.badPath;
      if (trap.doom || tookBadPath) {
        applyDrama(moverIsEngine ? 'trap_win' : 'trap_fail', mv.caps.length >= 3); // the shot fires
      } else {
        applyDrama(moverIsEngine ? 'trap_denied' : 'trap_dodge'); // safe capture found
      }
    }
    // capture streaks: consecutive moves (by either side) that capture
    if (mv.caps.length > 0) {
      const stM = styleForSide(moverSide);
      if (stM && Math.random() < 0.18) {
        setTimeout(() => SFX_BANK.play(pick(stM.catch), { vol: 0.7 }), 750);
      }
      // spectator hype when the engines land a hit
      if (G.mode === 'aivai' && mv.caps.length >= 2 && Math.random() < 0.5 &&
          Date.now() - lastSpecAt > 9000) {
        lastSpecAt = Date.now();
        setTimeout(() => SFX_BANK.play(pick(SPEC_HIT), { vol: 0.9 }), 900);
      }
      G.capStreak = G.capStreakSide === moverSide ? G.capStreak + 1 : 1;
      G.capStreakSide = moverSide;
      if (G.capStreak >= 2) {
        const big = G.capStreak >= 3;
        setTimeout(() => {
          SFX_BANK.play(big ? 'streak_big' : 'streak_hit', { vol: 0.9 });
          if (Math.random() < (big ? 0.9 : 0.5)) SFX_BANK.play(big ? 'v_rampage2' : 'v_rampage', { vol: 0.9 });
          flashWhisper(big ? 'Unstoppable!' : 'On a rampage!');
        }, 620);
      }
    } else {
      G.capStreak = 0; G.capStreakSide = 0;
    }
    // spectator table talk while the engines think
    if (G.mode === 'aivai' && !G.over && mv.caps.length === 0 &&
        Math.random() < 0.1 && Date.now() - lastSpecAt > 16000) {
      lastSpecAt = Date.now();
      setTimeout(() => {
        SFX_BANK.play('notify_pop');
        setTimeout(() => SFX_BANK.play(pick(SPEC_THINK), { vol: 0.9 }), 200);
      }, 500);
    }
    lastEvent = { rank: -1, ply: -1 };
    if (!G.over) classifySync(mv, preLegal, ply);
    checkGameEnd();
    G.phase = G.over ? 'over' : 'idle';
    updateAll();
    if (!G.over) {
      requestVerdict(mv, preBoard, moverSide, preNoProg, ply); // queued first so it lands fast
      scheduleAI();
    } else {
      showGameOver();
    }
  }

  function commitMove(mv) {
    const side = G.side;
    G.history.push({
      notation: E.moveToNotation(G.rs, G.sqn, mv),
      side,
      move: mv,
      boardBefore: G.board.slice(),
      noProgBefore: G.noProg,
    });
    G.board = E.applyMove(G.rs, G.board, mv, side);
    G.noProg = E.nextNoProgress(G.rs, G.history[G.history.length - 1].boardBefore, mv, side, G.noProg);

    const p = pieceAt(mv.from);
    const end = mv.path[mv.path.length - 1];
    for (const j of mv.caps) { const v = pieceAt(j); if (v) removePiece(v); }
    if (p) { p.sq = end; positionEl(p.el, end); }

    G.lastMove = mv;
    G.side = -side;
    G.legal = E.legalMoves(G.rs, G.board, G.side);
    repAdd(posKey(G.board, G.side));
    return G.history.length;
  }

  function checkGameEnd() {
    const opp = G.side;
    if (!G.legal.length) {
      setOver(-opp, countSide(opp) === 0
        ? 'Every ' + sideName(opp).toLowerCase() + ' piece has been captured.'
        : sideName(opp) + ' has no legal move.');
    } else if (G.noProg >= G.rs.drawPlies) {
      setOver(null, G.rs.flyingKings
        ? 'Twenty-five king moves per side without a capture or man move.'
        : 'Forty moves per side without a capture or man move.');
    } else if ((G.repMap.get(posKey(G.board, G.side)) || 0) >= 3) {
      setOver(null, 'The same position occurred three times.');
    }
  }

  function setOver(winner, reason) {
    G.over = true;
    G.result = { winner, reason };
    G.phase = 'over';
    recordStats(winner);
  }

  function recordStats(winner) {
    if (G.mode !== 'ai' || G.recorded) return;
    G.recorded = true;
    const s = statEntry();
    s.p++;
    if (winner === null) { s.d++; s.run = 0; s.runKind = null; }
    else if (winner === G.humanSide) {
      s.w++;
      s.run = s.runKind === 'w' ? s.run + 1 : 1; s.runKind = 'w';
      s.bestRun = Math.max(s.bestRun, s.run);
    } else {
      s.l++;
      s.run = 0; s.runKind = null;
    }
    stats[G.rsId] = s;
    saveStats();
  }

  function showGameOver() {
    if (!G.over) return;
    const r = G.result;
    if (G.mode === 'ai') {
      FX.play(r.winner === null ? 'draw' : r.winner === G.humanSide ? 'win' : 'lose');
      SFX_BANK.play(r.winner === null ? 'draw_chime'
        : r.winner === G.humanSide ? 'win_fanfare' : 'lose_womp', { vol: 0.9 });
      if (r.winner === null && settings.sfx.party) {
        setTimeout(() => SFX_BANK.play('god', { vol: 0.9 }), 1000); // "…God."
      }
      if (r.winner === G.humanSide) {
        SFX_BANK.play('achievement', { vol: 0.8 });
        if (Math.random() < 0.35) setTimeout(() => SFX_BANK.play(pick(['v_win2', 'v_win3']), { vol: 0.85 }), 1400);
      } else if (r.winner !== null && Math.random() < 0.35) {
        setTimeout(() => SFX_BANK.play(pick(['v_lose2', 'v_lose3']), { vol: 0.85 }), 1400);
      }
      const v = r.winner === null ? 'v_draw' : r.winner === G.humanSide ? 'v_win' : 'v_lose';
      setTimeout(() => SFX_BANK.play(v, { vol: 0.9 }), 550);
      // ladder celebrations: conquering a new best rung, streaks, giant-killing
      if (r.winner === G.humanSide) {
        const li = LEVEL_IDS.indexOf(G.diff);
        const s = statEntry();
        const prevBest = typeof s.bestLevel === 'number' ? s.bestLevel : -1;
        if (li > prevBest) {
          s.bestLevel = li; stats[G.rsId] = s; saveStats();
          setTimeout(() => {
            FX.play('levelup');
            SFX_BANK.play('v_levelup1', { vol: 0.9 });
            flashWhisper('New best level conquered: ' + LEVELS[G.diff].name + '!');
          }, 1300);
        } else if (s.run >= 3) {
          setTimeout(() => SFX_BANK.play(pick(['v_streak1', 'v_streak2']), { vol: 0.85 }), 1500);
        } else if (li >= 6 && Math.random() < 0.45) {
          setTimeout(() => SFX_BANK.play(pick(['v_beatgm1', 'v_beatgm2']), { vol: 0.85 }), 1500);
        }
      }
    } else {
      FX.play(r.winner === null ? 'draw' : 'king');
      SFX_BANK.play(r.winner === null ? 'draw_chime' : 'crown_fanfare', { vol: 0.85 });
      if (r.winner === null) setTimeout(() => SFX_BANK.play('god', { vol: 0.9 }), 1000);
      // AI vs AI: the show must go on — commentary then the next bout
      if (Math.random() < 0.8) setTimeout(() => SFX_BANK.play(pick(['v_spec9', 'v_spec8', 'v_spec7']), { vol: 0.9 }), 1600);
    }
    $('goTitle').textContent = r.winner === null ? 'A draw'
      : (G.mode === 'ai'
        ? (r.winner === G.humanSide ? 'You win' : 'The computer wins')
        : displayName(r.winner) + ' wins');
    $('goResult').textContent = r.winner === null ? 'Honours are shared.'
      : displayName(r.winner) + ' takes the game.';
    $('goReason').textContent = r.reason || '';
    // AI vs AI with auto-rematch: no modal — count down into the next level
    if (G.mode === 'aivai' && settings.aivaiAuto) {
      scheduleAutoNext();
      return;
    }
    setTimeout(() => openModal('modalGameOver'), 650);
  }

  // ---------------- AI vs AI auto-rematch: next bout, next rung ----------------
  // The ladder climbs on its own while you spectate: after every game the
  // stronger rung steps up (wrapping past The Machine), the two schools swap
  // colours, and a fresh bout starts without anyone touching a button.
  let autoNextTimer = 0;
  function cancelAutoNext() {
    clearTimeout(autoNextTimer);
    autoNextTimer = 0;
    const el = $('autoNext');
    if (el) el.hidden = true;
  }
  function scheduleAutoNext() {
    cancelAutoNext();
    const el = $('autoNext');
    if (!el) return;
    const li = LEVEL_IDS.indexOf(G.diff);
    const nextId = LEVEL_IDS[(li + 1) % LEVEL_IDS.length];
    const swapI = settings.styleEbony, swapE = settings.styleIvory; // schools swap colours
    let left = 6;
    const announce = () => {
      el.hidden = false;
      el.innerHTML = 'Next: <b>' + LEVELS[nextId].name + '</b> · ' +
        styleById(swapE).flag + ' vs ' + styleById(swapI).flag + ' · ' + left + 's';
    };
    const fire = () => {
      cancelAutoNext();
      settings.diff = nextId;
      settings.styleIvory = swapI;
      settings.styleEbony = swapE;
      saveJSON(SETTINGS_KEY, settings);
      G.diff = nextId;
      FX.play('levelup');
      flashLabel('Level up: ' + LEVELS[nextId].name + '!', 'party');
      setTimeout(() => SFX_BANK.play(pick(['v_spec10', 'v_nextup']), { vol: 0.9 }), 500);
      startNewGameWithFanfare();
    };
    announce();
    const tick = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(tick); fire(); return; }
      announce();
    }, 1000);
    autoNextTimer = tick; // interval id doubles as the cancel handle
  }

  // ---------------- game lifecycle ----------------
  function newGame() {
    reqId++; // invalidate any in-flight search
    aiPending = false; hintPending = false;
    cancelAutoNext();
    G.rs = E.RULESETS[settings.rsId];
    G.rsId = settings.rsId;
    G.mode = settings.mode;
    G.diff = settings.diff;
    G.humanSide = settings.humanSide;
    G.aiPaused = false;
    G.aiSpeed = settings.speed;
    G.sqn = E.squareNumbers(G.rs);
    G.board = E.setupBoard(G.rs);
    G.side = G.rs.firstSide;
    G.noProg = 0;
    G.history = [];
    G.repMap = new Map();
    G.capStreak = 0; G.capStreakSide = 0;
    repAdd(posKey(G.board, G.side));
    G.legal = E.legalMoves(G.rs, G.board, G.side);
    G.over = false; G.result = null; G.recorded = false;
    G.phase = 'idle'; G.sel = null; G.hint = null; G.lastMove = null;
    lastThinkMs = 0; thinkArmedKey = -1; thinkFired = 0; clockArmedKey = -1;
    pendingTrap = null;
    buildBoard();
    rebuildPieces();
    updateAll();
    scheduleAI();
    // the opponent introduces themselves in their national style
    const greeter = G.mode === 'ai' ? styleById(settings.style)
      : G.mode === 'aivai' ? styleById(settings.styleIvory) : null;
    if (greeter && Math.random() < (G.mode === 'aivai' ? 0.3 : 0.45)) {
      setTimeout(() => SFX_BANK.play(greeter.intro, { vol: 0.8 }), 950);
    }
    // AI vs AI: the arena announcer opens the show
    if (G.mode === 'aivai' && Math.random() < 0.75) {
      setTimeout(() => {
        SFX_BANK.play('notify_pop');
        setTimeout(() => {
          SFX_BANK.play('v_spec1', { vol: 0.9 });
          flashWhisper(LEVELS[G.diff].name + ' — ' + styleById(settings.styleIvory).name +
            ' vs ' + styleById(settings.styleEbony).name);
        }, 200);
      }, 1250);
    }
  }

  function undo() {
    if (!G.history.length || G.phase === 'animating' || G.phase === 'over') return;
    if (G.mode === 'aivai') return; // spectating — nothing to undo
    reqId++; aiPending = false; hintPending = false;
    let steps = 1;
    if (G.mode === 'ai' && G.side === G.humanSide && G.history.length >= 2) steps = 2;
    repRemove(posKey(G.board, G.side)); // abandon the current position
    for (let s = 0; s < steps && G.history.length; s++) {
      const h = G.history.pop();
      G.board = h.boardBefore;
      G.side = h.side;
      G.noProg = h.noProgBefore;
    }
    G.over = false; G.result = null; G.recorded = false;
    G.lastMove = G.history.length ? G.history[G.history.length - 1].move : null;
    G.sel = null; G.hint = null;
    G.capStreak = 0; G.capStreakSide = 0;
    pendingTrap = null;
    G.legal = E.legalMoves(G.rs, G.board, G.side);
    rebuildPieces();
    FX.play('undo');
    if (Math.random() < 0.35) SFX_BANK.play('v_undo', { vol: 0.8 });
    G.phase = 'idle';
    updateAll();
    scheduleAI(); // undo can hand the turn back to the computer — keep it moving
  }

  function scheduleAI() {
    if (G.over || G.phase !== 'idle') return;
    if (G.mode === 'hotseat') return;
    if (G.mode === 'ai' && G.side === G.humanSide) return;
    if (G.mode === 'aivai' && G.aiPaused) return;
    G.phase = 'thinking';
    updateAll();
    runSearch('ai');
  }

  function requestHint() {
    if (G.phase !== 'idle' || G.over || !humanTurn() || !G.legal.length) return;
    G.phase = 'thinking';
    updateAll();
    runSearch('hint');
  }

  // ---------------- rendering ----------------
  function shouldFlip() {
    if (G.mode === 'aivai') return false; // spectators keep a fixed view
    if (G.mode === 'ai') return G.humanSide === EBONY;
    return settings.rotate && !G.over && G.side === EBONY;
  }

  function updateBanner() {
    const dot = $('bannerDot'), text = $('bannerText');
    const banner = $('banner');
    banner.classList.remove('thinking');
    if (G.over) {
      const r = G.result;
      dot.className = 'dot ' + (r.winner === IVORY ? 'ivory' : r.winner === EBONY ? 'ebony' : sideDot());
      text.textContent = r.winner === null
        ? 'Draw — ' + (r.reason || '')
        : displayName(r.winner) + ' wins — ' + (r.reason || '');
      return;
    }
    dot.className = 'dot ' + sideDot();
    const spect = G.mode === 'aivai' ? ' · AI vs AI' : '';
    if (G.phase === 'thinking') {
      banner.classList.add('thinking');
      text.textContent = hintPending ? 'Looking for a hint' : (G.mode === 'ai' && G.side !== G.humanSide
        ? 'The computer is thinking' : displayName(G.side) + ' to move' + spect);
    } else if (G.phase === 'animating') {
      text.textContent = displayName(-G.side) + ' moves…';
    } else {
      text.textContent = G.mode === 'ai'
        ? (G.side === G.humanSide ? 'Your move — ' + settings.pname : displayName(G.side) + ' to move')
        : displayName(G.side) + ' to move' + spect;
    }
  }
  function sideDot() { return G.side === IVORY ? 'ivory' : 'ebony'; }

  function updateTrays() {
    const perSide = (G.rs.n / 2) * G.rs.pieceRows;
    const byIvory = perSide - countSide(EBONY); // ebony losses = ivory's captures
    const byEbony = perSide - countSide(IVORY);
    const tray = (label, color, count) => {
      let minis = '';
      for (let i = 0; i < count; i++) minis += '<span class="mini ' + color + '"></span>';
      return '<span>' + label + '</span> <b>' + count + '</b> ' + minis;
    };
    $('trayTop').innerHTML = tray('Captured by Ivory', 'ebony', byIvory);
    $('trayBottom').innerHTML = tray('Captured by Ebony', 'ivory', byEbony);
  }

  function updateHistory() {
    const ol = $('history');
    if (!G.history.length) {
      ol.innerHTML = '<li class="empty">No moves yet — ' +
        (G.mode === 'ai' ? 'make your move or press Hint for a suggestion.' : sideName(G.rs.firstSide) + ' opens.') + '</li>';
    } else {
      let html = '';
      G.history.forEach((h, ix) => {
        html += '<li' + (ix === G.history.length - 1 ? ' class="current"' : '') + '>' +
          '<span class="no">' + (ix + 1) + '.</span>' +
          '<span class="pdot ' + (h.side === IVORY ? 'ivory' : 'ebony') + '"></span>' +
          '<span>' + h.notation + (h.move.promotes ? ' ♔' : '') +
          (h.badge ? '<span class="badge b-' + h.badge.length + '">' + h.badge + '</span>' : '') +
          '</span></li>';
      });
      ol.innerHTML = html;
      ol.scrollTop = ol.scrollHeight;
    }
    // compact ticker under the board: the last moves, newest on the right
    const tk = $('ticker');
    if (!G.history.length) {
      tk.innerHTML = '<span class="empty">' + sideName(G.rs.firstSide) + ' opens — moves will appear here.</span>';
      return;
    }
    const recent = G.history.slice(-14);
    tk.innerHTML = recent.map((h, ix) => {
      const cur = G.history.length - recent.length + ix === G.history.length - 1;
      return '<span class="tk' + (cur ? ' current' : '') + '">' +
        '<span class="pdot ' + (h.side === IVORY ? 'ivory' : 'ebony') + '"></span>' +
        h.notation + (h.move.promotes ? '♔' : '') +
        (h.badge ? '<span class="badge b-' + h.badge.length + '">' + h.badge + '</span>' : '') +
        '</span>';
    }).join('');
    tk.scrollLeft = tk.scrollWidth;
  }

  function updateSegs() {
    const set = (id, val) => {
      for (const b of $(id).querySelectorAll('button')) b.classList.toggle('active', b.dataset.v === String(val));
    };
    set('segRules', settings.rsId);
    set('segMode', settings.mode);
    set('segSide', settings.humanSide);
    set('segDiff', settings.diff);
    set('segClock', settings.clock);
    set('segSpeed', G.aiSpeed);
    set('segStyle', settings.style);
    set('segStyleI', settings.styleIvory);
    set('segStyleE', settings.styleEbony);
    $('rowSide').style.display = settings.mode === 'ai' ? '' : 'none';
    $('rowDiff').style.display = settings.mode === 'ai' ? '' : 'none';
    $('rowStyle').style.display = settings.mode === 'ai' ? '' : 'none';
    $('rowStyleI').style.display = settings.mode === 'aivai' ? '' : 'none';
    $('rowStyleE').style.display = settings.mode === 'aivai' ? '' : 'none';
    $('rowClock').style.display = settings.mode === 'aivai' ? 'none' : '';
    $('rowName').style.display = settings.mode === 'aivai' ? 'none' : '';
    $('name2Wrap').style.display = settings.mode === 'hotseat' ? '' : 'none';
    $('rowAuto').style.display = settings.mode === 'aivai' ? '' : 'none';
    set('segAuto', settings.aivaiAuto ? 'on' : 'off');
    $('nameInput').value = settings.pname;
    $('name2Input').value = settings.pname2;
    const rs = E.RULESETS[settings.rsId];
    const stNote = settings.mode === 'aivai'
      ? styleById(settings.styleIvory).name + ' vs ' + styleById(settings.styleEbony).name + '.'
      : styleById(settings.style).blurb;
    $('setupNote').textContent = settings.mode === 'ai'
      ? rs.name + ' — ' + sideName(rs.firstSide) + ' opens. You play ' + sideName(settings.humanSide).toLowerCase() + '. ' + stNote
      : settings.mode === 'aivai'
        ? rs.name + ' — ' + sideName(rs.firstSide) + ' opens. Sit back and watch the engines. ' + stNote
        : rs.name + ' — ' + sideName(rs.firstSide) + ' opens. Pass and play.';
    $('styleNote').textContent = settings.mode === 'aivai'
      ? 'Two schools, one board — ' + styleById(settings.styleIvory).blurb
      : styleById(settings.style).blurb;
    $('btnRotate').style.display = settings.mode === 'hotseat' ? '' : 'none';
    $('btnSound').textContent = settings.sound ? '🔊' : '🔇';
    $('btnRotate').classList.toggle('active', settings.mode === 'hotseat' && settings.rotate);
    $('btnHV').classList.toggle('active', !!settings.hv);
    $('btnAmbient').classList.toggle('active', !!settings.ambient);
    $('btnJump').classList.toggle('active', !!settings.jumpPaths);
    $('btnShake').classList.toggle('active', !!settings.shake);
    $('btnAivaiPause').textContent = G.aiPaused ? '▶ Resume' : '⏸ Pause';
    for (const b of $('sfxChips').querySelectorAll('button')) {
      b.classList.toggle('active', !!settings.sfx[b.dataset.v]);
    }
    $('sfxVol').value = Math.round(settings.sfx.master * 100);
    $('sfxVolVal').textContent = Math.round(settings.sfx.master * 100) + '%';
    for (const b of $('themeGrid').querySelectorAll('button')) {
      b.classList.toggle('active', b.dataset.v === settings.theme);
    }
  }

  function updateControls() {
    $('btnUndo').disabled = !G.history.length || G.phase === 'animating' || G.phase === 'over' || G.mode === 'aivai';
    $('btnHint').disabled = !humanTurn() || G.phase !== 'idle' || !G.legal.length;
    $('btnRotate').disabled = settings.mode !== 'hotseat';
    $('aivaiBar').hidden = settings.mode !== 'aivai';
    $('qaBar').style.display = settings.mode === 'aivai' ? 'none' : '';
    $('qaHint').disabled = $('btnHint').disabled;
    $('qaUndo').disabled = $('btnUndo').disabled;
    $('qaHint').classList.toggle('active', hintPending);
  }

  function updateAll() {
    frameEl.classList.toggle('flip', shouldFlip());
    updateBanner();
    updateTrays();
    updateHistory();
    updateSegs();
    updateControls();
    renderHighlights();
  }

  // ---------------- modals ----------------
  function openModal(id) {
    closeModals();
    $('backdrop').classList.add('show');
    $(id).hidden = false;
  }
  function closeModals() {
    $('backdrop').classList.remove('show');
    for (const id of ['modalGameOver', 'modalStats', 'modalConfirm']) $(id).hidden = true;
  }
  function confirmIfNeeded(fn) {
    if (G.history.length >= 2 && !G.over) {
      openModal('modalConfirm');
      pendingConfirm = fn;
    } else fn();
  }
  let pendingConfirm = null;

  function showStats() {
    const rows = Object.keys(E.RULESETS).map((rid) => {
      const s = Object.assign({ p: 0, w: 0, l: 0, d: 0, bestRun: 0 }, stats[rid]);
      const name = E.RULESETS[rid].name;
      const bestLevel = typeof s.bestLevel === 'number' && LEVELS[LEVEL_IDS[s.bestLevel]]
        ? LEVELS[LEVEL_IDS[s.bestLevel]].name : '—';
      return '<tr><td>' + name + '</td><td>' + s.p + '</td><td>' + s.w + '</td><td>' + s.l +
        '</td><td>' + s.d + '</td><td>' + s.bestRun + '</td><td>' + bestLevel + '</td></tr>';
    }).join('');
    $('statsTable').innerHTML =
      '<tr><th>Ruleset</th><th>Played</th><th>Won</th><th>Lost</th><th>Drawn</th><th>Best run</th><th>Highest level beaten</th></tr>' + rows;
    openModal('modalStats');
  }

  // ---------------- controls wiring ----------------
  function wireSeg(id, apply) {
    $(id).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      SFX_BANK.play('ui_click');
      apply(b.dataset.v);
    });
  }

  wireSeg('segRules', (v) => {
    if (v === settings.rsId) return;
    confirmIfNeeded(() => { settings.rsId = v; saveJSON(SETTINGS_KEY, settings); newGame(); });
  });
  wireSeg('segMode', (v) => {
    if (v === settings.mode) return;
    confirmIfNeeded(() => { settings.mode = v; saveJSON(SETTINGS_KEY, settings); newGame(); });
  });
  wireSeg('segSide', (v) => {
    const s = +v;
    if (s === settings.humanSide) return;
    confirmIfNeeded(() => { settings.humanSide = s; saveJSON(SETTINGS_KEY, settings); newGame(); });
  });
  wireSeg('segDiff', (v) => {
    settings.diff = v; saveJSON(SETTINGS_KEY, settings); updateSegs();
  });
  wireSeg('segClock', (v) => {
    settings.clock = +v; saveJSON(SETTINGS_KEY, settings);
    clockArmedKey = -1; // re-arm with the new budget
    updateSegs();
  });
  wireSeg('segSpeed', (v) => {
    settings.speed = +v; G.aiSpeed = +v;
    saveJSON(SETTINGS_KEY, settings); updateSegs();
  });
  wireSeg('segAuto', (v) => {
    settings.aivaiAuto = v === 'on';
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    if (!settings.aivaiAuto) cancelAutoNext();
  });

  // player names: live edits, tidied on commit
  const wireName = (inputId, key, fb) => {
    $(inputId).addEventListener('input', () => {
      settings[key] = $(inputId).value;
      saveJSON(SETTINGS_KEY, settings);
      updateBanner();
    });
    $(inputId).addEventListener('change', () => {
      settings[key] = cleanName(settings[key], fb);
      $(inputId).value = settings[key];
      saveJSON(SETTINGS_KEY, settings);
      updateBanner();
      SFX_BANK.play('ui_save');
    });
  };
  wireName('nameInput', 'pname', 'UHAKIKA');
  wireName('name2Input', 'pname2', 'Challenger');

  $('btnJump').addEventListener('click', () => {
    settings.jumpPaths = !settings.jumpPaths;
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    renderHighlights();
    SFX_BANK.play(settings.jumpPaths ? 'ui_toggle_on' : 'ui_toggle_off');
  });
  $('btnShake').addEventListener('click', () => {
    settings.shake = !settings.shake;
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    SFX_BANK.play(settings.shake ? 'ui_toggle_on' : 'ui_toggle_off');
  });

  function startNewGameWithFanfare() {
    newGame();
    SFX_BANK.play('gong', { vol: 0.8 });
    if (Math.random() < 0.4) setTimeout(() => SFX_BANK.play('v_new', { vol: 0.85 }), 500);
  }
  $('btnNew').addEventListener('click', () => confirmIfNeeded(startNewGameWithFanfare));
  $('btnAivaiNew').addEventListener('click', () => confirmIfNeeded(startNewGameWithFanfare));
  $('btnUndo').addEventListener('click', undo);
  $('btnHint').addEventListener('click', requestHint);
  $('qaHint').addEventListener('click', requestHint);
  $('qaUndo').addEventListener('click', undo);
  $('btnHV').addEventListener('click', () => {
    settings.hv = !settings.hv;
    saveJSON(SETTINGS_KEY, settings);
    document.body.classList.toggle('hv', settings.hv);
    updateSegs();
    SFX_BANK.play(settings.hv ? 'ui_toggle_on' : 'ui_toggle_off');
  });
  $('btnStats').addEventListener('click', showStats);
  $('btnAivaiPause').addEventListener('click', () => {
    G.aiPaused = !G.aiPaused;
    if (G.aiPaused) cancelAutoNext();
    SFX_BANK.play(G.aiPaused ? 'ui_toggle_off' : 'ui_toggle_on');
    updateSegs();
    if (!G.aiPaused) scheduleAI();
  });
  $('btnSound').addEventListener('click', () => {
    settings.sound = !settings.sound;
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    if (settings.sound) FX.play('select');
  });
  $('btnRotate').addEventListener('click', () => {
    settings.rotate = !settings.rotate;
    saveJSON(SETTINGS_KEY, settings);
    updateAll();
  });

  // sound-design controls
  $('sfxVol').addEventListener('input', () => {
    const v = $('sfxVol').value / 100;
    FX.setMaster(v);
    $('sfxVolVal').textContent = $('sfxVol').value + '%';
  });
  $('sfxVol').addEventListener('change', () => saveJSON(SETTINGS_KEY, settings));
  $('sfxChips').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const key = b.dataset.v;
    settings.sfx[key] = !settings.sfx[key];
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    // audible confirmation per category
    if (settings.sound) {
      SFX_BANK.play(settings.sfx[key] ? 'ui_toggle_on' : 'ui_toggle_off');
      if (settings.sfx[key]) {
        if (key === 'animals') setTimeout(() => SFX_BANK.play('eagle'), 140);
        else if (key === 'judge') setTimeout(() => SFX_BANK.play('v_hmm'), 140);
        else if (key === 'comedy') setTimeout(() => SFX_BANK.play('klonk'), 140);
        else if (key === 'voice') setTimeout(() => SFX_BANK.play('v_magnificent'), 140);
        else if (key === 'think') setTimeout(() => SFX_BANK.play('t2a'), 140);
        else if (key === 'drama') setTimeout(() => { FX.play('trap_snap'); SFX_BANK.play('v_taw1', { vol: 0.85 }); }, 140);
        else if (key === 'party') setTimeout(() => SFX_BANK.play('badboy', { vol: 0.95 }), 140);
        else if (key === 'classic') setTimeout(() => FX.play('capture'), 140);
      }
    }
  });

  // theme picker
  const themeGrid = $('themeGrid');
  for (const t of THEMES) {
    const b = document.createElement('button');
    b.className = 'theme-sw';
    b.dataset.v = t.id;
    b.title = t.name;
    b.style.setProperty('--sw-l', t.v['--sq-light']);
    b.style.setProperty('--sw-d', t.v['--sq-dark']);
    b.style.setProperty('--sw-a', t.v['--accent']);
    b.innerHTML = '<span class="sw-board" aria-hidden="true"></span><span class="sw-name">' + t.name + '</span>';
    themeGrid.appendChild(b);
  }
  themeGrid.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.dataset.v === settings.theme) return;
    settings.theme = b.dataset.v;
    saveJSON(SETTINGS_KEY, settings);
    applyTheme(settings.theme);
    updateSegs();
    SFX_BANK.play('ui_theme');
  });

  // playing-style pickers: the engine's school (computer mode) and, for
  // AI-vs-AI spectating, a personality per side
  for (const gridId of ['segStyle', 'segStyleI', 'segStyleE']) {
    const grid = $(gridId);
    for (const s of STYLES) {
      const b = document.createElement('button');
      b.dataset.v = s.id;
      b.title = s.flag + ' ' + s.name + ' — ' + s.blurb;
      b.textContent = s.flag + ' ' + s.name;
      grid.appendChild(b);
    }
  }
  wireSeg('segStyle', (v) => {
    settings.style = v; saveJSON(SETTINGS_KEY, settings); updateSegs();
    SFX_BANK.play(styleById(v).intro, { vol: 0.75 });
  });
  wireSeg('segStyleI', (v) => { settings.styleIvory = v; saveJSON(SETTINGS_KEY, settings); updateSegs(); });
  wireSeg('segStyleE', (v) => { settings.styleEbony = v; saveJSON(SETTINGS_KEY, settings); updateSegs(); });

  // ambient animated background glow
  $('btnAmbient').addEventListener('click', () => {
    settings.ambient = !settings.ambient;
    saveJSON(SETTINGS_KEY, settings);
    document.body.classList.toggle('ambient-off', !settings.ambient);
    updateSegs();
    SFX_BANK.play(settings.ambient ? 'ui_toggle_on' : 'ui_toggle_off');
  });

  $('goRematch').addEventListener('click', () => { closeModals(); startNewGameWithFanfare(); });
  $('goClose').addEventListener('click', closeModals);
  $('statsClose').addEventListener('click', closeModals);
  $('statsReset').addEventListener('click', () => {
    for (const rid of Object.keys(E.RULESETS)) stats[rid] = {};
    saveStats(); showStats();
  });
  $('cfYes').addEventListener('click', () => { closeModals(); const f = pendingConfirm; pendingConfirm = null; if (f) f(); });
  $('cfNo').addEventListener('click', () => { closeModals(); pendingConfirm = null; });
  $('backdrop').addEventListener('pointerdown', (e) => {
    if (e.target !== $('backdrop')) return;
    if (!$('modalConfirm').hidden) return; // confirm needs an explicit choice
    closeModals();
  });

  // ---------------- settings drawer ----------------
  const drawer = $('drawer'), drawerBackdrop = $('drawerBackdrop');
  let drawerOpen = false;
  function openMenu() {
    if (drawerOpen) return;
    drawerOpen = true;
    drawer.classList.add('open');
    drawerBackdrop.classList.add('show');
    drawer.setAttribute('aria-hidden', 'false');
    $('btnMenu').setAttribute('aria-expanded', 'true');
    SFX_BANK.play('ui_open');
  }
  function closeMenu() {
    if (!drawerOpen) return;
    drawerOpen = false;
    drawer.classList.remove('open');
    drawerBackdrop.classList.remove('show');
    drawer.setAttribute('aria-hidden', 'true');
    $('btnMenu').setAttribute('aria-expanded', 'false');
    SFX_BANK.play('ui_close');
  }
  $('btnMenu').addEventListener('click', () => (drawerOpen ? closeMenu() : openMenu()));
  $('btnDrawerClose').addEventListener('click', closeMenu);
  $('btnDrawerSave').addEventListener('click', () => {
    SFX_BANK.play('ui_save');
    closeMenu();
  });
  drawerBackdrop.addEventListener('pointerdown', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('modalConfirm').hidden) { closeModals(); pendingConfirm = null; }
      else if (drawerOpen) closeMenu();
      else closeModals();
    } else if (e.key === 'm' || e.key === 'M') {
      if (e.target === document.body) drawerOpen ? closeMenu() : openMenu();
    } else if (e.key === 'h' || e.key === 'H') {
      if (e.target === document.body) requestHint();
    } else if (e.key === 'u' || e.key === 'U') {
      if (e.target === document.body) undo();
    }
  });

  // ---------------- move clock (human turns) & thinking heckles -------------
  const THINK_TIERS = [
    { at: 12000, lines: ['t1a', 't1b', 't1c', 't1d', 't1e'], say: 'Still thinking…' },
    { at: 25000, lines: ['t2a', 't2b', 't2c', 't2d', 't2e'], say: 'Any day now…' },
    { at: 45000, lines: ['t3a', 't3b', 't3c', 't3d'], say: 'Just agree you lost…' },
    { at: 75000, lines: ['t4a', 't4b', 't4c', 't4d'], say: 'Need help?' },
    { at: 105000, lines: ['t5a', 't5b', 't5c'], say: 'I age…' },
  ];
  const thinkSaid = new Set();
  let thinkArmedKey = -1, humanThinkStart = 0, thinkFired = 0;
  let clockArmedKey = -1, clockDeadline = 0, lastTickSec = -1;
  const turnKey = () => G.history.length * 2 + (G.side === IVORY ? 0 : 1);

  // narrator time cards while an engine is lost in thought ("a few moments
  // later…", and at the deep rungs, "two hours later…"). Thresholds are
  // tuned to the ladder's real budgets: only the top rungs (and slow
  // spectator games) ever think long enough to hear them.
  const AI_CARDS = [
    { at: 2600, snd: 'later_moments', say: 'A few moments later…' },
    { at: 5200, snd: 'later_hours', say: 'Two hours later…' },
  ];
  let aiCardKey = -1, aiCardStart = 0, aiCardFired = 0;

  setInterval(() => {
    const k = turnKey();
    const humanActive = humanTurn() && G.phase === 'idle' && !G.over;

    // --- narrator time cards during engine thinks ---
    const aiThinking = !G.over && G.phase === 'thinking' &&
      (G.mode === 'aivai' || (G.mode === 'ai' && G.side !== G.humanSide));
    if (!aiThinking || hintPending) {
      aiCardKey = -1;
    } else {
      if (k !== aiCardKey) { aiCardKey = k; aiCardStart = Date.now(); aiCardFired = 0; }
      const dt = Date.now() - aiCardStart;
      while (aiCardFired < AI_CARDS.length && dt >= AI_CARDS[aiCardFired].at) {
        const card = AI_CARDS[aiCardFired++];
        SFX_BANK.play(card.snd, { vol: 0.9 });
        flashWhisper(card.say);
      }
    }

    // --- move clock ---
    const pill = $('clockPill');
    if (settings.clock > 0 && humanActive) {
      if (k !== clockArmedKey) {
        clockArmedKey = k;
        clockDeadline = Date.now() + settings.clock * 1000;
        lastTickSec = -1;
      }
      const remain = Math.max(0, (clockDeadline - Date.now()) / 1000);
      pill.hidden = false;
      pill.textContent = '⏱ ' + Math.ceil(remain) + 's';
      pill.classList.toggle('urgent', remain <= 5.05);
      const sec = Math.ceil(remain);
      if (sec !== lastTickSec) {
        lastTickSec = sec;
        if (sec > 5 && sec <= 10) SFX_BANK.play('clock_tick');
        else if (sec <= 5 && sec > 0) SFX_BANK.play('clock_tock');
      }
      if (remain <= 0 && G.legal.length) {
        clockArmedKey = -1;
        SFX_BANK.play('whistle_ref', { vol: 1 });
        SFX_BANK.play('alarm', { vol: 0.7 });
        flashLabel('Time!', 'comedy');
        executeMove(G.legal[(Math.random() * G.legal.length) | 0]);
      }
    } else {
      pill.hidden = true;
    }

    // --- escalating heckles while the human stares at the board ---
    if (!humanActive || settings.mode === 'aivai') { thinkFired = 0; return; }
    if (k !== thinkArmedKey) { thinkArmedKey = k; humanThinkStart = Date.now(); }
    const dt = Date.now() - humanThinkStart;
    while (thinkFired < THINK_TIERS.length && dt >= THINK_TIERS[thinkFired].at) {
      const tier = THINK_TIERS[thinkFired++];
      const fresh = tier.lines.filter((l) => !thinkSaid.has(l));
      const line = pick(fresh.length ? fresh : tier.lines);
      thinkSaid.add(line);
      if (thinkSaid.size > 12) thinkSaid.delete(thinkSaid.values().next().value);
      SFX_BANK.play('notify_pop');
      setTimeout(() => SFX_BANK.play(line, { vol: 0.95 }), 170);
      flashWhisper(tier.say);
    }
  }, 250);

  // ---------------- boot ----------------
  applyTheme(settings.theme);
  document.body.classList.toggle('hv', !!settings.hv);
  document.body.classList.toggle('ambient-off', !settings.ambient);
  newGame();
  try { FX.ensure(); } catch { /* audio starts on first gesture instead */ }

  // Minimal test hook: lets automated tests drive the real input path and
  // inspect game state. Not used by the game itself.
  window.__drafti = {
    state: G, tap: onSquareClick, sfx: SFX_BANK, fx: FX, rebuild: rebuildPieces,
    menu: { open: openMenu, close: closeMenu, isOpen: () => drawerOpen },
    workerSource,
    engine: E, executeMove, showGameOver, settings,
  };
})();
