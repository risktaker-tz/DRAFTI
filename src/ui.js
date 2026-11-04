'use strict';
/* DRAFTI web UI — game state, rendering, input, animation, AI worker, extras. */
// Local players own independent progress; the established keys remain mirrors
// of the active player for older builds. Presentation preferences stay shared.
function createMistakeMemory(saved) {
  const locked=!!saved&&saved.schema!==1;
  const state={schema:1,serial:0,entries:[]};
  if(saved&&saved.schema===1&&Array.isArray(saved.entries)){
    state.entries=saved.entries.filter(e=>e&&typeof e.actor==='string'&&typeof e.position==='string'&&typeof e.route==='string'&&
      Number.isFinite(e.delta)&&e.delta>=170&&Number.isInteger(e.depth)&&e.depth>=3).slice(-512);
    state.serial=Math.max(0,...state.entries.map(e=>e.seen||0));
  }
  return {
    remember(actor,position,route,proof){
      if(locked||!proof||proof.onlyMove||!Number.isFinite(proof.delta)||proof.delta<170||!Number.isInteger(proof.depth)||proof.depth<3)return false;
      if(typeof actor!=='string'||actor.length>60||typeof position!=='string'||position.length>1600||typeof route!=='string'||route.length>600)return false;
      let entry=state.entries.find(e=>e.actor===actor&&e.position===position&&e.route===route);
      if(!entry){entry={actor,position,route,delta:proof.delta,depth:proof.depth};state.entries.push(entry);}
      entry.delta=Math.max(entry.delta,proof.delta);entry.depth=Math.max(entry.depth,proof.depth);entry.seen=++state.serial;
      state.entries.sort((a,b)=>(a.seen||0)-(b.seen||0));state.entries=state.entries.slice(-512);return true;
    },
    avoid(actor,position,route,depth){
      const entry=state.entries.find(e=>e.actor===actor&&e.position===position&&e.route===route);
      return !!entry&&!(Number.isFinite(depth)&&depth>entry.depth+2);
    },
    count:()=>state.entries.length,
    snapshot:()=>JSON.parse(JSON.stringify(state)),
  };
}
function createPlayerProgressStore(storage) {
  const key = 'drafti.players.v1';
  const routed = ['drafti.arena.v2','drafti.arena-progress.v1','drafti.stats.v1','drafti.match.v1','drafti.learning.v1','drafti.human-ladder.v1'];
  const copy = value => JSON.parse(JSON.stringify(value));
  const read = name => { try { const text = storage && storage.getItem(name); return text ? JSON.parse(text) : null; } catch { return null; } };
  let data = read(key);
  const protectedSave = !!data && (data.schema !== 1 || !Array.isArray(data.players) || !data.players.length);
  if (!data || data.schema !== 1 || !Array.isArray(data.players) || !data.players.length) {
    const values = {};
    for (const name of routed) { const value = read(name); if (value && typeof value === 'object') values[name] = value; }
    const prefs = read('drafti.settings.v1') || {};
    data = { schema: 1, active: 'player-1', next: 2,
      players: [{ id: 'player-1', name: String(prefs.pname || 'Uhakika').trim().slice(0,28) || 'Uhakika', values }] };
  }
  data.players = data.players.filter(player => player && typeof player.id === 'string' && typeof player.name === 'string' && player.values && typeof player.values === 'object');
  if (!data.players.length) data.players.push({id:'player-1',name:'Uhakika',values:{}});
  if (!data.players.some(player => player.id === data.active)) data.active = data.players[0].id;
  // Old builds shared a selected difficulty. Preserve that selection during
  // migration; genuinely new players begin an independent automatic journey.
  const legacyPrefs = read('drafti.settings.v1') || {};
  const ladderMigrations = [];
  for (const player of data.players) if (!Object.prototype.hasOwnProperty.call(player.values,'drafti.human-ladder.v1')) {
    const chosen = /^l([1-9]|10)$/.test(legacyPrefs.diff || '') ? +legacyPrefs.diff.slice(1) : null;
    player.values['drafti.human-ladder.v1'] = { schema:1, automatic:chosen === null, level:chosen || 1 };
    ladderMigrations.push(player.id);
  }
  const active = () => data.players.find(player => player.id === data.active);
  const dirty=new Map(),created=new Set(),baseline=new Map();let activeChanged=false,lastFailure='';
  const baselines=()=>{baseline.clear();for(const player of data.players)for(const name of routed)baseline.set(player.id+'|'+name,JSON.stringify(player.values[name]));};baselines();
  for (const id of ladderMigrations) {
    dirty.set(id,new Set(['drafti.human-ladder.v1']));
    baseline.set(id+'|drafti.human-ladder.v1',undefined);
  }
  const mark=name=>{if(!dirty.has(data.active))dirty.set(data.active,new Set());dirty.get(data.active).add(name);};
  const persist = () => {
    try {
      if(!storage || protectedSave){lastFailure='storage';return false;}
      const raw=storage.getItem(key),latest=raw?JSON.parse(raw):null,localActive=data.active;
      if(latest && (latest.schema!==1 || !Array.isArray(latest.players))){lastFailure='storage';return false;}
      let merged=copy(data);
      if(latest && latest.schema===1 && Array.isArray(latest.players)){
        merged=copy(latest);
        for(const local of data.players){
          let remote=merged.players.find(player=>player.id===local.id);
          if(!remote){merged.players.push(copy(local));continue;}
          for(const name of dirty.get(local.id)||[]){
            const remoteText=JSON.stringify(remote.values[name]),localText=JSON.stringify(local.values[name]);
            if(remoteText!==baseline.get(local.id+'|'+name)&&remoteText!==localText){lastFailure='conflict';return false;}
            if(Object.prototype.hasOwnProperty.call(local.values,name))remote.values[name]=copy(local.values[name]);else delete remote.values[name];
          }
        }
        if(activeChanged)merged.active=localActive;
        merged.next=Math.max(data.next||2,merged.next||2);
      }
      storage.setItem(key,JSON.stringify(merged));data=merged;data.active=localActive;
      for(const [id,names] of dirty)for(const name of names)baseline.set(id+'|'+name,JSON.stringify(data.players.find(player=>player.id===id)?.values[name]));
      for(const id of created)for(const name of routed)baseline.set(id+'|'+name,JSON.stringify(data.players.find(player=>player.id===id)?.values[name]));
      dirty.clear();created.clear();activeChanged=false;lastFailure='';return true;
    }catch{lastFailure='storage';return false;}
  };
  const mirror = () => {
    try { if (storage && !protectedSave) for (const name of routed) storage.setItem(name,JSON.stringify(active().values[name] ?? null)); } catch { /* canonical player save remains intact */ }
  };
  return {
    key, routes: name => routed.includes(name),
    list: () => data.players.map(player => ({id:player.id,name:player.name})),
    active: () => ({id:active().id,name:active().name}),
    lastError: () => lastFailure,
    refresh() {
      const latest=read(key);if(!latest || latest.schema!==1 || !Array.isArray(latest.players))return false;
      data=latest;dirty.clear();created.clear();activeChanged=false;lastFailure='';baselines();return true;
    },
    load(name,fallback) {
      if(!dirty.get(data.active)?.has(name))baseline.set(data.active+'|'+name,JSON.stringify(active().values[name]));
      return Object.prototype.hasOwnProperty.call(active().values,name) ? copy(active().values[name]) : fallback;
    },
    save(name,value) {
      if (!routed.includes(name)) return false;
      return this.saveBundle({[name]:value});
    },
    saveBundle(values) {
      for (const [name,value] of Object.entries(values)) {
        if (!routed.includes(name)) throw new Error('Unknown progress key');
        mark(name);
        active().values[name] = copy(value);
      }
      const saved = persist();
      try { if (saved && storage && !protectedSave) for (const [name,value] of Object.entries(values)) storage.setItem(name,JSON.stringify(value)); } catch {}
      return saved;
    },
    switchTo(id) {
      if (!data.players.some(player => player.id === id)) return false;
      data.active = id;activeChanged=true;const saved = persist();if(saved)mirror();return saved;
    },
    create(name) {
      name = String(name || '').trim().replace(/\s+/g,' ').slice(0,28);
      const latest=read(key),others=latest&&latest.schema===1&&Array.isArray(latest.players)?latest.players:[];
      const all=new Map([...others,...data.players].map(player=>[player.id,player]));
      if (!name || all.size >= 12 || [...all.values()].some(player => player.name.toLowerCase() === name.toLowerCase())) return null;
      const next = Math.max(2,Number.isSafeInteger(data.next) ? data.next : data.players.length + 1);
      const id='player-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);data.next=next+1;
      data.players.push({id,name,values:{'drafti.human-ladder.v1':{schema:1,automatic:true,level:1}}});data.active=id;created.add(id);activeChanged=true;if(persist())mirror();return id;
    },
    resetLeague() {
      for (const name of ['drafti.arena.v2','drafti.arena-progress.v1','drafti.match.v1','drafti.learning.v1']) {mark(name);delete active().values[name];}
      const saved=persist();if(saved)mirror();return saved;
    },
    persist,
  };
}
function createHumanProgression(saved, fallback = 'l1') {
  const valid = id => typeof id === 'string' && /^l([1-9]|10)$/.test(id);
  const locked = !!saved && saved.schema !== 1;
  const level = saved && Number.isInteger(saved.level) && saved.level >= 1 && saved.level <= 10
    ? saved.level : valid(fallback) ? +fallback.slice(1) : 1;
  const state = {schema:1,automatic:!locked && (saved == null || saved.automatic === true),level};
  return {
    current: () => 'l' + state.level,
    automatic: () => state.automatic,
    manual(id) { if (locked || !valid(id)) return false; state.level=+id.slice(1);state.automatic=false;return true; },
    setAutomatic(enabled) { if(locked)return false;state.automatic=!!enabled;return true; },
    win(completedLevel) {
      if(locked || !state.automatic || completedLevel !== 'l'+state.level || state.level >= 10)return false;
      state.level++;return true;
    },
    snapshot: () => locked ? saved : {...state},
  };
}
// Opt-in verification retains a bounded, exportable history without writing
// player storage or depending on the browser console's short-lived buffer.
function createSoundAudit(capacity = 12000) {
  const audio = [], checkpoints = [], errors = [];
  const dropped = { audio: 0, checkpoints: 0, errors: 0 };
  const copy = value => JSON.parse(JSON.stringify(value));
  function append(list, value, key, limit) {
    if (list.length === limit) { list.shift(); dropped[key]++; }
    list.push(copy(value));
  }
  if (!Number.isInteger(capacity) || capacity < 1) throw Error('Invalid playback log capacity');
  return {
    sound(row) { append(audio, { message: '[DRAFTI audio] ' + JSON.stringify(row) }, 'audio', capacity); },
    checkpoint(row) { append(checkpoints, row, 'checkpoints', 1000); },
    error(message) { append(errors, { message: String(message).slice(0, 500) }, 'errors', 100); },
    counts: () => ({ sounds: audio.length, completed: checkpoints.filter(row => row.event === 'game-end').length }),
    snapshot: () => copy({ schema: 'drafti.sound-audit/1',
      scope: 'Actual logged sound starts and game boundaries on this navigation; not a listening certificate.',
      audio, checkpoints, errors, dropped }),
  };
}

(function () {
  let playerProgress;
  try { playerProgress = createPlayerProgressStore(localStorage); }
  catch { playerProgress = createPlayerProgressStore(null); }
  playerProgress.persist();
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
  // every school speaks: an intro line when the game starts and two
  // in-game catchphrases fired after its captures (24 banked voice lines)
  for (const s of STYLES) {
    s.intro = 's_in_' + s.id;
    s.catch = ['s_' + s.id + '_1', 's_' + s.id + '_2'];
  }

  // ---------------- the world arena: 194 nations, one board ------------------
  // AI vs AI is never nameless: Tanzania hosts the board (the champion's
  // seat) and the world lines up to challenge — Kenya first (the neighbourly
  // rivalry), then East Africa, then every nation of Africa, then Europe,
  // Asia, the Americas and Oceania. The winner keeps the board; a beaten
  // champion joins the back of the line, so no nation hogs the schedule.
  // Every 12 bouts closes a season and the next one opens with every
  // challenger a rung stronger. All seats search on the same 1-10 ladder the
  // menu uses, and a challenger is never left more than two rungs below the
  // champion — bouts stay watchable.
  const BAND_NAMES = { 0: 'Host nation', 1: 'The rivalry', 2: 'East Africa', 3: 'Africa', 4: 'Europe', 5: 'Asia', 6: 'Americas', 7: 'Oceania' };
  const NATION_DATA = [
    ['TZ', 'Tanzania', 0],
    ['KE', 'Kenya', 1],
    // East Africa — the neighbourhood takes the first call
    ['UG', 'Uganda', 2], ['RW', 'Rwanda', 2], ['BI', 'Burundi', 2], ['SS', 'South Sudan', 2],
    ['SO', 'Somalia', 2], ['CD', 'DR Congo', 2], ['ET', 'Ethiopia', 2], ['ER', 'Eritrea', 2], ['DJ', 'Djibouti', 2],
    // Africa — the whole continent
    ['EG', 'Egypt', 3], ['LY', 'Libya', 3], ['TN', 'Tunisia', 3], ['DZ', 'Algeria', 3], ['MA', 'Morocco', 3], ['SD', 'Sudan', 3],
    ['MR', 'Mauritania', 3], ['ML', 'Mali', 3], ['NE', 'Niger', 3], ['TD', 'Chad', 3], ['SN', 'Senegal', 3], ['GM', 'Gambia', 3],
    ['GW', 'Guinea-Bissau', 3], ['GN', 'Guinea', 3], ['SL', 'Sierra Leone', 3], ['LR', 'Liberia', 3], ['CI', 'Côte d’Ivoire', 3],
    ['GH', 'Ghana', 3], ['TG', 'Togo', 3], ['BJ', 'Benin', 3], ['BF', 'Burkina Faso', 3], ['NG', 'Nigeria', 3],
    ['CM', 'Cameroon', 3], ['CF', 'Central Africa', 3], ['GQ', 'Eq. Guinea', 3], ['GA', 'Gabon', 3], ['CG', 'Congo', 3], ['ST', 'São Tomé', 3],
    ['AO', 'Angola', 3], ['ZM', 'Zambia', 3], ['ZW', 'Zimbabwe', 3], ['MW', 'Malawi', 3], ['MZ', 'Mozambique', 3], ['NA', 'Namibia', 3],
    ['BW', 'Botswana', 3], ['ZA', 'South Africa', 3], ['LS', 'Lesotho', 3], ['SZ', 'Eswatini', 3], ['MG', 'Madagascar', 3],
    ['MU', 'Mauritius', 3], ['SC', 'Seychelles', 3], ['KM', 'Comoros', 3], ['CV', 'Cabo Verde', 3],
    // Europe
    ['AL', 'Albania', 4], ['AD', 'Andorra', 4], ['AT', 'Austria', 4], ['BY', 'Belarus', 4], ['BE', 'Belgium', 4],
    ['BA', 'Bosnia & Herz.', 4], ['BG', 'Bulgaria', 4], ['HR', 'Croatia', 4], ['CY', 'Cyprus', 4], ['CZ', 'Czechia', 4],
    ['DK', 'Denmark', 4], ['EE', 'Estonia', 4], ['FI', 'Finland', 4], ['FR', 'France', 4], ['DE', 'Germany', 4], ['GR', 'Greece', 4],
    ['HU', 'Hungary', 4], ['IS', 'Iceland', 4], ['IE', 'Ireland', 4], ['IT', 'Italy', 4], ['LV', 'Latvia', 4], ['LI', 'Liechtenstein', 4],
    ['LT', 'Lithuania', 4], ['LU', 'Luxembourg', 4], ['MT', 'Malta', 4], ['MD', 'Moldova', 4], ['MC', 'Monaco', 4],
    ['ME', 'Montenegro', 4], ['NL', 'Netherlands', 4], ['MK', 'North Macedonia', 4], ['NO', 'Norway', 4], ['PL', 'Poland', 4],
    ['PT', 'Portugal', 4], ['RO', 'Romania', 4], ['RU', 'Russia', 4], ['SM', 'San Marino', 4], ['RS', 'Serbia', 4],
    ['SK', 'Slovakia', 4], ['SI', 'Slovenia', 4], ['ES', 'Spain', 4], ['SE', 'Sweden', 4], ['CH', 'Switzerland', 4],
    ['UA', 'Ukraine', 4], ['GB', 'United Kingdom', 4],
    // Asia
    ['AF', 'Afghanistan', 5], ['AM', 'Armenia', 5], ['AZ', 'Azerbaijan', 5], ['BH', 'Bahrain', 5], ['BD', 'Bangladesh', 5],
    ['BT', 'Bhutan', 5], ['BN', 'Brunei', 5], ['KH', 'Cambodia', 5], ['CN', 'China', 5], ['GE', 'Georgia', 5], ['IN', 'India', 5],
    ['ID', 'Indonesia', 5], ['IR', 'Iran', 5], ['IQ', 'Iraq', 5], ['IL', 'Israel', 5], ['JP', 'Japan', 5], ['JO', 'Jordan', 5],
    ['KZ', 'Kazakhstan', 5], ['KW', 'Kuwait', 5], ['KG', 'Kyrgyzstan', 5], ['LA', 'Laos', 5], ['LB', 'Lebanon', 5],
    ['MY', 'Malaysia', 5], ['MV', 'Maldives', 5], ['MN', 'Mongolia', 5], ['MM', 'Myanmar', 5], ['NP', 'Nepal', 5],
    ['KP', 'North Korea', 5], ['OM', 'Oman', 5], ['PK', 'Pakistan', 5], ['PH', 'Philippines', 5], ['QA', 'Qatar', 5],
    ['SA', 'Saudi Arabia', 5], ['SG', 'Singapore', 5], ['KR', 'South Korea', 5], ['LK', 'Sri Lanka', 5], ['PS', 'Palestine', 5],
    ['SY', 'Syria', 5], ['TJ', 'Tajikistan', 5], ['TH', 'Thailand', 5], ['TL', 'Timor-Leste', 5], ['TR', 'Turkey', 5],
    ['TM', 'Turkmenistan', 5], ['AE', 'UAE', 5], ['UZ', 'Uzbekistan', 5], ['VN', 'Vietnam', 5], ['YE', 'Yemen', 5],
    // The Americas
    ['AG', 'Antigua & Barbuda', 6], ['BS', 'Bahamas', 6], ['BB', 'Barbados', 6], ['BZ', 'Belize', 6], ['CA', 'Canada', 6],
    ['CR', 'Costa Rica', 6], ['CU', 'Cuba', 6], ['DM', 'Dominica', 6], ['DO', 'Dom. Republic', 6], ['SV', 'El Salvador', 6],
    ['GD', 'Grenada', 6], ['GT', 'Guatemala', 6], ['HT', 'Haiti', 6], ['HN', 'Honduras', 6], ['JM', 'Jamaica', 6],
    ['MX', 'Mexico', 6], ['NI', 'Nicaragua', 6], ['PA', 'Panama', 6], ['KN', 'St Kitts & Nevis', 6], ['LC', 'St Lucia', 6],
    ['VC', 'St Vincent', 6], ['TT', 'Trinidad & Tobago', 6], ['US', 'United States', 6],
    ['AR', 'Argentina', 6], ['BO', 'Bolivia', 6], ['BR', 'Brazil', 6], ['CL', 'Chile', 6], ['CO', 'Colombia', 6],
    ['EC', 'Ecuador', 6], ['GY', 'Guyana', 6], ['PY', 'Paraguay', 6], ['PE', 'Peru', 6], ['SR', 'Suriname', 6],
    ['UY', 'Uruguay', 6], ['VE', 'Venezuela', 6],
    // Oceania
    ['AU', 'Australia', 7], ['FJ', 'Fiji', 7], ['KI', 'Kiribati', 7], ['MH', 'Marshall Is.', 7], ['FM', 'Micronesia', 7],
    ['NR', 'Nauru', 7], ['NZ', 'New Zealand', 7], ['PW', 'Palau', 7], ['PG', 'Papua New Guinea', 7], ['WS', 'Samoa', 7],
    ['SB', 'Solomon Is.', 7], ['TO', 'Tonga', 7], ['TV', 'Tuvalu', 7], ['VU', 'Vanuatu', 7],
  ];
  const flagOf = (code) =>
    String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1F1E6 + c.charCodeAt(0) - 65));
  // the national schools keep their own flags; every other nation draws a
  // playing style by a steady hash of its code, so the world stays varied
  const HOME_STYLE = { TZ: 'tanzanian', KE: 'kenyan', IT: 'italian', BR: 'brazilian', GB: 'english', CZ: 'czech', RU: 'russian', US: 'american', ES: 'spanish', FR: 'french', MN: 'mongolian' };
  const STYLE_IDS = STYLES.map((s) => s.id);
  const styleHash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  const ROSTER = NATION_DATA.map(([id, name, band]) => ({
    id, name, band, face: flagOf(id),
    styleId: HOME_STYLE[id] || STYLE_IDS[Math.abs(styleHash(id + name)) % STYLE_IDS.length],
  }));
  const rosterById = (id) => ROSTER.find((r) => r.id === id) || ROSTER[0];

  // flag colours: every nation's pieces are dressed in the colours of its
  // own flag — [main, secondary] taken straight off the real thing. The main
  // colour leads the champion's (ivory) seat, the secondary is the first
  // fallback when two flags would blur together; the resolver below sorts
  // out the rest, so Ivory Coast never plays Ecuador in an identical green.
  const FLAG_COLORS = {
    TZ:['#1EB53A','#00A3DD'], KE:['#000000','#BB0000'],
    UG:['#FCDC04','#D90000'], RW:['#00A3E0','#FAD201'], BI:['#C8102E','#43B02A'],
    SS:['#00914C','#E22028'], SO:['#418FDE','#FFFFFF'], CD:['#007FFF','#F7D618'],
    ET:['#078930','#FCDD09'], ER:['#43B02A','#418FDE'], DJ:['#6AB2E7','#12AD2B'],
    EG:['#C8102E','#FFCD00'], LY:['#239E46','#E70013'], TN:['#E70013','#FFFFFF'],
    DZ:['#006633','#FFFFFF'], MA:['#C1272D','#006233'], SD:['#D21034','#007229'],
    MR:['#00A95C','#D01C1F'], ML:['#14B53A','#FCD116'], NE:['#E05206','#0DB02B'],
    TD:['#002664','#FECB00'], SN:['#00853F','#FDEF42'], GM:['#CE1126','#3A7728'],
    GW:['#CE1126','#FCD116'], GN:['#CE1126','#009460'], SL:['#1EB53A','#0072C6'],
    LR:['#00205B','#BF0A30'], CI:['#FF8200','#009A44'], GH:['#CE1126','#006B3F'],
    TG:['#006A4E','#FFCE00'], BJ:['#008751','#FCD116'], BF:['#EF2B2D','#009E49'],
    NG:['#008751','#FFFFFF'], CM:['#007A5E','#CE1126'], CF:['#289728','#FFCE00'],
    GQ:['#3E9A00','#E32118'], GA:['#009E60','#3A75C4'], CG:['#009739','#DC241F'],
    ST:['#009739','#FFD100'], AO:['#CC092F','#FFCB00'], ZM:['#147F55','#F99815'],
    ZW:['#006400','#FFD200'], MW:['#008C51','#C7361E'], MZ:['#007168','#FCE100'],
    NA:['#002F6C','#009A44'], BW:['#6DA9D2','#000000'], ZA:['#007749','#FFB81C'],
    LS:['#001489','#009A44'], SZ:['#B10C0C','#FFD900'], MG:['#00843D','#F9423A'],
    MU:['#2D3359','#F7B718'], SC:['#002F6C','#FED141'], KM:['#009639','#FFD100'],
    CV:['#003893','#CF2027'],
    AL:['#FF0000','#000000'], AD:['#10069F','#FEDD00'], AT:['#C8102E','#FFFFFF'],
    BY:['#CE1720','#007C30'], BE:['#EF3340','#FDDA25'], BA:['#002395','#FECB00'],
    BG:['#00966E','#D62612'], HR:['#FF0000','#171796'], CY:['#D67900','#FFFFFF'],
    CZ:['#D7141A','#11457E'], DK:['#C8102E','#FFFFFF'], EE:['#0072CE','#000000'],
    FI:['#002F6C','#FFFFFF'], FR:['#002654','#CE1126'], DE:['#DD0000','#FFCE00'],
    GR:['#0D5EAF','#FFFFFF'], HU:['#CE2939','#477050'], IS:['#02529C','#DC1E35'],
    IE:['#169B62','#FF883E'], IT:['#009246','#CE2B37'], LV:['#9D2235','#FFFFFF'],
    LI:['#002B7F','#CE1126'], LT:['#006A44','#FDB913'], LU:['#00A3E0','#EF3340'],
    MT:['#CF142B','#FFFFFF'], MD:['#0046AE','#FFD200'], MC:['#CE1126','#FFFFFF'],
    ME:['#E30000','#FFC000'], NL:['#AE1C28','#21468B'], MK:['#D82126','#F8E92E'],
    NO:['#BA0C2F','#00205B'], PL:['#DC143C','#FFFFFF'], PT:['#006600','#FF0000'],
    RO:['#002B7F','#FCD116'], RU:['#0039A6','#D52B1E'], SM:['#5EB6E4','#FFFFFF'],
    RS:['#0C4076','#C6363C'], SK:['#254AA5','#ED1C24'], SI:['#0000FF','#FF0000'],
    ES:['#AD1519','#FABD00'], SE:['#005293','#FECB00'], CH:['#FF0000','#FFFFFF'],
    UA:['#0057B7','#FFD700'], GB:['#012169','#C8102E'],
    AF:['#000000','#FFFFFF'], AM:['#D90012','#F2A800'], AZ:['#00B5E2','#509E2F'],
    BH:['#DA291C','#FFFFFF'], BD:['#006747','#DA291C'], BT:['#FF671F','#FFCD00'],
    BN:['#F7E017','#CF1126'], KH:['#032EA1','#E00025'], CN:['#EE1C25','#FFFF00'],
    GE:['#FF0000','#FFFFFF'], IN:['#046A38','#FF6820'], ID:['#FF0000','#FFFFFF'],
    IR:['#239F40','#DA0000'], IQ:['#CD1125','#017B3D'], IL:['#0038B8','#FFFFFF'],
    JP:['#BC002D','#FFFFFF'], JO:['#CE1126','#007A3D'], KZ:['#00ABC2','#FFEC2D'],
    KW:['#007A3D','#CE1126'], KG:['#FF0000','#FFFF00'], LA:['#002868','#CE1126'],
    LB:['#D31624','#008C3E'], MY:['#000066','#CC0000'], MV:['#007E3A','#D21034'],
    MN:['#0066B2','#DA2031'], MM:['#34B233','#EA2839'], NP:['#DC143C','#003893'],
    KP:['#EC1D25','#034DA2'], OM:['#DF1A23','#007E3C'], PK:['#01411C','#FFFFFF'],
    PH:['#0038A8','#CE1126'], QA:['#8A1538','#FFFFFF'], SA:['#005430','#FFFFFF'],
    SG:['#ED2939','#FFFFFF'], KR:['#CD2E3A','#0047A0'], LK:['#8D153A','#FFBE29'],
    PS:['#009639','#ED2E38'], SY:['#007A3D','#FFFFFF'], TJ:['#197B30','#DC161D'],
    TH:['#2D2A4A','#A51931'], TL:['#DA291C','#FFC72C'], TR:['#E30A17','#FFFFFF'],
    TM:['#00843D','#D22630'], AE:['#00843D','#C8102E'], UZ:['#0099B5','#1EB53A'],
    VN:['#DA251D','#FFFF00'], YE:['#CE1126','#000000'],
    AG:['#0072C6','#FCD116'], BS:['#00778B','#FFC72C'], BB:['#1F367C','#F3B100'],
    BZ:['#171696','#D90F19'], CA:['#FF0000','#FFFFFF'], CR:['#001489','#DA291C'],
    CU:['#002A8F','#CB1515'], DM:['#046A38','#FFCD00'], DO:['#002D62','#CE1126'],
    SV:['#0047AB','#FFFFFF'], GD:['#007A5E','#CE1126'], GT:['#4997D0','#FFFFFF'],
    HT:['#00209F','#D21034'], HN:['#0D3B99','#FFFFFF'], JM:['#007749','#FFB81C'],
    MX:['#006847','#CE1126'], NI:['#0067C6','#FFFFFF'], PA:['#072357','#DA121A'],
    KN:['#009739','#C8102E'], LC:['#66CCFF','#FCD116'], VC:['#002674','#007C2E'],
    TT:['#DA1A35','#000000'], US:['#B31942','#0A3161'],
    AR:['#74ACDF','#F6B40E'], BO:['#007934','#F9E300'], BR:['#009440','#FFCB00'],
    CL:['#0032A0','#DA291C'], CO:['#FFCD00','#003087'], EC:['#034EA2','#FFDD00'],
    GY:['#2A936A','#FFC20E'], PY:['#0038A8','#D52B1E'], PE:['#D91023','#FFFFFF'],
    SR:['#377E3F','#ECC81D'], UY:['#0038A8','#FCD116'], VE:['#00247D','#FFCC00'],
    AU:['#00008B','#FF0000'], FJ:['#62B5E5','#C8102E'], KI:['#C81010','#183070'],
    MH:['#003893','#DD7500'], FM:['#75B2DD','#FFFFFF'], NR:['#012169','#FFC72C'],
    NZ:['#012169','#C8102E'], PW:['#0099FF','#FFFF00'], PG:['#C8102E','#000000'],
    WS:['#CE1126','#002B7F'], SB:['#215B33','#0051BA'], TO:['#C10000','#FFFFFF'],
    TV:['#009CDE','#FFFFFF'], VU:['#009543','#D21034'],
  };
  // ---- small colour toolkit: mixing, relative luminance, closeness ----
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgbHex = (r, g, b) => '#' + [r, g, b].map((v) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mixC = (h, to, t) => {
    const a = hexRgb(h), b = to === '#ffffff' ? [255, 255, 255] : [0, 0, 0];
    return rgbHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  };
  const linC = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  const lumaC = (h) => { const c = hexRgb(h); return .2126 * linC(c[0]) + .7152 * linC(c[1]) + .0722 * linC(c[2]); };
  // flags never disappear into the table: too-dark or too-bright mains are
  // pulled back into a band every board theme can show
  const clampLuma = (h, lo, hi) => {
    let c = h;
    for (let i = 0; i < 14 && lumaC(c) < lo; i++) c = mixC(c, '#ffffff', .14);
    for (let i = 0; i < 14 && lumaC(c) > hi; i++) c = mixC(c, '#000000', .14);
    return c;
  };
  const colorClose = (h1, h2) => {
    const a = hexRgb(h1), b = hexRgb(h2);
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 150 &&
      Math.abs(lumaC(h1) - lumaC(h2)) < .13;
  };

  // every nation's name is the crowd's to change: tap a chip in the drawer
  // and type. Overrides live in their own store so the arena keeps working.
  const NAMES_KEY = 'drafti.names.v1';
  const nameOverrides = loadJSON(NAMES_KEY, {}) || {};
  for (const k of Object.keys(nameOverrides)) {
    if (!ROSTER.some((r) => r.id === k)) delete nameOverrides[k];
  }
  const saveNames = () => saveJSON(NAMES_KEY, nameOverrides);
  const aiName = (id) => {
    const r = rosterById(id);
    const v = nameOverrides[id];
    return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 18) : r.name;
  };
  // the colour law of the arena: a seat keeps its flag colours only while it
  // carries its country's name. Rename a nation to anything else and its
  // pieces return to the classic colours; restoring the name — or pressing
  // the restore button in The players — brings the flag straight back.
  const customNamed = (id) => {
    const v = nameOverrides[id];
    return typeof v === 'string' && v.trim() && v.trim() !== rosterById(id).name;
  };
  // the full piece wardrobe for one main colour: highlight, body, shade,
  // edge, crown fill, glow and the ready-made radial gradient
  const sideVarSet = (main) => {
    const up = mixC(main, '#ffffff', .42), dn = mixC(main, '#000000', .34);
    return {
      1: up, 2: main, 3: dn,
      edge: mixC(main, '#000000', .55),
      deep: lumaC(main) > .18 ? '#101010' : '#ffffff',
      glow: 'rgba(' + hexRgb(main).join(',') + ',.5)',
      bg: 'radial-gradient(circle at 35% 28%, ' + up + ', ' + main + ' 55%, ' + dn + ')',
    };
  };
  // pick each seat's flag colour so the two sides never blur together: the
  // champion leads with its main, the challenger switches to its secondary
  // when the mains are near-identical, and as a last resort the two are
  // pulled apart in lightness. Same-colour flags (Indonesia vs Monaco) end
  // up red versus white, never red versus red.
  function flagPalettes() {
    if (G.mode === 'aivai' && !(G.nationalMatch ?? settings.aivaiAuto)) return [null, null];
    if (G.mode === 'aivai' ? settings.arenaFlags === false : !settings.humanFlags) return [null, null];
    const pick = (id, side, avoid) => {
      if (!ROSTER.some((r) => r.id === id) || customNamed(id)) return null;
      const f = FLAG_COLORS[id];
      if (!f) return null;
      const cands = [f[0], f[1]];
      const dist = (h) => { const a = hexRgb(h), b = hexRgb(avoid || h);
        return avoid ? Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) : 1e9; };
      let c = clampLuma(cands[0], .035, .88);
      // two greens never make a bout: take the flag's other colour when it
      // reads clearly more distinct, then split lightness if still close
      if (avoid && colorClose(c, avoid) && cands[1] && dist(cands[1]) > dist(cands[0]) + 120) c = clampLuma(cands[1], .035, .88);
      if (avoid && colorClose(c, avoid)) {
        // Preserve the flag hue while moving away from the other seat's
        // luminance. Recheck after each step: a single shift can still clash.
        const target = lumaC(avoid) < .35 ? '#ffffff' : '#000000';
        for (let step = 0; step < 12 && colorClose(c, avoid); step++) {
          c = mixC(c, target, .22);
        }
      }
      return c;
    };
    const a = pick(G.mode === "aivai" ? G.seatIvory : presentation.nationIvory, IVORY, null);
    const b = pick(G.mode === "aivai" ? G.seatEbony : presentation.nationEbony, EBONY, a);
    return [a ? sideVarSet(a) : null, b ? sideVarSet(b) : null];
  }
  // write the palettes onto <body> as --side-a-*/--side-b-* custom
  // properties; CSS (body.flags-on) paints pieces, dots, trays and dots in
  // the move log from them, always falling back to the theme when absent
  function applyFlagPalettes() {
    const [a, b] = flagPalettes();
    document.body.classList.toggle('flags-on', !!(a || b));
    const st = document.body.style;
    for (const [side, set] of [['a', a], ['b', b]]) {
      for (const k of ['1', '2', '3', 'edge', 'deep', 'glow', 'bg']) {
        const name = '--side-' + side + '-' + k;
        if (set && set[k] != null) st.setProperty(name, set[k]);
        else st.removeProperty(name);
      }
    }
  }

  // ---------------- seasons, experience, the challenge ladder ----------------
  const ARENA_KEY = 'drafti.arena.v2'; // v1 held the old ten-club personas
  const SEASON_LEN = 12;               // bouts per season — then the world steps up
  // a season is a tournament: five bouts of group stage, then the knockout
  // carries the champion through quarter-finals and semi-finals to the
  // grand final. Every step-up is announced as it begins.
  const SEASON_STAGES = [
    { first: 0, name: 'group stage' },
    { first: 5, name: 'quarter-finals' },
    { first: 9, name: 'semi-finals' },
    { first: 11, name: 'grand final' },
  ];
  const stageOfBout = (boutIx) => {
    let s = 0;
    for (let i = 0; i < SEASON_STAGES.length; i++) if (boutIx >= SEASON_STAGES[i].first) s = i;
    return s;
  };
  const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  // experience: a game played teaches (+2), a win teaches a little more (+3),
  // a defeat teaches the most (+4) — so a beaten nation comes back stronger
  // and no one stays on top forever. Five points = one rung on the 1-10
  // ladder, and each new season every nation climbs one more rung.
  const rosterLevel = (id) =>
    Math.min(10, Math.max(4, LEVEL_IDS.indexOf(settings.diff) + 1 || 4) + Math.floor((arena.xp[id] || 0) / 5) + (arena.season - 1));
  // the challenge ladder, in the order the world comes calling: the rivalry
  // first, then East Africa, Africa, and the continents beyond — shuffled
  // inside each band so the visit order never goes stale
  function ladderQueue(excludeId) {
    const out = [];
    for (const band of [1, 2, 3, 4, 5, 6, 7, 0]) {
      const bandIds = ROSTER.filter((r) => r.band === band && r.id !== excludeId).map((r) => r.id);
      for (let i = bandIds.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = bandIds[i]; bandIds[i] = bandIds[j]; bandIds[j] = t;
      }
      out.push(...bandIds);
    }
    return out;
  }
  let arena = loadJSON(ARENA_KEY, null);
  if (!arena || !ROSTER.some((r) => r.id === arena.champion)) {
    arena = { champion: 'TZ', queue: ladderQueue('TZ'), appeared: [], season: 1, bouts: 0,
      xp: {}, wins: {}, streak: 0, challRounds: 0 };
  }
  // the one law of the arena: two different nations on the board, always.
  // guardArena() runs before every seat pick and repairs anything broken —
  // ids from older saves, duplicates, an emptied queue, a challenger that
  // mirrors the champion (the bug that once seated Simba against Simba).
  function guardArena() {
    if(!arena.xp || typeof arena.xp!=='object')arena.xp={};
    if(!arena.wins || typeof arena.wins!=='object')arena.wins={};
    const ids = new Set(ROSTER.map((r) => r.id));
    if (!ids.has(arena.champion)) arena.champion = ROSTER[0].id;
    const seen = new Set();
    arena.queue = (Array.isArray(arena.queue) ? arena.queue : [])
      .filter((id) => ids.has(id) && id !== arena.champion && !seen.has(id) && seen.add(id));
    if (!arena.queue.length || arena.queue[0] === arena.champion) {
      arena.queue = ladderQueue(arena.champion);
    }
    arena.appeared = (Array.isArray(arena.appeared) ? arena.appeared : []).filter((id) => ids.has(id));
    if (!arena.meetings || typeof arena.meetings !== 'object') arena.meetings = {};
    for (const k of Object.keys(arena.meetings)) {
      if (typeof arena.meetings[k] !== 'number' || arena.meetings[k] < 0) delete arena.meetings[k];
    }
    if (!arena.appeared.includes(arena.champion)) arena.appeared.push(arena.champion);
    if (typeof arena.season !== 'number' || arena.season < 1) arena.season = 1;
    if (typeof arena.bouts !== 'number' || arena.bouts < 0 || arena.bouts >= SEASON_LEN) arena.bouts = 0;
    if (typeof arena.challRounds !== 'number' || arena.challRounds < 0) arena.challRounds = 0;
    if (typeof arena.streak !== 'number' || arena.streak < 0) arena.streak = 0;
    for (const r of ROSTER) {
      if (typeof arena.xp[r.id] !== 'number') arena.xp[r.id] = 0;
      if (typeof arena.wins[r.id] !== 'number') arena.wins[r.id] = 0;
    }
  }
  guardArena();
  const saveArena = () => saveJSON(ARENA_KEY, arena);
  const ARENA_PROGRESS_KEY = 'drafti.arena-progress.v1';
  const arenaProgress = loadJSON(ARENA_PROGRESS_KEY, {}) || {};
  if (!arenaProgress.bonusXp || typeof arenaProgress.bonusXp !== 'object') arenaProgress.bonusXp = {};
  function arenaSeatLevels(a, b) {
    const left = rosterLevel(a), right = rosterLevel(b), strongest = Math.max(left, right);
    return [Math.max(left, strongest - 2), Math.max(right, strongest - 2)];
  }
  function arenaPairColourHistory() {
    if(!arenaProgress.lastIvoryByPair||typeof arenaProgress.lastIvoryByPair!=='object'||Array.isArray(arenaProgress.lastIvoryByPair))arenaProgress.lastIvoryByPair={};
    return arenaProgress.lastIvoryByPair;
  }
  function rememberResumedPairColours(ivory,ebony) {
    const key=[ivory,ebony].sort().join('|'),colours=arenaPairColourHistory();
    if(![ivory,ebony].includes(colours[key])){
      colours[key]=ivory;
      saveJSON(ARENA_PROGRESS_KEY,arenaProgress);
    }
  }
  function seatArenaBout() {
    guardArena();
    G.arenaSeason = arena.season; G.arenaBout = arena.bouts;
    const champion = arena.champion, challenger = arena.queue[0];
    // First encounters use the tournament's alternating host colour. Once
    // two countries have met, reverse their last colours even if the title
    // changed hands or an odd number of other bouts happened in between.
    // Alternating only the host could otherwise give one pair the same
    // physical colours repeatedly after an upset.
    const hostIvory = ((arena.season - 1) * SEASON_LEN + arena.bouts) % 2 === 0;
    const pairKey = [champion,challenger].sort().join('|');
    const lastIvory = arenaPairColourHistory()[pairKey];
    G.seatIvory = lastIvory === champion ? challenger : lastIvory === challenger ? champion : hostIvory ? champion : challenger;
    G.seatEbony = G.seatIvory === champion ? challenger : champion;
    const levels = arenaSeatLevels(G.seatIvory, G.seatEbony);
    G.diffIvory = LEVEL_IDS[levels[0] - 1]; G.diffEbony = LEVEL_IDS[levels[1] - 1];
    G.pairKey = [G.seatIvory, G.seatEbony].sort().join('|');
    G.pairMeets = (arena.meetings[G.pairKey] || 0) + 1;
    arena.meetings[G.pairKey] = G.pairMeets;
    arenaProgress.lastIvoryByPair[pairKey] = G.seatIvory;
    saveJSON(ARENA_PROGRESS_KEY,arenaProgress);
    for (const id of [G.seatIvory, G.seatEbony]) if (!arena.appeared.includes(id)) arena.appeared.push(id);
    saveArena();
  }
  let arenaProgressSignature = '';
  function renderArenaProgress() {
    const tbody = $('arenaProgressRows'); if (!tbody) return;
    const signature = JSON.stringify([arena.season, settings.diff, arena.xp, arena.wins, arenaProgress.bonusXp, nameOverrides]);
    if (signature === arenaProgressSignature) return;
    arenaProgressSignature = signature;
    tbody.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (const nation of ROSTER) {
      const row = document.createElement('tr');
      for (const value of [aiName(nation.id), rosterLevel(nation.id), arena.xp[nation.id], arena.wins[nation.id], arenaProgress.bonusXp[nation.id] || 0]) {
        const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell);
      }
      fragment.appendChild(row);
    }
    tbody.appendChild(fragment);
    $('arenaProgressCaption').textContent = 'Season ' + arena.season + ' · starting strength ' + Math.max(4,LEVEL_IDS.indexOf(settings.diff)+1||4) + ' · ' + ROSTER.length + ' nations · event bonuses tracked from this update';
  }

  // the name chips: tap one, type the new name, Enter or blur commits. The
  // grid opens on the teams in play — the host and the next challengers in
  // line — and one tap lists every nation on earth, each of them renameable.
  let namesExpanded = false;
  function nameChip(r) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'name-chip';
    b.title = 'Tap to rename';
    b.appendChild(document.createTextNode(r.face + ' '));
    b.appendChild(document.createTextNode(aiName(r.id)));
    b.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.className = 'name-edit';
      inp.maxLength = 18;
      inp.value = aiName(r.id);
      inp.setAttribute('aria-label', 'Rename ' + aiName(r.id));
      b.replaceWith(inp);
      inp.focus();
      inp.select();
      let done = false;
      const commit = () => {
        if (done) return;
        done = true;
        const v = inp.value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 18);
        if (!v || v === r.name) delete nameOverrides[r.id];
        else nameOverrides[r.id] = v;
        saveNames();
        renderNameGrid();
        updateAll();
      };
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') inp.blur();
        else if (e.key === 'Escape') { done = true; renderNameGrid(); }
      });
      inp.addEventListener('blur', commit);
    });
    return b;
  }
  function renderNameGrid() {
    const grid = $('nameGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const list = namesExpanded
      ? ROSTER.slice().sort((a, b) => a.band - b.band || a.name.localeCompare(b.name))
      : [rosterById(arena.champion)].concat(arena.queue.slice(0, 11).map((id) => rosterById(id)));
    for (const r of list) grid.appendChild(nameChip(r));
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'name-chip name-more';
    more.textContent = namesExpanded
      ? '− back to the teams in play'
      : '+ all ' + ROSTER.length + ' nations…';
    more.addEventListener('click', () => { namesExpanded = !namesExpanded; renderNameGrid(); });
    grid.appendChild(more);
    // the way back: one button restores every country name — and with the
    // names, every nation's flag colours return to the board
    const rst = $('btnNameReset');
    if (rst) rst.disabled = !Object.keys(nameOverrides).length;
  }

  // Which personality drives the engine currently thinking? `side` is the
  // side the ENGINE is searching for. Hotseat has no engines.
  function styleForSide(side) {
    if (G.mode === 'ai') return side === G.humanSide ? null : styleById(settings.style);
    if (G.mode === 'aivai') {
      // the arena roster owns the seats when auto-rematch runs; otherwise the
      // hand-picked schools from the menu play
      if (arenaOn()) return styleById(rosterById(side === IVORY ? G.seatIvory : G.seatEbony).styleId);
      return styleById(side === IVORY ? settings.styleIvory : settings.styleEbony);
    }
    return null;
  }

  // ---------------- persistence ----------------
  const SETTINGS_KEY = 'drafti.settings.v1';
  const DEFAULT_THEME = 'marble';
  const STATS_KEY = 'drafti.stats.v1';
  function loadJSON(k, fb) {
    if (['drafti.arena.v2','drafti.arena-progress.v1','drafti.stats.v1','drafti.match.v1','drafti.learning.v1','drafti.human-ladder.v1'].includes(k)) return playerProgress.load(k,fb);
    try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : fb; } catch { return fb; }
  }
  function saveJSON(k, v, extra) {
    if (playerProgress.routes(k)) {
      const saved=k === 'drafti.arena.v2' && G.over && G.mode === 'aivai'
        ? playerProgress.saveBundle({[k]:v,'drafti.match.v1':null})
        : extra ? playerProgress.saveBundle({[k]:v,...extra}) : playerProgress.save(k,v);
      if(!saved && playerProgress.lastError()==='conflict' && !G.progressConflict){
        G.progressConflict=true;G.aiPaused=true;gameEpoch++;reqId++;aiPending=false;hintPending=false;
        if(worker){worker.terminate();worker=null;}FX.thinkStop();
        flashWhisper('This player’s progress changed in another game. Use Reload saved league in The players to continue.');
      }
      return;
    }
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode etc. */ }
  }

  const settings = Object.assign(
    { rsId: 'eastafrica8', mode: 'ai', diff: 'l1', humanSide: IVORY, sound: true, rotate: true, theme: DEFAULT_THEME, clock: 0, speed: 1, hv: false, ambient: true, style: 'classic', styleIvory: 'italian', styleEbony: 'czech', pname: 'Uhakika', pname2: 'Usiogope', aivaiAuto: true, jumpPaths: true, shake: true, pieces: 'theme', arenaRounds: 1, humanlike: false, streamer: 'off' },
    loadJSON(SETTINGS_KEY, {})
  );
  if (settings.streamer !== 'female' && settings.streamer !== 'male' && settings.streamer !== 'funny') settings.streamer = 'off';
  // New setups default to East Africa 10x10; saved rule choices stay intact.
  if (!E.RULESETS[settings.rsId]) settings.rsId = 'eastafrica10';
  if (settings.mode !== 'ai' && settings.mode !== 'hotseat' && settings.mode !== 'aivai') settings.mode = 'ai';
  // difficulty ladder: migrate the old three strengths onto the new rungs
  const OLD_DIFF = { easy: 'l2', medium: 'l5', hard: 'l7' };
  if (OLD_DIFF[settings.diff]) settings.diff = OLD_DIFF[settings.diff];
  if (!LEVELS[settings.diff]) settings.diff = 'l5';
  if (!STYLES.some((s) => s.id === settings.style)) settings.style = 'classic';
  if (!STYLES.some((s) => s.id === settings.styleIvory)) settings.styleIvory = 'italian';
  if (!STYLES.some((s) => s.id === settings.styleEbony)) settings.styleEbony = 'czech';
  if (![0, 30, 60, 90].includes(settings.clock)) settings.clock = 0;
  if (![1, 2, 4, 6, 8, 10, 16].includes(settings.speed)) settings.speed = 1;
  settings.audienceEnabled = settings.audienceEnabled === true;
  settings.audienceVolume = Number.isFinite(settings.audienceVolume) ? Math.max(0,Math.min(1,settings.audienceVolume)) : .35;
  settings.sfx = Object.assign(
    { master: 0.9, animals: true, judge: true, comedy: true, voice: true, classic: true, think: true, ui: true, drama: true, party: true },
    (settings.sfx && typeof settings.sfx === 'object') ? settings.sfx : {}
  );
  // player names: short, non-empty, one line
  const cleanName = (v, fb) => {
    const s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 18);
    return s || fb;
  };
  // Migrate only the old shipped defaults; custom names remain the player's.
  if (settings.pname === 'UHAKIKA') settings.pname = 'Uhakika';
  if (settings.pname2 === 'Challenger') settings.pname2 = 'Usiogope';
  settings.pname = cleanName(settings.pname, 'Uhakika');
  settings.pname2 = cleanName(settings.pname2, 'Usiogope');
  if (![1, 2, 3, 4, 5].includes(settings.arenaRounds)) settings.arenaRounds = 1;
  settings.humanlike = !!settings.humanlike;

  const PRESENTATION_KEY = 'drafti.presentation.v1';
  const presentation = Object.assign({ nationIvory: 'TZ', nationEbony: 'KE', stream: false }, loadJSON(PRESENTATION_KEY, {}));

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
    '--sq-dark-hi': '#132436', '--sq-dark': '#0d1b2c', '--sq-dark-lo': '#081320',
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
    T('mono', 'Porcelain & Obsidian', null, {
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
    // ---- researched tables: tournament & club standards ----
    // The ACF tournament set: green & buff 2-inch squares; club tables dress
    // baize with a wooden frame; pro boards are maple & rosewood; travel sets
    // are the classic rolled magnetic board.
    T('greenbuff', 'Tournament Green', 'wood', {
      '--bg-image': 'linear-gradient(180deg,#f4f1e6,#e9e4d2 60%,#ddd6bf)',
      '--panel': 'rgba(255,253,246,.85)', '--panel-line': 'rgba(58,98,58,.28)',
      '--modal-bg': 'linear-gradient(170deg,#fdfbf4,#ece8d6)', '--backdrop': 'rgba(45,60,45,.5)',
      '--ink': '#26321f', '--ink-dim': '#5f6e52',
      '--accent': '#3a6e42', '--accent-2': '#7a9a55',
      '--accent-soft': 'rgba(58,110,66,.5)', '--accent-weak': 'rgba(58,110,66,.1)',
      '--accent-ink': '#ffffff', '--danger': '#b8482e',
      '--frame-hi': '#5a3a22', '--frame': '#422a16', '--frame-lo': '#2e1c0d',
      '--frame-glow': 'rgba(90,58,34,.25)',
      '--sq-light-hi': '#f4e6ba', '--sq-light': '#eddaa4', '--sq-light-lo': '#e0cb8e',
      '--sq-dark-hi': '#4d8054', '--sq-dark': '#437348', '--sq-dark-lo': '#38633c',
      '--grid-line': 'transparent',
      '--sqnum-l': 'rgba(35,65,40,.55)', '--sqnum-d': 'rgba(245,238,214,.6)',
      '--pl-l-1': '#ffffff', '--pl-l-2': '#f4efe4', '--pl-l-3': '#d9d2c0',
      '--pl-l-edge': '#9a927c', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#c04a42', '--pl-d-2': '#9c3028', '--pl-d-3': '#6e1c16',
      '--pl-d-edge': '#3d0e0a', '--pl-d-glow': GLOW0,
    }),
    T('maplewood', 'Maple & Rosewood', 'wood', {
      '--bg-image': 'linear-gradient(180deg,#f6ead2,#eddfc0 60%,#e3d2ac)',
      '--panel': 'rgba(252,246,234,.86)', '--panel-line': 'rgba(122,74,40,.3)',
      '--modal-bg': 'linear-gradient(170deg,#fdf7ea,#f0e4cc)', '--backdrop': 'rgba(70,45,25,.5)',
      '--ink': '#3c2a14', '--ink-dim': '#7d6850',
      '--accent': '#a05a28', '--accent-2': '#c98a3e',
      '--accent-soft': 'rgba(160,90,40,.5)', '--accent-weak': 'rgba(160,90,40,.11)',
      '--accent-ink': '#ffffff', '--danger': '#b8482e',
      '--frame-hi': '#6a4020', '--frame': '#4e2d13', '--frame-lo': '#38200c',
      '--frame-glow': 'rgba(110,64,32,.25)',
      '--sq-light-hi': '#f0d6a4', '--sq-light': '#e8c88f', '--sq-light-lo': '#dbb87c',
      '--sq-dark-hi': '#7c462a', '--sq-dark': '#6e3b23', '--sq-dark-lo': '#5c301a',
      '--grid-line': 'transparent',
      '--sqnum-l': 'rgba(90,55,25,.55)', '--sqnum-d': 'rgba(248,238,214,.6)',
      '--pl-l-1': '#fbf3dd', '--pl-l-2': '#f2e4c2', '--pl-l-3': '#ddc795',
      '--pl-l-edge': '#a68a55', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#6b4526', '--pl-d-2': '#472c14', '--pl-d-3': '#241305',
      '--pl-d-edge': '#140a02', '--pl-d-glow': GLOW0,
    }),
    T('baize', 'Club Baize', 'wood', {
      '--bg-image': 'radial-gradient(1200px 700px at 50% -10%, #233c22 0%, #1a2e19 45%, #102010 100%)',
      '--panel': 'rgba(20,34,20,.84)', '--panel-line': 'rgba(211,169,95,.26)',
      '--modal-bg': 'linear-gradient(170deg,#24391f,#16240f)',
      '--backdrop': 'rgba(4,10,4,.72)',
      '--ink': '#eee7d0', '--ink-dim': '#a8a887',
      '--accent': '#d3a95f', '--accent-2': '#e8cf9a',
      '--accent-soft': 'rgba(211,169,95,.55)', '--accent-weak': 'rgba(211,169,95,.12)',
      '--accent-ink': '#241708', '--danger': '#c96a4a',
      '--frame-hi': '#5c3a1e', '--frame': '#422814', '--frame-lo': '#2c190a',
      '--frame-glow': 'rgba(211,169,95,.14)',
      '--sq-light-hi': '#6ba473', '--sq-light': '#5f9767', '--sq-light-lo': '#528658',
      '--sq-dark-hi': '#3c6f45', '--sq-dark': '#33613a', '--sq-dark-lo': '#285230',
      '--grid-line': 'rgba(240,240,210,.08)',
      '--sqnum-l': 'rgba(10,25,12,.65)', '--sqnum-d': 'rgba(225,240,215,.5)',
      '--pl-l-1': '#f8f2dc', '--pl-l-2': '#ecdfb8', '--pl-l-3': '#cdb986',
      '--pl-l-edge': '#8f7448', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#7a3a34', '--pl-d-2': '#54201c', '--pl-d-3': '#30100d',
      '--pl-d-edge': '#180604', '--pl-d-glow': GLOW0,
    }),
    T('travel', 'Travel Magnetic', null, {
      '--bg-image': 'linear-gradient(180deg,#f2ede0,#e6dfcc 60%,#d9d1ba)',
      '--panel': 'rgba(250,247,238,.86)', '--panel-line': 'rgba(90,90,100,.3)',
      '--modal-bg': 'linear-gradient(170deg,#fbf9f2,#ebe6d8)', '--backdrop': 'rgba(60,60,70,.45)',
      '--ink': '#33302a', '--ink-dim': '#6e6a5e',
      '--accent': '#8a6a34', '--accent-2': '#b09258',
      '--accent-soft': 'rgba(138,106,52,.5)', '--accent-weak': 'rgba(138,106,52,.1)',
      '--accent-ink': '#ffffff', '--danger': '#c05a3a',
      '--frame-hi': '#9aa0a8', '--frame': '#83898f', '--frame-lo': '#6a7076',
      '--frame-glow': 'rgba(120,126,134,.22)',
      '--sq-light-hi': '#e6d2a4', '--sq-light': '#ddc796', '--sq-light-lo': '#cfb782',
      '--sq-dark-hi': '#77694c', '--sq-dark': '#6a5c43', '--sq-dark-lo': '#5a4d36',
      '--grid-line': 'rgba(80,70,45,.14)',
      '--sqnum-l': 'rgba(60,50,25,.5)', '--sqnum-d': 'rgba(245,240,220,.6)',
      '--pl-l-1': '#f6f0da', '--pl-l-2': '#eae0c0', '--pl-l-3': '#d2c49a',
      '--pl-l-edge': '#96865c', '--pl-l-glow': GLOW0,
      '--pl-d-1': '#a34430', '--pl-d-2': '#7e2e1e', '--pl-d-3': '#541a10',
      '--pl-d-edge': '#2c0c06', '--pl-d-glow': GLOW0,
    }),
  ];
  if (!THEMES.some((t) => t.id === settings.theme)) settings.theme = DEFAULT_THEME;

  function billboardPalette(theme) {
    const parts = theme['--panel'].match(/[\d.]+/g);
    const bg = rgbHex(+parts[0], +parts[1], +parts[2]);
    const contrast = (a, b) => (Math.max(lumaC(a), lumaC(b)) + .05) / (Math.min(lumaC(a), lumaC(b)) + .05);
    const readable = (c, surfaces = [bg]) => {
      const minimum = ink => Math.min(...surfaces.map(surface => contrast(ink, surface)));
      if (/^#[\da-f]{6}$/i.test(c) && minimum(c) >= 4.5) return c;
      return minimum('#ffffff') >= minimum('#000000') ? '#ffffff' : '#000000';
    };
    // Active/hover chips retain their original translucent accent and inset
    // glow. Check text against both the plain panel and the layered accent.
    const weak = theme['--accent-weak'].match(/[\d.]+/g).map(Number), alpha = weak[3];
    const blend = a => rgbHex(...parts.slice(0,3).map((v,i) => +v * (1-a) + weak[i] * a));
    return { '--billboard-bg': bg, '--panel-opaque': bg, '--billboard-ink': readable(theme['--ink']),
      '--billboard-dim': readable(theme['--ink-dim']), '--billboard-accent': readable(theme['--accent']),
      '--underboard-active-ink': readable(theme['--accent'], [bg, blend(alpha), blend(1-(1-alpha)*(1-alpha))]) };
  }
  function applyTheme(id) {
    const t = THEMES.find((x) => x.id === id) || THEMES.find((x) => x.id === DEFAULT_THEME);
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(t.v)) root.setProperty(k, v);
    for (const [k, v] of Object.entries(billboardPalette(t.v))) root.setProperty(k, v);
    document.body.classList.toggle('fx-scan', t.fx === 'scan');
    document.body.classList.toggle('fx-glass', t.fx === 'glass');
    document.body.classList.toggle('fx-wood', t.fx === 'wood');
    const grid = $('themeGrid');
    if (grid) for (const b of grid.querySelectorAll('button')) b.classList.toggle('active', b.dataset.v === t.id);
  }

  // ---------------- piece skins ----------------
  // The look of the men, independent of the table. Grounded in the real
  // equipment: the ACF tournament set is smooth red & white 1.25-inch resin;
  // club sets are turned wood in a light and a dark stain; vintage sets were
  // butterscotch/cherry bakelite; premium sets come in brass & steel, glass
  // and stone. 'theme' keeps whatever the chosen table ships with.
  // `prev` drives the two-dot swatch in the menu.
  const PIECES = [
    { id: 'theme',    name: 'Follow table', prev: null },
    { id: 'tourney',  name: 'Tournament Red',  prev: ['#ffffff', '#a02c24'] },
    { id: 'woodturn', name: 'Turned Wood',     prev: ['#f0dfb8', '#4e2d13'] },
    { id: 'ivoryjet', name: 'Porcelain & Jet', prev: ['#f7f0df', '#17171a'] },
    { id: 'bakelite', name: 'Amber Bakelite',  prev: ['#e8b45a', '#8a1f1a'] },
    { id: 'steel',    name: 'Steel & Brass',   prev: ['#c8ccd2', '#c9a24a'] },
    { id: 'glass',    name: 'Neon Glass',      prev: ['#bdf3ff', '#ff5ad2'] },
    { id: 'stone',    name: 'Marble Stone',    prev: ['#f4f4f2', '#22252b'] },
  ];
  if (!PIECES.some((p) => p.id === settings.pieces)) settings.pieces = 'theme';

  function applyPieces(id) {
    for (const p of PIECES) document.body.classList.toggle('pieces-' + p.id, p.id === id);
    const seg = $('segPieces');
    if (seg) for (const b of seg.querySelectorAll('button')) b.classList.toggle('active', b.dataset.v === id);
  }


  const blankStats = () => ({ american: {}, international: {} });
  const stats = Object.assign(blankStats(), loadJSON(STATS_KEY, {}));
  function statEntry() {
    const s = stats[settings.rsId] || (stats[settings.rsId] = {});
    return Object.assign({ p: 0, w: 0, l: 0, d: 0, bestRun: 0, run: 0, runKind: null }, s);
  }
  function saveStats() { saveJSON(STATS_KEY, stats); }
  const HUMAN_LADDER_KEY = 'drafti.human-ladder.v1';
  let humanLadder = createHumanProgression(loadJSON(HUMAN_LADDER_KEY,null),settings.diff);
  function saveHumanLadder() { saveJSON(HUMAN_LADDER_KEY,humanLadder.snapshot()); }
  const LEARNING_KEY='drafti.learning.v1';
  let mistakeMemory=createMistakeMemory(loadJSON(LEARNING_KEY,null));
  const learningActor=side=>G.mode==='aivai'&&settings.aivaiAuto
    ? 'nation:'+(side===IVORY?G.seatIvory:G.seatEbony) : 'style:'+(styleForSide(side)||{id:'human'}).id;
  const learningPosition=(rsId,board,side)=>rsId+'|'+(side===IVORY?Array.from(board):Array.from(board).reverse().map(p=>-p)).join(',');
  const learningRoute=(move,side,size)=>move.path.map(square=>side===IVORY?square:size-1-square).join(',');

  // ---------------- sound ----------------
  const SOUND_AUDIT = typeof location !== 'undefined' && new URLSearchParams(location.search).has('audio-audit')
    ? createSoundAudit() : null;
  let auditCount;
  function audioAuditContext() {
    return { run: performance.timeOrigin, epoch: SFX_BANK.audioEpoch, at: Math.round(performance.now()),
      mode: G.mode, rsId: G.rsId, ply: G.history.length, season: G.mode === 'aivai' ? arena.season : null,
      bout: G.mode === 'aivai' ? arena.bouts : null, speed: G.aiSpeed,
      humanlike: settings.humanlike, muted: !settings.sound, seatIvory: G.seatIvory, seatEbony: G.seatEbony };
  }
  function updateAudioAuditCount() {
    if (!auditCount) return;
    const counts = SOUND_AUDIT.counts();
    auditCount.textContent = counts.sounds + ' sound starts · ' + counts.completed + ' completed games';
  }
  function recordSoundAudit(row) {
    if (!SOUND_AUDIT) return;
    SOUND_AUDIT.sound({ ...audioAuditContext(), ...row });
    updateAudioAuditCount();
  }
  function recordAudioCheckpoint(event) {
    if (!SOUND_AUDIT) return;
    SOUND_AUDIT.checkpoint({ ...audioAuditContext(), event, result: G.result });
    updateAudioAuditCount();
  }
  if (SOUND_AUDIT) {
    const panel = document.createElement('details'); panel.className = 'audio-audit-panel';
    const summary = document.createElement('summary'); summary.textContent = 'Playback report · ';
    auditCount = document.createElement('span'); summary.appendChild(auditCount); panel.appendChild(summary);
    const description = document.createElement('p');
    description.textContent = 'This preview records sound starts and finished games on this page. Show or save the report before reloading.';
    panel.appendChild(description);
    const output = document.createElement('pre'); output.id = 'audioAuditReport'; output.hidden = true;
    const show = document.createElement('button'); show.className = 'btn'; show.textContent = 'Show playback report';
    show.addEventListener('click', () => { output.textContent = JSON.stringify(SOUND_AUDIT.snapshot(), null, 2); output.hidden = false; });
    const save = document.createElement('button'); save.className = 'btn'; save.textContent = 'Save playback report';
    save.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(SOUND_AUDIT.snapshot(), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'drafti-playback.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    panel.appendChild(show); panel.appendChild(save); panel.appendChild(output); document.body.appendChild(panel);
    window.addEventListener('error', event => SOUND_AUDIT.error(event.message || 'Unspecified page error'));
    window.addEventListener('unhandledrejection', event => SOUND_AUDIT.error(event.reason?.message || String(event.reason)));
    updateAudioAuditCount();
  }

  const FX = {
    ctx: null,
    out: null,
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          this.ctx = new AC();
          this.out = this.ctx.createGain();
          this.out.gain.value = settings.sound ? settings.sfx.master : 0;
          this.out.connect(this.ctx.destination);
          if (typeof SFX_BANK !== 'undefined') SFX_BANK.decodeAll();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    setMaster(v) {
      settings.sfx.master = v;
      this.syncVolume();
    },
    syncVolume() {
      if (this.out) this.out.gain.setTargetAtTime(settings.sound ? settings.sfx.master : 0, this.ctx.currentTime, .015);
    },
    // A sparse, softly enveloped grain rustle accompanies long thoughts.
    // Short searches stay silent; there is no metronome under the pieces.
    thinkTimer: 0,
    thinkSource: null,
    breathe() {
      if (!settings.sound || !settings.sfx.think || SFX_BANK.sceneLockUntil > performance.now()) return;
      const ctx = this.ensure(); if (!ctx) return;
      const duration = 1.4, len = Math.ceil(duration * ctx.sampleRate);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate), data = buffer.getChannelData(0);
      let grain = 0;
      for (let i = 0; i < len; i++) {
        grain = .96 * grain + .04 * (Math.random() * 2 - 1);
        data[i] = grain * Math.pow(Math.sin(Math.PI * i / (len - 1)), 2);
      }
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 640;
      gain.gain.value = .035;
      source.connect(filter); filter.connect(gain); gain.connect(this.out || ctx.destination);
      this.thinkSource = source;
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect();
        if (this.thinkSource === source) this.thinkSource = null; };
      source.start();
      if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('audio-audit')) {
        const row = { id: 'synth:think-rustle', kind: 'synth', category: 'think',
          mode: G.mode, phase: G.phase, ply: G.history.length, at: Math.round(performance.now()), run: performance.timeOrigin };
        console.info('[DRAFTI audio]', JSON.stringify(row));
        if (typeof recordSoundAudit === 'function') recordSoundAudit(row);
      }
    },
    thinkStart() {
      if (this.thinkTimer) return;
      if (!settings.sound || !settings.sfx.think) return;
      if (!this.ensure()) return;
      let beats = 0;
      const beat = () => {
        if (!settings.sound || !settings.sfx.think) { FX.thinkStop(); return; }
        this.breathe();
        if (++beats === 2) STREAMER.say('long_think');
        this.thinkTimer = setTimeout(beat, 9500 + Math.random() * 4500);
      };
      this.thinkTimer = setTimeout(beat, 6000);
    },
    thinkStop() {
      if (this.thinkTimer) { clearTimeout(this.thinkTimer); this.thinkTimer = 0; }
      if (this.thinkSource) { this.thinkSource.stop(); this.thinkSource = null; }
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
          case 'hint_wink':
            this.noise(.09, .022, .22, 2100);
            this.woodKnock(.075, .95, .256);
            this.tone(660, .22, 'sine', .034, .256, 990);
            this.tone(1320, .28, 'sine', .019, .29);
            break;
          case 'move': this.woodKnock(0.105, 1); break;
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
          default: return;
        }
        if (this.ctx && typeof location !== 'undefined' && new URLSearchParams(location.search).has('audio-audit')) {
          const row = { id: 'synth:' + name, kind: 'synth', category: dramaSynth ? 'drama' : 'classic',
            mode: G.mode, phase: G.phase, ply: G.history.length, at: Math.round(performance.now()), run: performance.timeOrigin };
          console.info('[DRAFTI audio]', JSON.stringify(row));
          if (typeof recordSoundAudit === 'function') recordSoundAudit(row);
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
    recent: [],
    lastPlayed: new Map(),
    ownerMap: (window.DRAFTI_OWNER_AUDIO || {}).clips || {},
    ownerCounts: new Map(),
    ownerFamilyAt: new Map(),
    ownerFamilyCounts: new Map(),
    lastOwnerAt: -Infinity,
    fastAnimalAt: -Infinity,
    fastAnimalCount: 0,
    fastArenaAnimal(captures, remaining, promotes) {
      const speed = G.aiSpeed || 1, quota = Math.min(6, 2 + Math.floor(Math.log2(speed)));
      if (!settings.sound || !settings.sfx.animals || G.mode !== 'aivai' || speed <= 1 ||
          captures < 1 || this.fastAnimalCount >= quota) return null;
      const now = performance.now();
      if (now < this.sceneLockUntil || now - this.fastAnimalAt < Math.max(10000, 26000 / Math.sqrt(speed)) ||
          [...this.activeSources.values()].some(active => active.spoken) || Math.random() > .16 + .05 * Math.log2(speed)) return null;
      // Panic belongs to the side losing its last few pieces; powerful
      // captures get the larger animals. Quiet moves never trigger animals.
      const pool = remaining <= 3 ? ['chicken','duck']
        : captures >= 3 ? ['elephant','bear'] : captures >= 2 || promotes ? ['eagle','wildroar'] : [];
      const eligible = pool.filter(id => this.defs[id] && this.on(id) && this.buffers.has(id) && !this.recent.slice(-8).includes(id));
      if (!eligible.length) return null;
      const source = this.play(eligible[(Math.random() * eligible.length) | 0], { vol: .34, rate: 1, queue: false });
      if (source) { this.fastAnimalAt = now; this.fastAnimalCount++; }
      return source;
    },
    eventHistory: new Map(),
    eventAt: new Map(),
    activeSources: new Map(),
    lastNarratorVoice: null,
    lastNarratorMood: null,
    narratorHistory: [],
    categoryDecks: new Map(),
    categoryHistory: new Map(),
    narratorInfo(id) {
      // These families follow the recovered verbatim transcripts in
      // scripts/voice_lines.md. Alternate voices share the same joke family.
      const canonical = id.replace(/^(th_[nh]\d+)b$/, '$1');
      const engine = /^th_n(\d+)$/.exec(canonical), human = /^th_h(\d+)$/.exec(canonical);
      if (engine) {
        const n = Number(engine[1]);
        return { role: 'engine', family: canonical,
          mood: [1,13,14,17,19,23,24].includes(n) ? 'time-joke'
            : [8,9,15].includes(n) ? 'suspense' : [2,12].includes(n) ? 'patience' : 'analysis' };
      }
      if (human) return { role: 'human', family: canonical,
        mood: [1,4,6,11,14,17,18,19].includes(Number(human[1])) ? 'patience' : 'time-joke' };
      if (/^t[1-5][a-e]$/.test(id)) return { role: 'human', family: id,
        mood: id[1] === '1' ? 'patience' : ['3','4'].includes(id[1]) ? 'challenge' : 'time-joke' };
      if (id === 'later_moments' || id === 'later_hours') return { role: 'either',
        family: id === 'later_moments' ? 'th_n01' : 'th_n23', mood: 'time-joke' };
      return { role: id === 'v_time' ? 'clock' : 'either', family: id, mood: null };
    },
    narratorEligible(id, actor) {
      const info = this.narratorInfo(id);
      if (info.role === 'clock' || actor && info.role !== 'either' && info.role !== actor) return false;
      if (G.over || G.phase === 'over' || G.phase === 'animating') return false;
      if (actor === 'engine' && G.phase !== 'thinking' || actor === 'human' && (G.phase !== 'idle' || G.mode === 'aivai')) return false;
      const voice = this.defs[id]?.voice || (window.DRAFTI_VOICES || {})[id];
      return !(info.mood && (info.mood === this.lastNarratorMood || this.narratorHistory.slice(-3).includes(info.family))) &&
        !(['jam','kazi'].includes(voice) && voice === this.lastNarratorVoice);
    },
    drawCue(key, ids, actor, excluded) {
      if (!settings.sound || !ids.length) return null;
      if (actor && performance.now() < this.sceneLockUntil) return null;
      if (actor && [...this.activeSources.values()].some(active => active.spoken)) return null;
      // Each semantic pool has its own category deck. Never draw an unrelated
      // sound just because it belongs to the same broad audio category.
      if (!this.categoryDecks.has(key)) this.categoryDecks.set(key, makeDeck(ids));
      const now = performance.now(), windowSize = Math.min(3, ids.length - 1);
      const eligible = id => {
        const def = this.defs[id];
        return def && this.on(id) && this.buffers.has(id) && (now >= this.sceneLockUntil || def.c === 'ui') && !(excluded || []).includes(id) &&
          (def.c === 'ui' || !this.recent.slice(-5).includes(id)) &&
          now - (this.lastPlayed.get(id) ?? -Infinity) >= (def.c === 'ui' ? 150 : 8000) &&
          (!actor || this.narratorEligible(id, actor));
      };
      const deck = this.categoryDecks.get(key);
      // Prefer category freshness, but do not strand an event when overlapping
      // pools cover every variant. Clip cooldowns, event history and narrator
      // meaning/voice/mood guards remain hard gates in the second draw too.
      return deck(id => eligible(id) && !(windowSize &&
        (this.categoryHistory.get(this.defs[id].c) || []).slice(-windowSize).includes(id))) || deck(eligible);
    },
    queue: [],
    audioEpoch: 0,
    queuePosition() {
      return { ply: G.history?.length, side: G.side, over: !!G.over };
    },
    drainQueue() {
      const now = performance.now();
      const position = this.queuePosition();
      this.queue = this.queue.filter(item => item.epoch === this.audioEpoch && now - item.at < 3500 &&
        item.position.ply === position.ply && item.position.side === position.side && item.position.over === position.over);
      this.queue.sort((a,b) => b.priority - a.priority);
      if ([...this.activeSources.values()].some(active => active.spoken)) return;
      const next = this.queue.shift();
      if (next) this.play(next.name, { ...next.opts, queued: true });
    },
    effect(event, opts) {
      opts = opts || {};
      const now = performance.now(), rest = ['landing','jump','impact','slide','king_glint'].includes(event) ? 120 : event === 'countdown' ? 700 : 1200;
      if (now - (this.eventAt.get(event) ?? -Infinity) < rest) return null;
      const history = this.eventHistory.get(event) || [];
      const pool = Object.keys(this.defs).filter(id => this.defs[id].event === event);
      const id = this.drawCue('effect:' + event, pool, null, history.slice(-3));
      if (!id) return null;
      const source = this.play(id, { vol: opts.vol ?? .42, rate: 1 });
      if (source) { this.eventAt.set(event, now); history.push(id); this.eventHistory.set(event, history.slice(-8)); }
      return source;
    },
    audition(id) {
      if (!this.ownerMap[id]) return null;
      return this.play(id, { vol: .5, rate: 1 });
    },
    resetGame() {
      this.audienceReset?.();
      this.fastAnimalCount = 0;
      this.ownerCounts.clear(); this.ownerFamilyCounts.clear(); this.queue.length = 0; this.audioEpoch++;
      for (const source of this.activeSources.keys()) { try { source.stop(); } catch {} }
      this.activeSources.clear();
    },
    directOwner(event, context) {
      context = context || {};
      if (!settings.sound || G.over || G.mode === 'aivai' && G.aiSpeed > 1 || performance.now() < this.sceneLockUntil) return null;
      if (event === 'human_blunder_flagrant' && (!context.human || context.forced || context.delta < 420)) return null;
      const now = performance.now();
      if (now - this.lastOwnerAt < 18000) return null;
      const eligible = Object.entries(this.ownerMap).filter(([id, m]) => {
        if (m.event !== event || !this.on(id) || !this.buffers.has(id)) return false;
        const family = id.startsWith('laugh_baby') ? 'baby-laugh'
          : ['sorry_dontcry', 'dont_cry'].includes(id) ? 'consolation'
          : ['comic_hit', 'comic_hit_bright'].includes(id) ? 'punchline' : id;
        return (this.ownerFamilyCounts.get(family) || 0) < m.maxPerGame &&
          now - (this.ownerFamilyAt.get(family) ?? -Infinity) >= m.cooldownSec * 1000 &&
          !this.recent.slice(-8).includes(id);
      });
      if (!eligible.length) return null;
      const [id, meta] = eligible[(Math.random() * eligible.length) | 0];
      if (Math.random() >= meta.chancePerEvent) return null;
      const source = this.play(id, { vol: .58, rate: 1, queue: false });
      if (!source) return null;
      const family = id.startsWith('laugh_baby') ? 'baby-laugh'
        : ['sorry_dontcry', 'dont_cry'].includes(id) ? 'consolation'
        : ['comic_hit', 'comic_hit_bright'].includes(id) ? 'punchline' : id;
      this.ownerFamilyAt.set(family, now);
      this.ownerFamilyCounts.set(family, (this.ownerFamilyCounts.get(family) || 0) + 1);
      this.ownerCounts.set(id, (this.ownerCounts.get(id) || 0) + 1);
      this.lastOwnerAt = now;
      return source;
    },
    decoding: false,
    sceneLockUntil: 0,
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
      if (!name || !settings.sound) return null;
      if (['move','capture','select','king','illegal','undo','levelup','relief','trap_snap'].includes(name) && !this.defs[name]) return FX.play(name);
      if (!this.on(name)) return null;
      const ctx = FX.ensure(); if (!ctx) return null;
      this.decodeAll();
      const buf = this.buffers.get(name);
      if (!buf) return null;
      const now = performance.now();
      if (now < this.sceneLockUntil && this.defs[name].c !== 'ui' && !(opts && opts.sceneOwner === 'ceremony')) return null;
      const category = this.defs[name].c;
      // A delayed thinking card must not narrate a finished match or interrupt
      // the move itself. Tactical and celebration categories keep their cues.
      if (category === 'think' && (G.over || G.phase === 'over' || G.phase === 'animating')) return null;
      if ((category === 'think' || opts?.narrator) && !this.narratorEligible(name, opts?.narratorActor)) return null;
      const priority = opts && opts.sceneOwner === 'ceremony' ? 100
        : ({ majestic: 70, voice: 60, judge: 60, drama: 50, party: 40, comedy: 35, ui: 20, think: 10 }[category] || 30);
      const voice = this.defs[name].voice || (window.DRAFTI_VOICES || {})[name];
      const spoken = this.ownerMap[name]?.spoken === false ? false : !!voice || category === 'voice' || category === 'judge' ||
        ['later_moments','later_hours','tellyou','bruh','god','badboy','shrimp1','shrimp2'].includes(name);
      for (const active of this.activeSources.values()) {
        if (spoken && active.spoken && (priority < 100 || active.priority === 100)) {
          if (!(opts && (opts.queued || opts.queue === false)) && !this.queue.some(item => item.name === name)) {
            this.queue.push({ name, opts, priority, at: now, epoch: this.audioEpoch, position: this.queuePosition() });
            this.queue.sort((a,b) => b.priority - a.priority); this.queue.length = Math.min(this.queue.length, 3);
          }
          return null;
        }
        if (category === 'think' && active.priority > priority) return null;
      }
      // Narrator cards alternate the two authored voices; ceremonial originals
      // and tactical verdicts retain their exact, context-specific recordings.
      if (category === 'think' && ['jam','kazi'].includes(voice) && voice === this.lastNarratorVoice) return null;
      const cooldown = this.defs[name].c === "ui" ? 150 : 8000;
      if (now - (this.lastPlayed.get(name) ?? -Infinity) < cooldown) return null;
      if (this.defs[name].c !== "ui" && this.recent.slice(-5).includes(name)) return null;
      this.lastPlayed.set(name, now);
      this.recent.push(name);
      if (this.recent.length > 20) this.recent.shift();
      const categoryHistory = this.categoryHistory.get(category) || [];
      categoryHistory.push(name); this.categoryHistory.set(category, categoryHistory.slice(-8));
      const def = this.defs[name] || {};
      const cat = def.c || 'comedy';
      const vol = ((opts && opts.vol != null ? opts.vol : 1) *
        (this.CAT_VOL[cat] || 0.8));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = (opts && opts.rate) || (spoken ? 1 : 0.96 + Math.random() * 0.08);
      const g = ctx.createGain();
      g.gain.value = Math.max(0.0001, Math.min(1.2, vol));
      src.connect(g); g.connect(FX.out || ctx.destination);
      for (const [source, active] of this.activeSources) {
        if (active.priority < priority && (active.ambient || priority === 100)) {
          try { source.stop(); } catch {}
          this.activeSources.delete(source);
        }
      }
      this.activeSources.set(src, { priority, spoken, ambient: category === 'think' });
      src.onended = () => { this.activeSources.delete(src); src.disconnect(); g.disconnect(); this.drainQueue(); };
      if (category === 'think' || opts?.narrator) {
        if (['jam','kazi'].includes(voice)) this.lastNarratorVoice = voice;
        const info = this.narratorInfo(name);
        if (info.mood) {
          this.lastNarratorMood = info.mood;
          this.narratorHistory.push(info.family); this.narratorHistory = this.narratorHistory.slice(-8);
        }
      }
      if (opts && opts.maxDuration) src.start(0, 0, Math.min(opts.maxDuration, buf.duration));
      else src.start();
      this.audienceHook?.({spoken,priority,category});
      if (new URLSearchParams(location.search).has('audio-audit')) {
        const row = { id: name, kind: 'sample', category, priority, phase: G.phase,
          mode: G.mode, ply: G.history?.length, turnSide: G.side, at: Math.round(now), run: performance.timeOrigin,
          epoch: this.audioEpoch, spoken, voice, durationSec: Math.min(opts?.maxDuration ?? buf.duration, buf.duration) / src.playbackRate.value,
          narrator: category === 'think' || !!opts?.narrator, narratorActor: opts?.narratorActor,
          mood: this.narratorInfo(name).mood, family: this.narratorInfo(name).family };
        console.info('[DRAFTI audio]', JSON.stringify(row));
        if (typeof recordSoundAudit === 'function') recordSoundAudit(row);
      }
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
    firstStrike: false,
    // arena roster seats: which AI sits on each colour this game, and the
    // ladder rung each seat is searching at (champion vs challenger levels)
    seatIvory: arena.champion, seatEbony: arena.queue[0],
    diffIvory: settings.diff, diffEbony: settings.diff,
    pairKey: null, pairMeets: 0, // how often this matchup has happened before
  };
  // the roster arena is live whenever AI-vs-AI runs with auto-rematch
  const arenaOn = () => G.mode === 'aivai' && (G.nationalMatch ?? settings.aivaiAuto);

  const posKey = (b, s) => b.join(',') + '|' + s;
  const boardAt = (i) => G.board[i];
  const pieceAt = (sq) => G.pieces.find((p) => p.sq === sq);
  const countSide = (s) => { let n = 0; for (let i = 0; i < G.board.length; i++) if (G.board[i] * s > 0) n++; return n; };
  const sideName = (s) => (s === IVORY ? 'Uhakika' : 'Usiogope');
  // players are people: show their name where a side would feel impersonal
  const displayName = (s) => {
    if (G.mode === 'ai' && s === G.humanSide) return settings.pname;
    if (G.mode === 'hotseat') return s === IVORY ? settings.pname : settings.pname2;
    if (G.mode === 'aivai' && arenaOn()) return aiName(s === IVORY ? G.seatIvory : G.seatEbony);
    return sideName(s);
  };
  // the seat's full tag: name + face + ladder level (arena roster only)
  const seatTag = (s) => {
    if (!(G.mode === 'aivai' && arenaOn())) return displayName(s);
    const id = s === IVORY ? G.seatIvory : G.seatEbony;
    const r = rosterById(id);
    return (r.face ? r.face + ' ' : '') + aiName(id) + ' · L' + rosterLevel(id);
  };
  const humanTurn = () => !G.over && !G.progressConflict && (G.mode === 'hotseat' || G.side === G.humanSide);

  function repAdd(k) { G.repMap.set(k, (G.repMap.get(k) || 0) + 1); }
  function repRemove(k) { const v = (G.repMap.get(k) || 0) - 1; if (v <= 0) G.repMap.delete(k); else G.repMap.set(k, v); }

  // ---------------- AI worker ----------------
  let worker = null, workerBroken = false, reqId = 0, aiPending = false, hintPending = false, thinkStart = 0;
  let preparedSearch = null;
  let presentationWait = null;
  let verdictWorker = null, verdictWorkerBroken = false;
  let gameEpoch = 0;

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
        // A single legal move short-circuits the search with no rootScores —
        // rebuild a one-entry root list so forced moves still get judged.
        '    const roots = (res.rootScores && res.rootScores.length) ? res.rootScores\n' +
        '      : (res.best ? [{ m: res.best, score: res.score }] : []);\n' +
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
        '      onlyMove: roots.length <= 1, depth: res.depth };\n' +
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
        else if (preparedSearch && e.data.id === preparedSearch.id) {
          preparedSearch.result=e.data;
          if(preparedSearch.waiting){preparedSearch=null;handleSearch(e.data);}
        } else handleSearch(e.data);
      };
      worker.onerror = () => {
        workerBroken = true; worker = null; preparedSearch = null;
        // A failed speculative reply must not leave the next turn waiting
        // forever for a result from a worker that no longer exists.
        if(G.phase==='thinking'&&(aiPending||hintPending))runSearch(hintPending?'hint':'ai');
      };
    } catch { workerBroken = true; }
    return worker;
  }

  function getVerdictWorker() {
    if (G.mode !== 'aivai' || G.aiSpeed <= 1 || verdictWorkerBroken) return getWorker();
    if (!verdictWorker) {
      try {
        verdictWorker = new Worker(URL.createObjectURL(new Blob([workerSource()], { type: 'text/javascript' })));
        verdictWorker.onmessage = event => handleVerdict(event.data);
        verdictWorker.onerror = () => { verdictWorkerBroken = true; verdictWorker = null; };
      } catch { verdictWorkerBroken = true; return getWorker(); }
    }
    return verdictWorker;
  }
  function cancelVerdictWork() {
    preparedSearch = null;
    presentationWait?.cancel();
    if (verdictWorker) { verdictWorker.terminate(); verdictWorker = null; }
    pendingVerdicts.clear(); pendingVerdict = null;
  }

  const DIFF_OPTS = null; // replaced by the LEVELS ladder

  function levelOpts(levelId, style) {
    const L = LEVELS[levelId] || LEVELS.l5;
    // Timing varies by move, never by nationality or personality.
    const pace = 0.9 + Math.random() * 0.2;
    // Pool-based move picking compares root scores against each other, so it
    // needs exact per-root values: only the shallow rungs (which have a pool)
    // pay for the full-window search.
    const opts = { budgetMs: Math.max(80, Math.round(L.budgetMs * pace)), maxDepth: L.maxDepth, jitter: L.jitter,
      fullRootWindow: L.pool > 0 };
    // Personality nudges positional taste. Material values stay close to
    // neutral so an aggressive style is not made weaker by undervaluing men.
    if (style) opts.weights = Object.fromEntries(Object.entries(style.w).map(([key, value]) =>
      [key, 1 + (value - 1) * (key === 'trade' ? .1 : key === 'king' ? .15 : .25)]));
    return { opts, level: L };
  }
  const searchLevelForSide = () => G.mode === 'aivai'
    ? (G.side === IVORY ? G.diffIvory : G.diffEbony) : G.diff;
  function changeDifficulty(levelId) {
    if (!LEVELS[levelId]) return;
    if (G.mode === 'aivai') levelId = LEVEL_IDS[Math.max(3, LEVEL_IDS.indexOf(levelId))];
    settings.diff = levelId; G.diff = levelId;
    if (G.mode === 'aivai' && settings.aivaiAuto) {
      const levels = arenaSeatLevels(G.seatIvory, G.seatEbony);
      G.diffIvory = LEVEL_IDS[levels[0] - 1]; G.diffEbony = LEVEL_IDS[levels[1] - 1];
    } else {
      G.diffIvory = levelId; G.diffEbony = levelId;
    }
    saveJSON(SETTINGS_KEY, settings);
    if (!G.over && (G.phase === 'thinking' || G.phase === 'idle' &&
      (G.mode === 'aivai' || G.mode === 'ai' && G.side !== G.humanSide))) {
      reqId++; aiPending = false; hintPending = false;
      if (worker) { worker.terminate(); worker = null; }
      G.phase = 'idle'; FX.thinkStop();
      updateAll(); scheduleAI();
    } else updateAll();
    saveCurrentMatch();
  }
  function arenaPressureOpts(opts) {
    if (G.mode === 'aivai' && settings.aivaiAuto) {
      opts.budgetMs = Math.min(5250, Math.round(opts.budgetMs * (1 + .08 * stageOfBout(arena.bouts))));
    }
    return opts;
  }
  function chooseLadderMove(res, legal, levelId) {
    const valid = res.best && legal.find(m => m.from === res.best.from && m.path.join() === res.best.path.join());
    const best = valid || legal[(Math.random() * legal.length) | 0];
    const L = LEVELS[levelId] || LEVELS.l5;
    if (L.pool > 0 && Array.isArray(res.rootScores) && res.rootScores.length > 1) {
      if (Math.random() < L.blunder) return legal[(Math.random() * legal.length) | 0];
      const top = Math.max(...res.rootScores.map(r => r.score));
      const pool = res.rootScores.filter(r => Number.isFinite(r.score) && r.score >= top - L.pool);
      if (pool.length) {
        const chosen = pool[(Math.random() * pool.length) | 0].m;
        return legal.find(m => m.from === chosen.from && m.path.join() === chosen.path.join()) || best;
      }
    }
    return best;
  }
  function chooseRememberedMove(res,legal,levelId) {
    const initial=chooseLadderMove(res,legal,levelId);if(!initial||legal.length<=1)return initial;
    const actor=learningActor(G.side),position=learningPosition(G.rsId,G.board,G.side);
    const blocked=move=>mistakeMemory.avoid(actor,position,learningRoute(move,G.side,G.board.length),res.depth);
    if(!blocked(initial))return initial;
    const alternatives=legal.filter(move=>!blocked(move));if(!alternatives.length)return initial;
    const roots=(res.rootScores||[]).filter(root=>alternatives.some(move=>move.from===root.m.from&&move.path.join()===root.m.path.join()));
    const highest=roots.filter(root=>Number.isFinite(root.score)).sort((a,b)=>b.score-a.score)[0];
    const best=highest?highest.m:alternatives[0];
    return chooseLadderMove({...res,best,rootScores:roots},alternatives,levelId);
  }

  function prepareArenaReply(move,board,side,noProgress) {
    if(G.mode!=='aivai'||G.aiSpeed<=1||G.aiPaused||workerBroken)return;
    const nextBoard=E.applyMove(G.rs,board,move,side),nextSide=-side;
    if(!E.legalMoves(G.rs,nextBoard,nextSide).length)return;
    const level=nextSide===IVORY?G.diffIvory:G.diffEbony;
    const opts=arenaPressureOpts(levelOpts(level,styleForSide(nextSide)).opts);
    if(opts.weights)opts.weights.for=nextSide;
    const w=getWorker();if(!w)return;
    const nextNoProgress=E.nextNoProgress(G.rs,board,move,side,noProgress),id=++reqId;
    preparedSearch={id,epoch:gameEpoch,board:nextBoard,side:nextSide,rsId:G.rsId,level,
      noProgress:nextNoProgress,started:Date.now(),waiting:false,result:null};
    // Search the known next legal position while the current piece is in flight.
    // Exactly the same level options are used, with no reduced time/depth budget.
    w.postMessage({cmd:'search',id,rsId:G.rsId,side:nextSide,board:nextBoard,noProgress:nextNoProgress,opts});
  }
  function runSearch(kind) {
    if(kind==='ai'&&preparedSearch){
      const p=preparedSearch;
      if(p.id===reqId&&p.epoch===gameEpoch&&p.rsId===G.rsId&&p.side===G.side&&
          p.level===searchLevelForSide()&&p.noProgress===G.noProg&&p.board.every((v,i)=>v===G.board[i])){
        thinkStart=p.started;aiPending=true;hintPending=false;p.waiting=true;
        if(p.result){preparedSearch=null;setTimeout(()=>handleSearch(p.result),0);}return;
      }
      preparedSearch=null;
    }
    const id = ++reqId;
    thinkStart = Date.now();
    const style = kind === 'hint' ? null : styleForSide(G.side);
    let opts;
    if (kind === 'hint') {
      opts = { budgetMs: 600, maxDepth: 12, jitter: 0 };
    } else {
      opts = arenaPressureOpts(levelOpts(searchLevelForSide(), style).opts);
    }
    // Against a person the computer keeps its thoughts short — the long
    // deep searches belong to the spectator arena, not to your game.
    if (G.mode === 'ai') opts.budgetMs = Math.min(opts.budgetMs, 1300);
    const payload = {
      cmd: 'search', id, rsId: G.rsId, side: G.side, noProgress: G.noProg,
      board: G.board,
      opts,
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
      if (mv) winkHintPiece(mv.from);
      return;
    }
    // pacing: aivai keeps a watchable rhythm scaled by the speed selector —
    // but nobody answers every move at the same beat. Default: quick snaps
    // and the occasional stare. AI human playing mode: the full human
    // pattern — forced moves answered fast, ordinary moves muled over, one
    // long think in a while, nothing robotic.
    let base;
    if (settings.humanlike && (G.mode === 'aivai' || G.mode === 'ai')) {
      const r = Math.random();
      const caps = G.legal.some((m) => m.caps.length > 0);
      const vsHuman = G.mode === 'ai'; // a person is waiting — no epic stares
      if (G.legal.length <= 2) base = 700 + r * 900;               // forced: snap
      else if (caps && G.legal.length <= 4) base = 900 + r * 1400; // obvious shot
      else if (r < 0.12) base = 500 + r * 900;                     // the quick reply
      else if (r > 0.88) base = (vsHuman ? 2100 : 8000) + r * (vsHuman ? 900 : 9000);
      else base = vsHuman ? 1200 + Math.random() * 1400 : 1600 + Math.random() * 4200;
      if (vsHuman) base = Math.min(base, 2600);
    } else {
      // Off means no simulated pondering. Search budgets/depth and the
      // completed result stay identical; only the theatrical wait disappears.
      base = 0;
    }
    const multiplier=()=>G.mode==='aivai'?(G.aiSpeed||1):1;
    let last=Date.now(),pace=multiplier(),remaining=Math.max(0,base-(last-thinkStart)*pace),timer;
    const advance=()=>{
      clearTimeout(timer);
      const now=Date.now();remaining-=Math.max(0,now-last)*pace;last=now;pace=multiplier();
      if(res.id!==reqId||G.phase!=='idle'||G.mode==='aivai'&&G.aiPaused){if(presentationWait===wait)presentationWait=null;return;}
      if(remaining<=0){if(presentationWait===wait)presentationWait=null;executeMove(chooseRememberedMove(res,G.legal,searchLevelForSide()));}
      else timer=setTimeout(advance,remaining/pace);
    };
    const wait={retime:advance,cancel(){clearTimeout(timer);if(presentationWait===wait)presentationWait=null;}};
    presentationWait=wait;
    timer=setTimeout(advance,remaining/pace);
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
    // a king is two stacked men, like the real set: an extra disc peeks below
    el.innerHTML = (Math.abs(p.code) === 2 ? '<div class="stack" aria-hidden="true"></div>' : '') +
      '<div class="body"><div class="ring"></div></div>';
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

  function winkHintPiece(sq) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const body = pieceAt(sq)?.el?.querySelector('.body');
    if (!body) return;
    body.querySelector('.hint-wink')?.remove();
    const wink = document.createElement('span');
    wink.className = settings.shake ? 'hint-wink hint-wink-shake' : 'hint-wink';
    wink.setAttribute('aria-hidden', 'true');
    wink.innerHTML = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round">' +
      '<path d="M7 12q3-4 6 0"/><path class="hint-wink-eye" d="M19 12q3-4 6 0"/>' +
      '<path d="M9 20q7 8 14 0"/></svg>';
    body.appendChild(wink);
    FX.play('hint_wink');
    globalThis.DRAFTI_CINEMA?.hint(sq, Math.sign(G.board[sq]));
    setTimeout(() => wink.remove(), 850);
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
    if (Math.abs(p.code) === 2) {
      if (!body.querySelector('.crown')) body.insertAdjacentHTML('beforeend', CROWN);
      if (!p.el.querySelector('.stack')) p.el.insertAdjacentHTML('afterbegin', '<div class="stack" aria-hidden="true"></div>');
    }
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
      el.classList.remove('sel', 'hop', 'target', 'capture-target', 'finish-target', 'last', 'hint', 'landing');
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
    const trailAge = performance.now() - (G.lastMoveAt || 0);
    if (G.lastMove && G.lastMoveAt && trailAge < 900) {
      mark(G.lastMove.from, 'last');
      mark(G.lastMove.path[G.lastMove.path.length - 1], 'last');
      const path = G.lastMove.path, squares = squareEls();
      for (const sq of [G.lastMove.from, path.at(-1)]) squares[sq].style.setProperty('--trail-age', -trailAge + 'ms');
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
      for (const move of G.sel.cands) {
        if (move.caps.length > 1 && move.path.length > k && G.sel.partial.every((sq, index) => move.path[index] === sq)) {
          mark(move.path[move.path.length - 1], 'finish-target');
        }
      }
    }
    markJumpPaths();
  }

  // ---------------- selection & input ----------------
  function clearSel() { G.sel = null; renderHighlights(); }

  function trySelect(i) {
    const cands = G.legal.filter((m) => m.from === i);
    if (!cands.length) {
      FX.play('illegal');
      if (Math.random() < 0.3) setTimeout(() => SFX_BANK.play('st_whis1', { vol: 0.5 }), 320);
      return;
    }
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
    // A unique final destination selects the complete legal capture route.
    // Keep its engine-generated path intact so every hop still animates,
    // sounds, crowns and enters history exactly as in step-by-step play.
    const finishes = G.sel.cands.filter(m => m.caps.length > 1 && m.path.length > G.sel.partial.length &&
      m.path[m.path.length - 1] === i && G.sel.partial.every((sq, index) => m.path[index] === sq));
    if (finishes.length === 1) { const move = finishes[0]; clearSel(); executeMove(move); return; }
    if (finishes.length > 1 && i !== G.sel.from && !G.sel.cands.some(m => m.path[G.sel.partial.length] === i)) {
      flashWhisper('More than one route ends here — choose the next landing to select your route.');
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

  function installBoardGestures(element, onTap) {
    let gesture = null;
    const cancel = () => { gesture = null; };
    element.addEventListener('pointerdown', event => {
      // A second finger is a zoom/gesture, never a move command.
      if (event.isPrimary === false || event.button !== 0) { cancel(); return; }
      const square = event.target.closest('.sq');
      if (!square || !element.contains(square)) return;
      gesture = { pointer: event.pointerId, square: +square.dataset.i, x: event.clientX, y: event.clientY };
      if (element.setPointerCapture) element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', event => {
      if (gesture && event.pointerId === gesture.pointer &&
          Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10) cancel();
    });
    element.addEventListener('pointerup', event => {
      const tap = gesture; cancel();
      if (!tap || event.pointerId !== tap.pointer ||
          Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) return;
      const square = document.elementFromPoint(event.clientX, event.clientY)?.closest('.sq');
      if (square && element.contains(square) && +square.dataset.i === tap.square) onTap(tap.square);
    });
    element.addEventListener('pointercancel', cancel);
    element.addEventListener('lostpointercapture', cancel);
    return cancel;
  }
  installBoardGestures(boardEl, onSquareClick);

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
    advantage: { rank: 1 },
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
  let lastQualityPly = -9;     // last ply that earned a quality reaction
  let pendingVerdict = null;
  const pendingVerdicts = new Map();
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

  // ---- live streamer commentary (Female / Male / Funny) -------------------
  // Three mutually exclusive streamer modes, every one of them OFF by
  // default. With all modes off this object never plays anything, so the
  // existing sound design behaves exactly as before. When a mode is on it
  // only ever takes over the spoken reaction of an event it covers — never
  // doubling a voice — and it drops (never queues, never interrupts) when
  // another voice is talking, when a ceremony scene-locks the bank, when
  // its Voice category chip is off, or when its own per-role cooldown,
  // per-game quota or chance gate says no. Line sources: the researched
  // phrasebook in docs/streamer-phrasebook.md; Funny mode reuses the app's
  // own judge voice and already-credited funny reactions only.
  const STREAMER = {
    extraPools: {},
    loadingVoices: new Set(),
    warmVoice() {
      const mode = settings.streamer, ctx = FX.ctx;
      if (!ctx || !settings.sound || !settings.sfx.voice ||
          !['female', 'male', 'funny'].includes(mode) || this.loadingVoices.has(mode)) return;
      this.loadingVoices.add(mode);
      return fetch('./streamer-vocabulary/manifest.json').then(response => {
        if (!response.ok) throw Error('Streamer vocabulary unavailable');
        return response.json();
      }).then(async clips => {
        const roles = { session_open: 'greeting', capture1: 'capture',
          capture2: 'feast', capture3plus: 'capture_chain', new_king: 'crowning',
          new_bout: 'next_bout', rematch_draw: 'next_rematch', season_advance: 'next_season' };
        const pool = this.extraPools[mode] = {};
        for (const clip of clips) {
          const role = roles[clip.role];
          if (clip.mode !== mode || !role || !/^s[fjm]2_\d{3}$/.test(clip.id) ||
              !(clip.durationSec > 0 && clip.durationSec <= 6)) continue;
          try {
            const response = await fetch('./streamer-vocabulary/' + clip.id + '.mp3');
            if (!response.ok) continue;
            const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
            SFX_BANK.defs[clip.id] = { c: 'voice', b: clip.text, durationSec: buffer.duration, hourGate: clip.hourGate };
            SFX_BANK.buffers.set(clip.id, buffer);
            (pool[role] ||= []).push(clip.id);
          } catch { /* the existing voice library remains available */ }
        }
      }).catch(() => { /* optional vocabulary can be unavailable offline */ });
    },
    ROLES: {
      greeting:    { chance: 1, cooldown: 20000, perGame: 1 },
      cta:         { chance: 1, cooldown: 90000, perGame: 4 },
      praise:      { chance: .3,  cooldown: 60000,  perGame: 3 },
      great:       { chance: .45, cooldown: 90000,  perGame: 2 },
      capture:     { chance: .8, cooldown: 16000,  perGame: 8 },
      feast:       { chance: 1,  cooldown: 20000,  perGame: 5 },
      capture_chain: { chance: 1, cooldown: 20000, perGame: 5 },
      next_bout:    { chance: 1, cooldown: 30000, perGame: 1 },
      next_rematch: { chance: 1, cooldown: 30000, perGame: 1 },
      next_season:  { chance: 1, cooldown: 30000, perGame: 1 },
      crowning:    { chance: 1,  cooldown: 20000,  perGame: 5 },
      trap_set:    { chance: .4,  cooldown: 60000,  perGame: 2 },
      trap_spring: { chance: .55, cooldown: 60000,  perGame: 2 },
      blunder_own: { chance: .45, cooldown: 45000,  perGame: 3 },
      blunder_opp: { chance: .4,  cooldown: 45000,  perGame: 2 },
      streak:      { chance: .6,  cooldown: 90000,  perGame: 2 },
      comeback:    { chance: .6,  cooldown: 90000,  perGame: 2 },
      victory:     { chance: 1,  cooldown: 5000,   perGame: 1 },
      defeat:      { chance: 1,  cooldown: 5000,   perGame: 1 },
      long_think:  { chance: 1, cooldown: 45000, perGame: 5 },
      outro:       { chance: 1,   cooldown: 60000,  perGame: 1 },
    },
    POOLS: {
      female: {
        greeting: ['sf_greet1', 'sf_greet2'],
        cta: ['sf_cta1', 'sf_cta2', 'sf_cta3'],
        praise: ['sf_good'], great: ['sf_great'], capture: ['sf_capture'],
        feast: ['sf_feast'], crowning: ['sf_crown'], trap_set: ['sf_trap'],
        trap_spring: ['sf_trapspring'], blunder_own: ['sf_blunder'],
        blunder_opp: ['sf_gift'], streak: ['sf_streak'], comeback: ['sf_comeback'],
        victory: ['sf_win'], defeat: ['sf_lose'], long_think: ['sf_think'],
        outro: ['sf_outro'],
      },
      male: {
        greeting: ['sm_greet1', 'sm_greet2'],
        cta: ['sm_cta1', 'sm_cta2', 'sm_cta3'],
        praise: ['sm_good'], great: ['sm_great'], capture: ['sm_capture'],
        feast: ['sm_feast'], crowning: ['sm_crown'], trap_set: ['sm_trap'],
        trap_spring: ['sm_trapspring'], blunder_own: ['sm_blunder'],
        blunder_opp: ['sm_gift'], streak: ['sm_streak'], comeback: ['sm_comeback'],
        victory: ['sm_win'], defeat: ['sm_lose'], long_think: ['sm_think'],
        outro: ['sm_outro'],
      },
      // the app's own voice and already-credited reactions only
      funny: {
        greeting: ['tellyou', 'v_nextup'],
        cta: ['tellyou'],
        praise: ['v_nice', 'rimshot', 'animewow'],
        great: ['omg', 'wilhelm', 'animewow'],
        capture: ['oof', 'klonk', 'gulp'],
        feast: ['badboy', 'badboy2', 'tellyou'],
        crowning: ['god', 'banana', 'wolfwhistle'],
        trap_set: ['meow', 'duck'],
        trap_spring: ['vineboom', 'wilhelm', 'ah_scream', 'fall'],
        blunder_own: ['woops', 'bruh', 'lose_womp', 'sadviolin'],
        blunder_opp: ['haha', 'vineboom', 'chicken', 'duck'],
        streak: ['wildroar', 'eagle', 'streak_big'],
        comeback: ['dundundun', 'v_lucky1', 'v_lucky2'],
        victory: ['wildroar', 'omg', 'badboy'],
        defeat: ['sadviolin', 'cricket', 'lose_womp'],
        long_think: ['cricket', 'later_hours'],
        outro: ['later_moments', 'later_hours'],
      },
    },
    at: new Map(), count: new Map(), games: 0, busyUntil: 0, lastLine: '', cue: { snd: 'v_nice', dur: 2.5 },
    lineAt: new Map(),
    joinedMidgame: false,
    sessionOpened: (() => { try { return sessionStorage.getItem('drafti.stream.welcomed.v1') === '1'; } catch { return false; } })(),
    lastSpokeAt: -Infinity, opened: false, observedPly: -1,
    rememberSession() { this.sessionOpened = true; try { sessionStorage.setItem('drafti.stream.welcomed.v1', '1'); } catch {} },
    reset() { this.count.clear(); this.games++; this.joinedMidgame = false; this.opened = false; this.openedAt = performance.now(); this.observedPly = -1; },
    openGame() {
      if (this.joinedMidgame || this.opened || this.sessionOpened) return;
      // A new bout is not a new livestream. Keep this session flag across
      // per-game resets and voice switches; never welcome an ongoing show.
      this.opened = this.say('greeting');
      if (this.opened) this.rememberSession();
    },
    pulse() {
      // Retry missed openings and fill real quiet moments, never a speech loop
      // with stale tactical claims. A newly selected voice waits for the menu
      // to close; enabling a setting itself never starts commentary.
      if (drawerOpen || document.hidden || G.progressConflict || (G.mode === 'aivai' && G.aiPaused)) return;
      this.warmVoice();
      const now = performance.now(), quiet = now - this.lastSpokeAt;
      if (now < this.busyUntil || quiet < 12000) return;
      if (G.over) {
        if (G.result && G.result.winner !== null) this.say(G.mode === 'ai' && G.result.winner !== G.humanSide ? 'defeat' : 'victory');
        return;
      }
      if (!G.history.length) return;
      if (this.openedAt == null) { this.joinedMidgame = true; this.rememberSession(); }
      if (!this.joinedMidgame && !this.sessionOpened && !this.opened && now - this.openedAt < 15000) { this.openGame(); return; }
      const move = G.history.at(-1).move;
      if (this.observedPly !== G.history.length && now - (G.lastMoveAt || 0) < 5000) {
        this.observedPly = G.history.length;
        // The recorded "double capture" must never describe three or more.
        if (move.caps.length === 2 && this.say('feast')) return;
        if (move.caps.length >= 3 && this.say('capture_chain')) return;
        if (move.caps.length === 1 && this.say('capture')) return;
        if (move.promotes && this.say('crowning')) return;
      }
      if (quiet < 22000) return;
      if (G.phase === 'thinking' && this.say('long_think')) return;
      if (now - (this.at.get('cta') ?? -Infinity) >= 90000) this.say('cta');
    },
    intermission(role) {
      // A ceremony owns its full original recording. Use the free space after
      // it for engagement, without falsely announcing the stream has ended.
      if (drawerOpen || document.hidden) return false;
      return this.say('cta') || (role ? this.say(role) : false);
    },
    canPlay(role, opts) {
      if (typeof drawerOpen !== 'undefined' && drawerOpen) return false;
      const mode = settings.streamer;
      if (mode !== 'female' && mode !== 'male' && mode !== 'funny') return false;
      const conf = this.ROLES[role];
      const pool = [...(this.POOLS[mode]?.[role] || []), ...(this.extraPools[mode]?.[role] || [])];
      if (!conf || !pool || !pool.length) return false;
      if (!settings.sound || !settings.sfx.voice) return false;
      const now = performance.now();
      if (now < this.busyUntil) return false;
      if (SFX_BANK.sceneLockUntil > now && !(opts && opts.ceremony)) return false;
      for (const active of SFX_BANK.activeSources.values()) {
        if (active.spoken) return false; // never talk over another voice
      }
      if (now - (this.at.get(role) ?? -Infinity) < conf.cooldown) return false;
      const key = mode + ':' + role;
      if ((this.count.get(key) || 0) >= conf.perGame) return false;
      if (Math.random() > conf.chance) return false;
      const hour = new Date().getHours();
      const fresh = pool.filter((id) => {
        const def = SFX_BANK.defs[id];
        const text = def?.b || '';
        if (def?.hourGate) {
          const [first, last] = def.hourGate.split('-').map(Number);
          if (!(hour >= first && hour <= last)) return false;
        }
        if (/\btonight\b/i.test(text) && !(hour >= 17 || hour < 5)) return false;
        if (/\bgood evening\b/i.test(text) && hour < 17) return false;
        if (/\bgood morning\b/i.test(text) && !(hour >= 5 && hour < 12)) return false;
        if (/\bgood afternoon\b/i.test(text) && !(hour >= 12 && hour < 17)) return false;
        return id !== this.lastLine && now - (this.lineAt.get(id) ?? -Infinity) >= (role === 'cta' ? 120000 : 180000) && SFX_BANK.buffers.has(id) && SFX_BANK.defs[id];
      });
      if (!fresh.length) return false;
      const id = fresh[(Math.random() * fresh.length) | 0];
      this.cue = { snd: id, dur: SFX_BANK.defs[id].durationSec || 2.5 };
      return true;
    },
    say(role, opts) {
      if (!this.canPlay(role, opts)) return false;
      const now = performance.now();
      const src = SFX_BANK.play(this.cue.snd, { vol: .95, rate: 1, queue: false });
      if (!src) return false;
      this.at.set(role, now);
      const key = settings.streamer + ':' + role;
      this.count.set(key, (this.count.get(key) || 0) + 1);
      this.lastLine = this.cue.snd;
      this.lineAt.set(this.cue.snd,now);
      this.lastSpokeAt = now;
      this.busyUntil = now + (this.cue.dur * 1000) + 400;
      return true;
    },
  };


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
    el.title = text;
    // The stage owns this upright overlay even when the board is flipped.
    // Anchor it within the playing surface, never across the matchup names.
    el.style.top = (frameEl.offsetTop + frameEl.offsetHeight * .44) + 'px';
    void el.offsetWidth;
    el.classList.add('run');
    clearTimeout(whisperTimer);
    whisperTimer = setTimeout(() => el.classList.remove('run'), 2400);
  }

  const pick = (arr) => {
    if (!arr || !arr.length) return null;
    // Sound pools use the same director as the crafted event effects; label
    // pools retain their existing random choice. The supplied pool still
    // determines meaning, and duplicate entries retain their weighting.
    if (arr.every(id => typeof id === 'string' && SFX_BANK.defs[id]))
      return SFX_BANK.drawCue('pool:' + arr.slice().sort().join('|'), arr);
    return arr[(Math.random() * arr.length) | 0];
  };

  function thump() {
    frameEl.classList.remove('thump');
    void frameEl.offsetWidth;
    frameEl.classList.add('thump');
    setTimeout(() => frameEl.classList.remove('thump'), 700);
  }

  // expanding ring from a square — the crowning shockwave
  function shockwave(sq, {captures = 0, landing = false, corner = false} = {}) {
    if (sq == null) return;
    const n = G.rs.n, r = (sq / n) | 0, c = sq % n;
    const el = document.createElement('div');
    el.className = corner ? 'capture-corner' : landing ? 'shockwave landing-ring' :
      captures ? 'shockwave capture-shockwave' : 'shockwave';
    if (captures) el.style.setProperty('--blast-radius', Math.min(2.6, 1.3 + captures * .24));
    el.style.left = (c * 100 / n) + '%';
    el.style.top = (r * 100 / n) + '%';
    el.style.width = (100 / n) + '%';
    el.style.height = (100 / n) + '%';
    piecesEl.appendChild(el);
    setTimeout(() => el.remove(), landing || corner ? 360 : 800);
  }

  const FIRST_STRIKE_CUES = [
    { label: 'First strike!', snd: 'v_sharp' },
    { label: 'Opening capture!', snd: 'v_clean' },
    { label: 'Off the mark!', snd: 'v_nice' },
  ];
  const FIRST_STRIKE_DECK = makeDeck(FIRST_STRIKE_CUES);
  // The first capture, once per game; preserve the original tactical trigger.
  function firstCaptureSting() {
    if (G.firstStrike) return;
    G.firstStrike = true;
    const cue = FIRST_STRIKE_DECK();
    SFX_BANK.play(cue.snd, { vol: 0.75 });
    SFX_BANK.effect('coin', { vol: .22 });
    flashWhisper(cue.label);
  }

  // Instant signals, computed at commit time from data we already have.
  // Engine movers only get the big board events (captures, crowns) — cartoon
  // "mistake" stings are for humans; spectator games stay professional.
  function classifySync(mv, moverLegalBefore, ply, moverSide) {
    let ev = 'none';
    const maxCaps = moverLegalBefore.reduce((a, m) => Math.max(a, m.caps.length), 0);
    const engineMover = (G.mode === 'ai' && moverSide !== G.humanSide) || G.mode === 'aivai';
    if (mv.caps.length >= 3) ev = 'legendary';
    else if (mv.caps.length === 2) ev = 'majestic';
    else if (mv.promotes) ev = 'promo';
    else if (mv.caps.length === 1 && countSide(moverSide) - countSide(-moverSide) === 1 &&
        !G.legal.some(m => m.caps.includes(mv.path[mv.path.length - 1]))) ev = 'advantage';
    else if (!engineMover && mv.caps.length === 0 && maxCaps >= 2) ev = 'missed';
    else if (!engineMover && mv.caps.length >= 1 && maxCaps >= 3 && mv.caps.length < maxCaps) ev = 'feastmissed';
    else if (mv.caps.length === 0) {
      const end = mv.path[mv.path.length - 1];
      const recapturable = G.legal.some((m) => m.caps.length > 0 && m.caps.includes(end));
      if (recapturable && !engineMover) ev = 'awkward';
    }
    applyMoveEvent(ev, ply, mv.caps.length, mv.path[mv.path.length - 1]);
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

  let lastSkillOriginalAt = -Infinity;
  let lastAdvantageAt = -Infinity;
  function applyMoveEvent(ev, ply, flavor, endSq) {
    if (G.history.length <= 1) STREAMER.openGame();
    const eventEpoch = gameEpoch;
    const currentEvent = () => eventEpoch === gameEpoch && G.history.length === ply && !G.over;
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
      setTimeout(() => { if (!currentEvent()) return; if (!STREAMER.say('great')) SFX_BANK.play(pick(FEAST_POOL), { vol: 0.95 }); }, 1550);
    } else if (ev === 'majestic') {
      SFX_BANK.play(pick(['oof', 'oof', 'eagle', 'vineboom']), { vol: 1 }); // "OOF." / the boom
      flashLabel('Double!', 'party');
      shake('shake-m');
      setTimeout(() => SFX_BANK.play('badboy', { vol: 1 }), 550);
      setTimeout(() => { if (!currentEvent()) return; if (!STREAMER.say('feast')) SFX_BANK.play(pick(HEAVY_POOL), { vol: 0.95 }); }, 1450);
    } else if (ev === 'promo') {
      SFX_BANK.play('elephant', { vol: 1 });
      SFX_BANK.play('crown_fanfare', { vol: 0.8 });
      // the king has arrived: shockwave from the crowned square, hype lines
      shockwave(endSq);
      if (!STREAMER.say('crowning')) SFX_BANK.play(Math.random() < 0.45 ? pick(['v_king1', 'v_king2']) : 'v_king', { vol: 0.9 });
      flashLabel('Crowned!', 'majestic');
    } else if (ev === 'advantage') {
      // A safe single capture breaks material equality. Either seat can earn
      // the spotlight; a forced recapture never gets premature praise.
      if (performance.now() - lastAdvantageAt < 22000) return;
      lastAdvantageAt = performance.now();
      SFX_BANK.play('sparkle', { vol: .5 });
      if (!STREAMER.say('capture')) SFX_BANK.play(pick(['v_ooh1', 'v_chess']), { vol: .68 });
      flashLabel('Takes the edge!', 'majestic');
      shockwave(endSq);
    } else if (ev === 'brilliant') {
      if (ply - lastBlunderPly === 2) lastBlunderPly = -1;
      SFX_BANK.play(pick(['wolfwhistle', 'rimshot', 'animewow']), { vol: 0.9 });
      const skillMoment = performance.now() - lastSkillOriginalAt > 90000 && Math.random() < .28;
      const skillVoice = skillMoment && SFX_BANK.play('skill_original', { vol: .85, rate: 1 });
      if (skillVoice) {
        lastSkillOriginalAt = performance.now();
        flashLabel('The only one who has got that skill!', 'majestic');
      } else {
        SFX_BANK.play(Math.random() < 0.5 ? 'v_chess' : 'v_ooh1', { vol: 0.85 });
        flashLabel('A chess move!', 'majestic');
      }
    } else if (ev === 'trick') {
      SFX_BANK.play(pick(['wolfwhistle', 'zip', 'meow']), { vol: 0.85 }); // the cat, laying a trap
      const line = STREAMER.say('trap_set') ? null : ['v_trick', 'v_trap', 'v_crafty'][(Math.random() * 3) | 0];
      if (line) SFX_BANK.play(line, { vol: 0.95 });
      flashLabel(line === 'v_trap' ? 'What a trap!' : line === 'v_crafty' ? 'Crafty!' : 'Sneaky!', 'judge');
    } else if (ev === 'accurate') {
      // A long think that paid off gets the special praise treatment instead.
      if (lastThinkMs > 12000 && lastThinkPraised !== ply) {
        lastThinkPraised = ply;
        SFX_BANK.play('sparkle', { vol: 0.9 });
        if (!STREAMER.say('great')) SFX_BANK.play(pick(PRAISE_POOL), { vol: 0.95 });
        flashLabel('Worth the wait!', 'majestic');
        return;
      }
      // a clean move straight after a blunder deserves a comeback nod
      if (ply - lastBlunderPly === 2 && Math.random() < 0.75) {
        lastBlunderPly = -1;
        SFX_BANK.play('relief', { vol: 0.7 });
        // Recovering from a mistake alone does not prove a material comeback.
        if (!STREAMER.say('praise')) SFX_BANK.play(pick(COMEBACK_POOL), { vol: 0.9 });
        flashLabel('Repaired!', 'judge');
        return;
      }
      const only = flavor === 'only';
      if (!STREAMER.say('praise')) SFX_BANK.play(only ? pick(['v_only', 'v_hold1', 'v_hold2'])
        : ['v_nice', 'v_sharp', 'v_clean'][(Math.random() * 3) | 0], { vol: 0.9 });
      flashLabel(only ? 'The only move!' : ['Precise.', 'Sharp!', 'Clean.'][(Math.random() * 3) | 0], 'judge');
    } else if (ev === 'dubious') {
      SFX_BANK.play(pick(['v_hmm', 'v_curious', 'v_inacc1', 'v_inacc2']), { vol: 0.9 });
      flashLabel('Hmm…', 'judge');
    } else if (ev === 'blunder') {
      lastBlunderPly = ply;
      // a collapse is not a soundboard: back-to-back disasters get one soft
      // sting instead of the full comedy number
      if (ply - lastQualityPly <= 1) { lastQualityPly = ply; SFX_BANK.play('woops', { vol: 0.5 }); return; }
      lastQualityPly = ply;
      SFX_BANK.play(Math.random() < 0.35 ? 'bruh' : 'trombone', { vol: 1 });
      // A long think that ended in a blunder earns the savage callout.
      const moverHuman = (G.history[ply - 1] || {}).side === G.humanSide || G.mode !== 'ai';
      if (!STREAMER.say(moverHuman ? 'blunder_own' : 'blunder_opp')) {
        SFX_BANK.play(longThinkSavage ? pick(SAVAGE_POOL)
          : ['v_ohno', 'v_why', 'v_sure', 'v_cost'][(Math.random() * 4) | 0], { vol: 0.9 });
      }
      longThinkSavage = false;
      flashLabel(['Why?!', 'Oh no!'][(Math.random() * 2) | 0], 'comedy');
    } else if (ev === 'epic') {
      if (ply - lastQualityPly <= 1) { lastQualityPly = ply; SFX_BANK.play('omg', { vol: 0.65 }); return; }
      lastQualityPly = ply;
      SFX_BANK.play(pick(['omg', 'omg', 'wilhelm', 'ahhscary']), { vol: 1 });
      const epicHuman = (G.history[ply - 1] || {}).side === G.humanSide || G.mode !== 'ai';
      if (!STREAMER.say(epicHuman ? 'blunder_own' : 'blunder_opp')) {
        SFX_BANK.play(lastThinkMs > 20000 ? pick(SAVAGE_POOL)
          : (Math.random() < 0.5 ? 'v_wow' : 'v_why'), { vol: 0.9 });
      }
      flashLabel('Disaster!', 'comedy');
      thump();
    } else if (ev === 'missed') {
      SFX_BANK.play(Math.random() < 0.45 ? 'duck' : 'whistle', { vol: 1 }); // a sitting duck
      if (!STREAMER.say('blunder_own')) SFX_BANK.play('v_onejob', { vol: 0.9 });
      flashLabel('You missed the jump!', 'comedy');
    } else if (ev === 'feastmissed') {
      // the mover grabbed the wrong piece: a bigger feast was on the board
      SFX_BANK.play('trombone', { vol: 1 });
      setTimeout(() => { if (!currentEvent()) return; if (!STREAMER.say('blunder_own')) SFX_BANK.play(pick(['v_wrong1', 'v_wrong2', 'v_wrong3', 'v_wrong4']), { vol: 0.95 }); }, 900);
      flashLabel('Wrong piece!', 'comedy');
    } else if (ev === 'awkward') {
      const pool = ['ahooga', 'woops', 'banana', 'haha', 'klonk', 'shloop', 'gulp', 'smarts', 'fall', 'scramble', 'zip'];
      SFX_BANK.play(pool[(Math.random() * pool.length) | 0], { vol: 0.85 });
      if (Math.random() < 0.6 && !STREAMER.say('blunder_own')) SFX_BANK.play('v_awkward', { vol: 0.75 });
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
    const w = getVerdictWorker();
    if (!w) return;
    const id = ++verdictId;
    pendingVerdict = { id, ply, caps: mv.caps.length, mover: side, epoch:gameEpoch,
      engine:G.mode==='aivai'||G.mode==='ai'&&side!==G.humanSide,actor:learningActor(side),
      playedPath:mv.path.join(),boardBefore:preBoard };
    pendingVerdicts.set(id,pendingVerdict);
    if(pendingVerdicts.size>256)pendingVerdicts.delete(pendingVerdicts.keys().next().value);
    w.postMessage({
      cmd: 'classify', id, rsId: G.rsId, side, noProgress: preNoProg,
      board: preBoard, playedPath: mv.path.join(),
      detectMissed: G.mode === 'ai' && side !== G.humanSide,
      withOpp: true,
      opts: { budgetMs: 340, maxDepth: 9, jitter: 0, fullRootWindow:true },
    });
  }

  // ---- doom drama: one side is trapped with no way out -----------------------
  // The verdict's opponent search (withOpp) reports how the side to move
  // stands after every move. If that collapses deep below a lost-material
  // horizon, the position is hopeless: the loser can only keep playing while
  // the winner converts. Announce it, then — from time to time, on the
  // winner's converting moves — let the table have its full
  // "Let me tell you something" moment. Works in every mode.
  const DOOM_ON = -650;   // side to move is beyond saving
  const DOOM_OFF = -220;  // climbed back this high: escaped
  const DOOM_LINES = ['v_doom1', 'v_doom2', 'v_doom3', 'v_doom4', 'v_doom5'];
  const DOOM_WHISPER = ['No escape.', 'Trapped.', 'It is over.', 'Nowhere to run.'];
  let doomSide = 0;            // the side that is lost
  let doomPly = 0;             // ply when doom was declared
  let lastDoomTaunt = 0;       // cooldown for the "let me tell you something" loop
  let doomTauntIx = 0;
  let doomTauntCount = 0;      // per-game cap — the joke must never become a record
  let doomEsc = 0;             // consecutive escape readings before the escape counts

  function doomStart(side, ply, isHumanDoomed) {
    if (doomSide === side) return;
    doomSide = side;
    doomPly = ply;
    doomTauntIx = 0;
    doomTauntCount = 0;
    frameEl.classList.add('doomed');
    frameEl.dataset.doomSide = side;
    globalThis.DRAFTI_CINEMA?.doom(side);
    if (isHumanDoomed) {
      // bad news for the player: the sad violin and a straight admission
      SFX_BANK.play('sadviolin', { vol: 0.95 });
      SFX_BANK.play(DOOM_LINES[0], { vol: 0.95 });
      flashLabel('No escape!', 'drama');
    } else {
      // the ENGINE is the one trapped: a panicked chicken, pure comedy
      SFX_BANK.play('panic', { vol: 0.95 });
      flashLabel('The engine is trapped!', 'party');
    }
    lastDoomTaunt = Date.now();
  }

  function doomEnd(ply) {
    const was = doomSide;
    if (!was) return;
    doomSide = 0;
    frameEl.classList.remove('doomed');
    delete frameEl.dataset.doomSide;
    if (ply - doomPly >= 2) { // a real escape, not a one-move wobble
      FX.play('relief');
      SFX_BANK.play(pick(['v_esc1', 'v_esc2']), { vol: 0.95 });
      flashLabel('Narrow escape!', 'judge');
    }
  }

  function doomClear() {
    doomSide = 0;
    frameEl.classList.remove('doomed');
    delete frameEl.dataset.doomSide;
  }

  // On the loser's turns: keep-playing patter. On the winner's converting
  // moves: the full "Let me tell you something", then taunts — paced so it
  // lands like a running joke, not a broken record.
  function doomHeartbeat(moverSide, caps) {
    if (!doomSide || doomSide !== -moverSide) return;
    const now = Date.now();
    if (moverSide === doomSide) {
      // the doomed side shuffles on: soft brood clucks, occasionally the
      // alarmed squawk — but rarely, and never over a fresh taunt
      if (Math.random() < 0.14 && now - lastDoomTaunt > 9000) {
        setTimeout(() => SFX_BANK.play(Math.random() < 0.2 ? 'panic' : 'chicken', { vol: 0.7 }), 700);
      }
      return;
    }
    if (now - lastDoomTaunt < 34000 || doomTauntCount >= 4) return;
    lastDoomTaunt = now;
    doomTauntCount++;
    const first = doomTauntIx === 0;
    doomTauntIx++;
    setTimeout(() => {
      SFX_BANK.play(first ? 'tellyou' : 'vineboom', { vol: first ? 1 : 0.9 });
      if (first) setTimeout(() => SFX_BANK.play('st_heart1', { vol: 0.7 }), 2800);
      setTimeout(() => SFX_BANK.play(pick(DOOM_LINES.slice(1)), { vol: 0.95 }), first ? 2300 : 500);
      flashLabel(pick(['DOUBLE DOOM!', 'No escape!', 'Still trapped!']), 'drama');
      if (caps > 0) { shake('shake-m'); }
    }, 420);
  }


  // ---- trap drama: reaction bank for baits taken, dodged and wasted ----
  const DRAMA = {
    trap_win:    { sfx: 'trap_snap', lines: ['v_taw1', 'v_taw2', 'v_taw3'], label: ['The trap springs!', 'Snap!', 'Right into it!'], kind: 'majestic' },
    trap_fail:   { sfx: 'trap_snap', lines: ['v_tbf1', 'v_tbf2', 'v_tbf3'], label: ['You took the bait!', 'It was a trap!', 'Straight into the trap!'], kind: 'comedy' },
    trap_denied: { sfx: 'denied',    lines: ['v_tad1', 'v_tad2', 'v_tad3'], label: ['Denied!', 'Not today!', 'Seen through!'], kind: 'judge' },
    trap_dodge:  { sfx: 'relief',    lines: ['v_tbd1', 'v_tbd2', 'v_tbd3'], label: ['Good read.', 'You dodged it!', 'Not biting.'], kind: 'judge' },
    ai_missed:   { sfx: 'relief',    lines: ['v_aim1', 'v_aim2'], label: ['The trap went unused?!'], kind: 'comedy' },
  };
  // the engine's table talk when it lays poisoned material on the board
  const BAIT_POOL = {
    lines: ['v_bait1', 'v_bait2', 'v_bait3'],
    say: ['Whatever you do, do not take that piece…', 'That piece is poisoned…',
      'Take the bait. I am begging you.'],
  };
  let lastDramaAt = 0;
  let lastPurrAt = 0;
  let lastFeastCallAt = 0;   // "let me tell you something" on 3+ captures
  let lastMissedWinAt = 0;   // engine declined a winning capture
  let lastBaitTalkAt = 0;    // the engine's poisoned-material taunt
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
    // the cat pounces when a trap actually catches its mouse
    if (kind === 'trap_win' && Math.random() < 0.3) {
      setTimeout(() => SFX_BANK.play('meow', { vol: 0.85 }), 1300);
    }
    // a bait taken is a blunder in public: the crowd winces
    if (kind === 'trap_fail' && Math.random() < 0.35) {
      setTimeout(() => SFX_BANK.play(pick(['st_ooh1', 'st_ooh2']), { vol: 0.7 }), 1100);
    }
  }

  function handleVerdict(res) {
    const pv = pendingVerdicts.get(res.id);
    if (!pv || res.id !== pv.id || pv.epoch !== gameEpoch) return;
    pendingVerdicts.delete(res.id);
    if(pendingVerdict?.id===res.id)pendingVerdict = null;
    const h = G.history[pv.ply - 1];
    if(!h || h.move.path.join()!==pv.playedPath || !h.boardBefore.every((piece,i)=>piece===pv.boardBefore[i]))return;
    if(pv.engine && h && mistakeMemory.remember(pv.actor,learningPosition(G.rsId,h.boardBefore,pv.mover),
        learningRoute(h.move,pv.mover,h.boardBefore.length),res))saveJSON(LEARNING_KEY,mistakeMemory.snapshot());
    // Keep verified historical lessons, but never attach an old taunt,
    // doom state or trap to a position already passed during fast playback.
    if (G.over || G.history.length !== pv.ply) return;
    globalThis.DRAFTI_CINEMA?.verdict({verdict:res,move:h.move,side:pv.mover,ply:pv.ply});
    if (isFinite(res.delta) && res.delta >= 420 && !res.onlyMove && G.history.length > 4) AUDIENCE.mistake(pv.mover);
    if (isFinite(res.delta) && res.delta >= 420 && !res.onlyMove && h && G.history.length > 4)
      SFX_BANK.directOwner('human_blunder_flagrant', { human: G.mode === 'hotseat' || G.mode === 'ai' && pv.mover === G.humanSide, forced: res.onlyMove, delta: res.delta });

    // ---- doom drama, every mode: how does the side to move actually stand?
    if (res.opp && isFinite(res.opp.bestScore)) {
      const doomed = -pv.mover;
      const humanDoomed = G.mode === 'ai' ? doomed === G.humanSide
        : G.mode === 'hotseat'; // both seats are human — mourn together
      if (res.opp.bestScore <= DOOM_ON) {
        doomEsc = 0;
        doomStart(doomed, pv.ply, humanDoomed);
      } else if (doomSide === doomed && res.opp.bestScore >= DOOM_OFF) {
        // two consecutive readings above the horizon before the escape is
        // real — a shallow verdict flickering past the band must not
        // re-announce the doom every few moves
        if (++doomEsc >= 2) { doomEsc = 0; doomEnd(pv.ply); }
      }
    }

    // ---- score-sheet badge (! brilliant · !? inaccurate · ? mistake · ?? blunder)
    if (G.mode !== 'aivai' && h && isFinite(res.delta) && !res.onlyMove) {
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
      // the engine just laid out poisoned material — it talks its talk,
      // but paced: a taunt every quiet trap would wear out its welcome
      if (G.mode === 'ai' && pv.mover !== G.humanSide &&
          Date.now() - lastBaitTalkAt > 25000 && Math.random() < 0.65) {
        lastBaitTalkAt = Date.now();
        setTimeout(() => {
          SFX_BANK.play('notify_pop');
          setTimeout(() => SFX_BANK.play(pick(BAIT_POOL.lines), { vol: 0.95 }), 200);
          flashWhisper(pick(BAIT_POOL.say));
        }, 550);
      }
    }

    // ---- the engine set a winning trap… and played somewhere else ----
    if (res.missedWin) {
      if (Date.now() - lastMissedWinAt > 25000) {
        lastMissedWinAt = Date.now();
        setTimeout(() => {
          const before = lastDramaAt;
          applyDrama('ai_missed');
          if (lastDramaAt !== before && Math.random() < 0.5) SFX_BANK.play('v_lucky3', { vol: 0.9 }); // "My plan! Ruined!"
          else if (lastDramaAt !== before && Math.random() < 0.4) SFX_BANK.play('duck', { vol: 0.9 });
        }, 480);
      }
      return;
    }

    // the engine is simply crushing: the cat purrs while it plays
    if (G.mode === 'ai' && pv.mover !== G.humanSide && isFinite(res.playedScore) &&
        res.playedScore >= 520 && Date.now() - lastPurrAt > 45000 && Math.random() < 0.4) {
      lastPurrAt = Date.now();
      setTimeout(() => {
        SFX_BANK.play('purr', { vol: 0.9 });
        flashWhisper('Purrrfect.');
      }, 700);
    }

    if (G.mode === 'aivai') return; // spectators skip per-move quality scoring
    if (res.onlyMove || !isFinite(res.delta)) return;
    // a doomed side has no good moves — punishing every one of them is a
    // broken record. The score-sheet badges tell the story; the board stays quiet.
    const doomedMover = doomSide === pv.mover;
    if (doomedMover && res.delta >= 70) return;
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
  function physicalBurst(element, kind, side) {
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = element.getBoundingClientRect();
    const effect = document.createElement('div'); effect.className = 'physical-burst ' + kind;
    effect.setAttribute('aria-hidden', 'true');
    effect.style.left = (rect.left + rect.width / 2) + 'px';
    effect.style.top = (rect.top + rect.height / 2) + 'px';
    const energy = kind === 'capture' && G.mode === 'aivai' ? 1 + Math.log2(G.aiSpeed || 1) * .07 : 1;
    for (let i = 0; i < (kind === 'victory' ? 14 : 7); i++) {
      const bit = document.createElement('i'), angle = i * 2.39996;
      bit.style.setProperty('--dx', Math.cos(angle) * (kind === 'victory' ? 110 : 28) * energy + 'px');
      bit.style.setProperty('--dy', (Math.sin(angle) * (kind === 'victory' ? 90 : 28) - 15) * energy + 'px');
      bit.style.setProperty('--spin', (i * 71) + 'deg'); effect.appendChild(bit);
    }
    if (kind === 'capture') {
      const tray = $(side === IVORY ? 'trayTop' : 'trayBottom').getBoundingClientRect();
      const mini = document.createElement('b'); mini.className = 'tray-flight';
      const surface = element.querySelector && element.querySelector('.body');
      if (surface) { const paint = getComputedStyle(surface); mini.style.background = paint.background; mini.style.border = '1px solid ' + paint.borderColor; }
      mini.style.setProperty('--dx', tray.left + tray.width * .8 - rect.left - rect.width / 2 + 'px');
      mini.style.setProperty('--dy', tray.top + tray.height / 2 - rect.top - rect.height / 2 + 'px');
      effect.appendChild(mini);
    }
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 1100);
  }
  function moveHopMs(captures) {
    // The owner's 1x viewing pace is the baseline; selected multipliers scale
    // presentation exactly. Engine accuracy/search effort is independent.
    const base = G.mode === 'aivai' ? 700 / (G.aiSpeed || 1) : HOP_MS;
    return base * (captures > 1 ? .8 : 1);
  }
  function captureRibbon(from, to, hopMs, captures) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const n = G.rs.n, dx = (to % n - from % n) * 100 / n;
    const dy = (Math.floor(to / n) - Math.floor(from / n)) * 100 / n;
    const ribbon = document.createElement('div');
    ribbon.className = 'capture-ribbon' + (captures > 1 ? ' feast-ribbon' : '');
    ribbon.setAttribute('aria-hidden', 'true');
    ribbon.style.left = ((from % n + .5) * 100 / n) + '%';
    ribbon.style.top = ((Math.floor(from / n) + .5) * 100 / n) + '%';
    ribbon.style.width = Math.hypot(dx, dy) + '%';
    ribbon.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)';
    const duration = hopMs * .85;
    ribbon.style.setProperty('--ribbon-travel', duration + 'ms');
    const light = document.createElement('i'); ribbon.appendChild(light);
    piecesEl.appendChild(ribbon);
    setTimeout(() => ribbon.remove(), duration + 450);
  }
  async function animateMove(mv, epoch) {
    const generation = epoch == null ? gameEpoch : epoch, moverSide = G.side;
    const p = pieceAt(mv.from);
    if (!p) return;
    p.el.classList.add('lifted');
    if (mv.path.length === 2 && !mv.caps.length) SFX_BANK.effect('slide', { vol: .075 });
    if (Math.abs(p.code) === 2 && !mv.caps.length) SFX_BANK.effect('king_glint', { vol: .12 });
    for (let k = 1; k < mv.path.length; k++) {
      if(generation !== gameEpoch)return false;
      // The selector may change while this very capture chain is playing.
      // Give each hop one matching movement/effect/wait clock, independent
      // of AI level, league progress or the time spent calculating.
      const hopMs = moveHopMs(mv.caps.length);
      p.el.style.setProperty('--hop-time', (hopMs * .85) + 'ms');
      p.el.style.setProperty('--piece-fx-time', (G.mode === 'aivai' ? Math.min(250, hopMs * .7) : 250) + 'ms');
      const to = mv.path[k];
      const from = mv.path[k - 1];
      if (k > 1 && mv.caps.length > 1 && hopMs >= 80 &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const previous = mv.path[k - 2], n = G.rs.n;
        const columnTurn = (from % n - previous % n) * (to % n - from % n) < 0;
        const rowTurn = (Math.floor(from / n) - Math.floor(previous / n)) *
          (Math.floor(to / n) - Math.floor(from / n)) < 0;
        if (columnTurn || rowTurn) shockwave(from, {corner: true});
      }
      captureRibbon(from, to, hopMs, mv.caps.length);
      p.sq = to;
      positionEl(p.el, to);
      const capIdx = mv.caps[k - 1];
      if (capIdx !== undefined) {
        const victim = pieceAt(capIdx);
        const final = k === mv.path.length - 1;
        setTimeout(() => {
          if (generation !== gameEpoch) return;
          if (victim?.el) {
            physicalBurst(victim.el, 'capture', moverSide);
            victim.el.classList.add('captured');
          }
          const captures = mv.caps.length;
          if (captures > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            shockwave(capIdx, {captures: final ? captures : 1});
          }
          FX.play('capture');
          SFX_BANK.effect(final ? 'impact' : 'jump', { vol: final ? .32 : Math.min(.29, .17 + k * .025) });
          if (final && captures > 1) SFX_BANK.effect('feast', { vol: Math.min(.48, .24 + captures * .05) });
        }, hopMs * .32);
      } else {
        FX.play('move');
        SFX_BANK.effect('landing', { vol: .08 });
      }
      await sleep(hopMs);
      if(generation !== gameEpoch)return false;
      if (!mv.caps.length && !mv.promotes && hopMs >= 120 &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        shockwave(to, {landing: true});
      }
    }
    p.el.classList.remove('lifted');
    if (mv.promotes) {
      p.code = G.side * 2;
      refreshPiece(p);
      p.el.classList.add('crowning');
      frameEl.classList.add(G.side === IVORY ? 'coronation-a' : 'coronation-b');
      setTimeout(() => { if(generation === gameEpoch){p.el.classList.remove('crowning');frameEl.classList.remove('coronation-a', 'coronation-b');} }, 1100);
      FX.play('king');
      SFX_BANK.effect('crown', { vol: .38 });
      if (Math.random() < 0.55) setTimeout(() => SFX_BANK.play('st_tada1', { vol: 0.6 }), 320);
    }
  }

  let lastSpecAt = 0;
  const SPEC_THINK = ['v_spec2', 'v_spec3', 'v_spec4', 'v_spec5', 'v_spec6'];
  const SPEC_HIT = ['v_spec7', 'v_spec8'];

  async function executeMove(mv) {
    if (!mv || G.phase !== 'idle' || G.progressConflict) return;
    const generation = gameEpoch;
    G.phase = 'animating';
    const moverIsHuman = humanTurn();
    if (moverIsHuman) lastThinkMs = thinkArmedKey === turnKey() ? Date.now() - humanThinkStart : 0;
    const preBoard = G.board.slice();
    const preNoProg = G.noProg;
    const preLegal = G.legal.slice();
    const moverSide = G.side;
    prepareArenaReply(mv,preBoard,moverSide,preNoProg);
    globalThis.DRAFTI_CINEMA?.moveStart(mv, moverSide);
    G.sel = null; G.hint = null;
    G.lastMoveAt = 0;
    updateAll();
    // a big capture trip gets its build-up call while the hops are airborne —
    // at most one per 30 s so feasts never double up with the fanfare lines
    if (mv.caps.length >= 3 && Date.now() - lastFeastCallAt > 30000) {
      lastFeastCallAt = Date.now();
      SFX_BANK.play('tellyou', { vol: 0.95 });
    }
    await animateMove(mv, generation);
    if(generation !== gameEpoch)return;
    const ply = commitMove(mv);
    globalThis.DRAFTI_CINEMA?.moveEnd(mv, moverSide, preBoard);
    const remaining = countSide(-moverSide);
    if (mv.caps.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const lead = countSide(moverSide) - remaining;
      if (lead > 0 && lead < mv.caps.length) {
        const tray = $(moverSide === IVORY ? 'trayTop' : 'trayBottom');
        tray?.animate?.([
          {boxShadow: 'inset 0 0 0 1px transparent'},
          {boxShadow: 'inset 0 0 0 1px var(--accent), inset 0 0 14px var(--accent-soft)', offset: .28},
          {boxShadow: 'inset 0 0 0 1px transparent'},
        ], {duration: 560, easing: 'ease-out'});
      }
    }
    AUDIENCE.move(moverSide,mv.caps.length,mv.promotes,remaining);
    SFX_BANK.fastArenaAnimal(mv.caps.length, remaining, mv.promotes);
    if (mv.caps.length >= 3) SFX_BANK.directOwner('capture_own_feast');
    else if (mv.caps.length >= 2) SFX_BANK.directOwner('material_loss_sudden');
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
    // doom drama: the winner converts while the loser keeps playing
    doomHeartbeat(moverSide, mv.caps.length);
    // the last-shrimp moment: the side to move has a single piece left and
    // the board is about to devour it — "wait… is this the shrimp one??"
    if (!G.over && !G.shrimpFired && countSide(G.side) === 1 &&
        countSide(-G.side) >= 2 && Math.random() < 0.35) {
      G.shrimpFired = true;
      setTimeout(() => {
        SFX_BANK.play(SFX_BANK.defs.shrimp_orig
          ? 'shrimp_orig' : pick(['shrimp1', 'shrimp2']), { vol: 0.85, rate: 1 });
        flashWhisper('Is this the shrimp one??');
      }, 850);
    }
    // capture streaks: consecutive moves (by either side) that capture
    if (mv.caps.length > 0) {
      firstCaptureSting();
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
          const rampage = Math.random() < (big ? 0.9 : 0.5);
          if (rampage && STREAMER.say('great')) {
            // the streamer voice replaces the rampage callout, never doubles it
          } else if (rampage) SFX_BANK.play(big ? 'v_rampage2' : 'v_rampage', { vol: 0.9 });
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
    if (!G.over) classifySync(mv, preLegal, ply, moverSide);
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
    G.lastMoveAt = performance.now();
    G.side = -side;
    G.legal = E.legalMoves(G.rs, G.board, G.side);
    repAdd(posKey(G.board, G.side));
    saveCurrentMatch();
    return G.history.length;
  }

  function lowMaterialLimit(board) {
    let a = 0, b = 0, ak = false, bk = false;
    for (const p of board) { if (p > 0) { a++; ak ||= p === 2; } else if (p < 0) { b++; bk ||= p === -2; } }
    if (!a || !b) return 0;
    if (a <= 2 && b <= 2) return 2;
    return a <= 3 && b <= 3 && ak && bk ? 10 : 0;
  }
  function lowMaterialCountdown(board, history, legal) {
    const limit = lowMaterialLimit(board);
    if (!limit) return null;
    let elapsed = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      if (h.move.caps.length || h.move.promotes || lowMaterialLimit(h.boardBefore) !== limit) break;
      elapsed++;
    }
    const scoringNext = legal.some(m => m.caps.length || m.promotes);
    return { limit, remaining: Math.max(0, limit - elapsed), scoringNext };
  }
  function checkGameEnd() {
    const opp = G.side;
    if (!G.legal.length) {
      setOver(-opp, countSide(opp) === 0
        ? 'Every ' + displayName(opp) + ' piece has been captured.'
        : displayName(opp) + ' has no legal move.');
    } else if (G.noProg >= G.rs.drawPlies) {
      setOver(null, G.rs.flyingKings
        ? 'Twenty-five king moves per side without a capture or man move.'
        : 'Forty moves per side without a capture or man move.');
    } else if ((G.repMap.get(posKey(G.board, G.side)) || 0) >= 3) {
      setOver(null, 'The same position occurred three times.');
    } else {
      const countdown = lowMaterialCountdown(G.board, G.history, G.legal);
      if (countdown && countdown.remaining === 0 && !countdown.scoringNext)
        setOver(null, 'Low-material draw after ' + countdown.limit + ' moves without a capture or crowning.');
    }
  }

  function setOver(winner, reason) {
    G.over = true;
    SFX_BANK.effect(winner === null ? 'draw' : G.mode === 'ai' && winner !== G.humanSide ? 'defeat' : 'victory', { vol: .38 });
    if (winner !== null) {
      frameEl.classList.add(winner === IVORY ? 'victory-a' : 'victory-b');
      physicalBurst(frameEl, 'victory', winner);
    }
    G.result = { winner, reason };
    G.phase = 'over';
    doomClear();
    recordStats(winner);
    AUDIENCE.finish(winner);
    globalThis.DRAFTI_CINEMA?.result(winner);
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
    if (winner === G.humanSide && humanLadder.win(G.diff))
      saveJSON(STATS_KEY,stats,{[HUMAN_LADDER_KEY]:humanLadder.snapshot()});
    else saveStats();
  }

  let overShown = false; // one farewell per game — the arena must not double-count
  function showGameOver() {
    if (!G.over || overShown) return;
    overShown = true;
    if (typeof recordAudioCheckpoint === 'function') recordAudioCheckpoint('game-end');
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
        if (Math.random() < 0.35) setTimeout(() => { if (!STREAMER.say('victory')) SFX_BANK.play(pick(['v_win2', 'v_win3']), { vol: 0.85 }); }, 1400);
      } else if (r.winner !== null && Math.random() < 0.35) {
        setTimeout(() => { if (!STREAMER.say('defeat')) SFX_BANK.play(pick(['v_lose2', 'v_lose3']), { vol: 0.85 }); }, 1400);
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

  // ---------------- the arena: host vs challenger, the world ladder ----------
  // The champion hosts; each challenger gets `arenaRounds` rounds (default
  // one) to try to take the crown before the ladder moves on. Experience:
  // a win teaches +3, a defeat +4, a draw +2 — beaten nations return
  // stronger, so no one rules forever. Every 12 bouts closes a season; the
  // next one opens with every nation a rung stronger (the host too, so
  // bouts stay even). When the whole world has appeared and the reigning
  // champion wins again, the crowd calls for the retirement ceremony:
  // "How can you allow the one with that skill to retire?!"
  let manualRetire = !!settings.retireEvents;
  // honored exit: the champion leaves the board to applause; the next name
  // takes the crown; a finished ladder reshuffles the queue
  function retireChampionHonors() {
    const champId = arena.champion;
    arena.queue = arena.queue.filter((id) => id !== champId);
    arena.champion = arena.queue.shift() || champId; // the next name takes the crown
    arena.challRounds = 0;
    if (arena.appeared.length >= ROSTER.length) {
      arena.appeared = [arena.champion];
      arena.queue = ladderQueue(arena.champion);
    }
    guardArena();
    saveArena();
  }
  function applyArenaResult(winnerSide) { // IVORY / EBONY / 0 = draw
    const champId = arena.champion, challId = G.seatIvory === champId ? G.seatEbony : G.seatIvory;
    const manual = manualRetire;
    const winnerId = winnerSide === IVORY ? G.seatIvory : winnerSide === EBONY ? G.seatEbony : null;
    const seats = champId === challId ? [champId] : [champId, challId];
    for (const id of seats) {
      arena.xp[id] += 2 + (winnerId === null ? 0 : id === winnerId ? 3 : 4);
      if (id === winnerId) arena.wins[id]++;
    }
    if (winnerId) {
      const stageBonus = arena.bouts >= 11 ? 5 : arena.bouts >= 9 ? 3 : arena.bouts >= 5 ? 2 : 0;
      const bonus = stageBonus + (winnerId === champId ? 1 : 0);
      arena.xp[winnerId] += bonus;
      arenaProgress.bonusXp[winnerId] = (arenaProgress.bonusXp[winnerId] || 0) + bonus;
      saveJSON(ARENA_PROGRESS_KEY, arenaProgress);
    }
    const champ = rosterById(champId), chall = rosterById(challId);
    let ceremony = false, text = '';
    if (winnerId === challId) {
      // the challenger takes the crown; the beaten champion goes to the back
      arena.streak = 0;
      arena.queue.push(champId);
      arena.queue = arena.queue.filter((id) => id !== challId);
      arena.champion = challId;
      arena.challRounds = 0;
      text = (chall.face ? chall.face + ' ' : '') + aiName(challId) + ' beats ' + aiName(champId) + ' — new champion!';
    } else if (winnerId === champId) {
      arena.challRounds++;
      arena.streak = (arena.streak || 0) + 1;
      if (arena.streak === 3) {
        // a title defense hat-trick — give the crowd its airhorn moment
        setTimeout(() => SFX_BANK.play('st_air1', { vol: 0.8 }), 1600);
        setTimeout(() => SFX_BANK.play('st_coin1', { vol: 0.6 }), 2500);
      }
      if (arena.challRounds >= settings.arenaRounds) {
        arena.queue.shift(); // this challenger's rounds are up — next name in
        arena.queue.push(challId);
        arena.challRounds = 0;
        text = (champ.face ? champ.face + ' ' : '') + aiName(champId) + ' holds the board — ' + aiName(challId) + ' steps aside.';
      } else {
        text = aiName(challId) + ' gets another round (' +
          (arena.challRounds + 1) + '/' + settings.arenaRounds + ').';
      }
      // the whole world has appeared and the champion still holds the board:
      // the crowd asks the only question left — how can you let that retire?
      if (arena.appeared.length >= ROSTER.length) ceremony = true;
    } else {
      arena.challRounds++;
      if (arena.challRounds >= Math.max(2, settings.arenaRounds)) {
        arena.queue.shift();
        arena.queue.push(challId);
        arena.challRounds = 0;
        text = 'A draw — ' + aiName(champId) + ' keeps the board; the next challenger steps up.';
      } else {
        text = 'A draw — ' + aiName(champId) + ' keeps the board; ' + aiName(challId) + ' goes again.';
      }
    }
    if (manual && winnerId !== challId) {
      // you called time on a deserving champion — the ceremony is the point
      ceremony = true;
    }
    if (ceremony) {
      retireChampionHonors();
      text = (champ.face ? champ.face + ' ' : '') + aiName(champId) + ' retires a champion! Long live ' +
        aiName(arena.champion) + '!';
    }
    if (arena.appeared.length >= ROSTER.length) {
      // one complete pass: every nation has played — the ladder reshuffles
      arena.appeared = [arena.champion];
      arena.queue = ladderQueue(arena.champion);
    }
    // the season closes every SEASON_LEN bouts — the world comes back stronger
    let seasonEnd = false;
    arena.bouts++;
    if (arena.bouts >= SEASON_LEN) {
      arena.bouts = 0;
      arena.season++;
      // Rotate opening honours among nations that have waited longest.
      const unseen = arena.queue.filter(id => !arena.appeared.includes(id));
      const candidates = unseen.length ? unseen : arena.queue;
      const opener = candidates[(Math.random() * candidates.length) | 0];
      if (opener) arena.queue = [opener, ...arena.queue.filter(id => id !== opener)];
      seasonEnd = true;
    }
    guardArena();
    saveArena();
    if (seasonEnd) {
      const champ2 = rosterById(arena.champion);
      text = (champ2.face ? champ2.face + ' ' : '') + aiName(arena.champion) +
        ' advances to Season ' + arena.season + ' — every nation returns one rung stronger.' +
        (text ? ' ' + text : '');
    }
    return { ceremony, text, champion: arena.champion, seasonEnd };
  }

  // the retirement ceremony: the winner's name takes the centre of the board
  // while the crowd asks how anyone could let that skill retire
  let ceremonyEpoch = 0, ceremonyVoice = null;
  function cancelCeremony() {
    ceremonyEpoch++;
    if (ceremonyVoice) { SFX_BANK.activeSources.delete(ceremonyVoice); try { ceremonyVoice.stop(); } catch {} ceremonyVoice = null; }
    SFX_BANK.sceneLockUntil = 0;
    const element = $('ceremony'); if (element) element.hidden = true;
  }
  const RETIREMENT_DECK = makeDeck(['v_retire1', 'v_retire2', 'v_retire_short']);
  function showCeremony(champId) {
    cancelCeremony();
    const epoch = ceremonyEpoch;
    const later = (fn, delay) => setTimeout(() => { if (epoch === ceremonyEpoch) fn(); }, delay);
    const r = rosterById(champId);
    const el = $('ceremony');
    if (!el) return sleep(6500);
    el.innerHTML = '<div class="cer-card">' +
      '<div class="cer-face">' + r.face + '</div>' +
      '<div class="cer-name">' + aiName(champId) + '</div>' +
      '<div class="cer-sub">retires a champion — ' + (arena.wins[r.id] || 0) +
      ' wins, L' + rosterLevel(r.id) + ' of experience</div>' +
      '<div class="cer-quote">"How can you allow the one with that skill to retire?!"</div>' +
      '</div>';
    globalThis.DRAFTI_FLAGS?.render(el.querySelector('.cer-face'),r.id);
    el.hidden = false;
    SFX_BANK.play('gong', { vol: 0.9 });
    later(() => SFX_BANK.play('st_drum1', { vol: 0.75 }), 350);
    const major = (arena.wins[r.id] || 0) >= 5;
    const retirementClip = SFX_BANK.defs.v_retire_orig ? 'v_retire_orig'
      : major ? RETIREMENT_DECK() : pick(['v_retire1', 'v_retire_short']);
    const voiceMs = Math.min(15, (SFX_BANK.defs[retirementClip] || {}).durationSec || (SFX_BANK.buffers && SFX_BANK.buffers.get(retirementClip) || {}).duration || 5.84) * 1000;
    const ceremonyMs = Math.max(7400, voiceMs + 2400);
    later(() => {
      const voice = SFX_BANK.play(retirementClip, { vol: 1, rate: 1, maxDuration: 15, sceneOwner: 'ceremony' });
      ceremonyVoice = voice;
      if (voice) SFX_BANK.sceneLockUntil = performance.now() + voiceMs + 100;
    }, 1000);
    later(() => SFX_BANK.play(pick(['st_appl1', 'st_appl2']), { vol: 0.85 }), voiceMs + 1250);
    later(() => { el.hidden = true; ceremonyVoice = null; }, ceremonyMs);
    return sleep(ceremonyMs);
  }

  let autoNextTimer = 0, autoNextGeneration = 0;
  function cancelAutoNext() {
    autoNextGeneration++;
    cancelCeremony();
    clearInterval(autoNextTimer);
    autoNextTimer = 0;
    const el = $('autoNext');
    if (el) el.hidden = true;
  }
  function scheduleAutoNext() {
    cancelAutoNext();
    const generation = autoNextGeneration;
    const el = $('autoNext');
    if (!el) return;
    const prevChamp = arena.champion;
    const res = applyArenaResult(G.result && G.result.winner ? G.result.winner : 0);
    if (res.text) flashWhisper(res.text);
    if (res.champion !== prevChamp) {
      // an upset! the crowd gasps, then roars the new name
      setTimeout(() => SFX_BANK.play(pick(['st_gasp1', 'st_gasp2']), { vol: 0.85 }), 500);
      setTimeout(() => SFX_BANK.play('st_crowd1', { vol: 0.7 }), 1400);
    }
    if (res.seasonEnd) {
      // a season closes: the gong sounds, the world readies its stronger side
      setTimeout(() => SFX_BANK.play('gong', { vol: 0.9 }), 700);
      setTimeout(() => SFX_BANK.play(pick(['st_air1', 'st_crowd1']), { vol: 0.8 }), 1600);
    }
    const beginCountdown = () => {
      if (generation !== autoNextGeneration || G.mode !== 'aivai' || !settings.aivaiAuto) return;
      const c = rosterById(arena.champion), ch = rosterById(arena.queue[0] || arena.champion);
      const nextPair = [arena.champion, arena.queue[0] || arena.champion];
      const drawnRematch = G.result?.winner === null && nextPair.includes(G.seatIvory) &&
        nextPair.includes(G.seatEbony);
      const transition = res.seasonEnd ? 'next_season' : drawnRematch ? 'next_rematch' : 'next_bout';
      const streamerSpoke = STREAMER.intermission(transition);
      const voiceEnds = streamerSpoke ? STREAMER.busyUntil : 0;
      let left = 6, remainingMs = 6000, lastTick = Date.now();
      const announce = () => {
        el.hidden = false;
        el.innerHTML = 'Next: <b>' + (c.face ? c.face + ' ' : '') + aiName(arena.champion) + '</b> vs <b>' +
          (ch.face ? ch.face + ' ' : '') + aiName(arena.queue[0] || arena.champion) + '</b> · Season ' +
          arena.season + ' · bout ' + (arena.bouts + 1) + '/' + SEASON_LEN + ' · ' +
          SEASON_STAGES[stageOfBout(arena.bouts)].name + ' · ' + Math.max(0, Math.ceil(Math.max(remainingMs / (G.aiSpeed || 1), voiceEnds - performance.now()) / 1000)) + 's';
      };
      const fire = () => {
        cancelAutoNext();
        FX.play('levelup');
        setTimeout(() => SFX_BANK.play(pick(['v_spec10', 'v_nextup']), { vol: 0.9 }), 500);
        startNewGameWithFanfare();
      };
      announce();
      const tick = setInterval(() => {
        if (generation !== autoNextGeneration) { clearInterval(tick); return; }
        const now = Date.now(), previous = left;
        remainingMs -= Math.max(0, now - lastTick) * (G.aiSpeed || 1); lastTick = now;
        left = Math.ceil(remainingMs / 1000);
        if (left <= 0 && performance.now() >= voiceEnds) { clearInterval(tick); fire(); return; }
        if (left === 1 && previous !== 1) SFX_BANK.play('st_riser1', { vol: 0.65 });
        announce();
      }, 50);
      autoNextTimer = tick; // interval id doubles as the cancel handle
    };
    if (res.ceremony) showCeremony(prevChamp).then(beginCountdown);
    else beginCountdown();
  }

  // ---------------- game lifecycle ----------------
  const MATCH_KEY = 'drafti.match.v1';
  function saveCurrentMatch() {
    if (!arenaOn() || !G.board || G.over || G.progressConflict) return;
    saveJSON(MATCH_KEY, { schema: 1, rsId: G.rsId, diff: settings.diff, side: G.side, noProg: G.noProg,
      season: arena.season, bout: arena.bouts,
      board: Array.from(G.board), history: G.history.map(h => ({...h,boardBefore:Array.from(h.boardBefore)})),
      repetition: [...G.repMap], seatIvory: G.seatIvory, seatEbony: G.seatEbony,
      diffIvory: G.diffIvory, diffEbony: G.diffEbony, pairKey: G.pairKey, pairMeets: G.pairMeets,
      lastMove: G.lastMove, aiPaused: G.aiPaused, firstStrike: G.firstStrike });
  }
  function restoreLeaguePosition(saved) {
    const rs = saved && E.RULESETS[saved.rsId];
    if (!saved || saved.schema !== 1 || !rs || !Array.isArray(saved.history) || saved.history.length > 2000 ||
        !Array.isArray(saved.board) || saved.board.length !== rs.n*rs.n) return null;
    let board=E.setupBoard(rs),side=rs.firstSide,noProg=0;
    const history=[],repMap=new Map(),sqn=E.squareNumbers(rs);
    const visit=()=>{const key=board.join(',')+'|'+side;repMap.set(key,(repMap.get(key)||0)+1);};visit();
    for(const item of saved.history){
      if(!item || !item.move || !Array.isArray(item.move.path))return null;
      const move=E.legalMoves(rs,board,side).find(m=>m.from===item.move.from&&m.path.join(',')===item.move.path.join(','));
      if(!move)return null;
      history.push({notation:E.moveToNotation(rs,sqn,move),side,move,boardBefore:board.slice(),noProgBefore:noProg});
      noProg=E.nextNoProgress(rs,board,move,side,noProg);board=E.applyMove(rs,board,move,side);side=-side;visit();
    }
    if(side!==saved.side || !saved.board.every((p,i)=>p===board[i]))return null;
    return {rs,sqn,board,side,noProg,history,repMap};
  }
  function resumeLeagueMatch() {
    if (settings.mode !== 'aivai' || !settings.aivaiAuto) return false;
    const saved = loadJSON(MATCH_KEY,null), rs = saved && E.RULESETS[saved.rsId];
    const ids = new Set(ROSTER.map(r=>r.id));
    if (!saved || saved.schema !== 1 || !rs || !Array.isArray(saved.board) || saved.board.length !== rs.n*rs.n ||
        !saved.board.every(p=>Number.isInteger(p)&&Math.abs(p)<=2) || ![IVORY,EBONY].includes(saved.side) ||
        !ids.has(saved.seatIvory) || !ids.has(saved.seatEbony) || saved.seatIvory === saved.seatEbony ||
        !LEVELS[saved.diffIvory] || !LEVELS[saved.diffEbony] ||
        ![saved.seatIvory,saved.seatEbony].includes(arena.champion) || ![saved.seatIvory,saved.seatEbony].includes(arena.queue[0]) ||
        saved.season != null && saved.season !== arena.season || saved.bout != null && saved.bout !== arena.bouts ||
        !Array.isArray(saved.history) || saved.history.length > 2000 || !Array.isArray(saved.repetition)) return false;
    const position=restoreLeaguePosition(saved);if(!position)return false;
    gameEpoch++;
    cancelVerdictWork();
    G.lastMoveAt = 0;
    reqId++;aiPending=false;hintPending=false;cancelAutoNext();
    SFX_BANK.resetGame();doomClear();
    settings.rsId=saved.rsId;if(LEVELS[saved.diff])settings.diff=saved.diff;
    Object.assign(G,{rs,rsId:saved.rsId,sqn:E.squareNumbers(rs),mode:'aivai',diff:settings.diff,
      nationalMatch:true,arenaSeason:saved.season ?? arena.season,arenaBout:saved.bout ?? arena.bouts,
      seatIvory:saved.seatIvory,seatEbony:saved.seatEbony,diffIvory:saved.diffIvory,diffEbony:saved.diffEbony,
      pairKey:saved.pairKey,pairMeets:saved.pairMeets||1,lastMove:saved.lastMove,firstStrike:!!saved.firstStrike,
      phase:'idle',over:false,result:null,recorded:false,sel:null,hint:null,aiPaused:!!saved.aiPaused,aiSpeed:settings.speed,progressConflict:false,
      capStreak:0,capStreakSide:0,shrimpFired:false});
    Object.assign(G,position);G.lastMove=G.history.length?G.history.at(-1).move:null;
    rememberResumedPairColours(G.seatIvory,G.seatEbony);
    const resumedLevels=arenaSeatLevels(G.seatIvory,G.seatEbony);
    G.diffIvory=LEVEL_IDS[resumedLevels[0]-1];G.diffEbony=LEVEL_IDS[resumedLevels[1]-1];
    G.firstStrike=G.history.some(h=>h.move.caps.length);
    G.legal=E.legalMoves(rs,G.board,G.side);overShown=false;
    frameEl.classList.remove('victory-a','victory-b','coronation-a','coronation-b');
    if (typeof recordAudioCheckpoint === 'function') recordAudioCheckpoint('game-resume');
    buildBoard();rebuildPieces();checkGameEnd();updateAll();
    if(G.over)showGameOver();else scheduleAI();
    return true;
  }
  function newGame() {
    gameEpoch++;
    cancelVerdictWork();
    G.progressConflict=false;
    SFX_BANK.resetGame();
    STREAMER.reset();
    frameEl.classList.remove('victory-a', 'victory-b', 'coronation-a', 'coronation-b');
    delete frameEl.dataset.doomSide;
    for (const effect of document.querySelectorAll('.physical-burst')) effect.remove();
    reqId++; // invalidate any in-flight search
    aiPending = false; hintPending = false;
    cancelAutoNext();
    G.rs = E.RULESETS[settings.rsId];
    G.rsId = settings.rsId;
    G.mode = settings.mode;
    G.nationalMatch = G.mode === 'aivai' && settings.aivaiAuto;
    if (G.mode === 'ai') settings.diff = humanLadder.current();
    G.diff = G.mode === 'aivai' ? LEVEL_IDS[Math.max(3, LEVEL_IDS.indexOf(settings.diff))] : settings.diff;
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
    G.over = false; G.result = null; G.recorded = false; overShown = false;
    G.phase = 'idle'; G.sel = null; G.hint = null; G.lastMove = null;
    lastThinkMs = 0; thinkArmedKey = -1; thinkFired = 0; clockArmedKey = -1;
    pendingTrap = null;
    aiCardsThisGame = 0; // the narrator's quota resets with every fresh game
    G.firstStrike = false;
    G.shrimpFired = false;
    // arena seats: the champion hosts on ivory, the challenger sits ebony;
    // guardArena() has already sworn the queue holds nothing but other
    // nations — the fence below only stands watch over future code paths.
    // The challenger is never left more than two rungs below the champion.
    if (G.mode === 'aivai') guardArena();
    if (G.mode === 'aivai' && settings.aivaiAuto) {
      seatArenaBout();
    } else {
      G.seatIvory = arena.champion;
      G.seatEbony = ROSTER.find((r) => r.id !== arena.champion).id;
      G.diffIvory = G.diff; G.diffEbony = G.diff;
      G.pairKey = null; G.pairMeets = 0;
    }
    doomClear();
    buildBoard();
    rebuildPieces();
    updateAll();
    if (typeof recordAudioCheckpoint === 'function') recordAudioCheckpoint('game-start');
    saveCurrentMatch();
    if (globalThis.DRAFTI_UPDATE?.applyAtMatchBoundary()) return;
    globalThis.DRAFTI_CINEMA?.reset();
    scheduleAI();
    // the host introduces themselves: their national school speaks first
    const greeter = G.mode === 'ai' ? styleById(settings.style)
      : G.mode === 'aivai' ? (settings.aivaiAuto
        ? styleById(rosterById(arena.champion).styleId)
        : styleById(settings.styleIvory)) : null;
    const openingEpoch = gameEpoch;
    const openingCurrent = () => openingEpoch === gameEpoch && !G.over && !drawerOpen && G.history.length <= 4;
    if (greeter && Math.random() < (G.mode === 'aivai' ? 0.3 : 0.45)) {
      setTimeout(() => { if (openingCurrent()) SFX_BANK.play(greeter.intro, { vol: 0.8 }); }, 950);
    }
    // AI vs AI: the arena announcer opens the show — who against who
    if (G.mode === 'aivai' && Math.random() < 0.75) {
      setTimeout(() => {
        if (!openingCurrent()) return;
        SFX_BANK.play('notify_pop');
        setTimeout(() => {
          if (!openingCurrent()) return;
          SFX_BANK.play('v_spec1', { vol: 0.9 });
          flashWhisper(settings.aivaiAuto
            ? seatTag(IVORY) + ' vs ' + seatTag(EBONY) + ' — Season ' + arena.season +
              ', bout ' + (arena.bouts + 1) + ' of ' + SEASON_LEN +
              (arena.challRounds ? ' · round ' + (arena.challRounds + 1) + '/' + settings.arenaRounds : '')
            : LEVELS[G.diff].name + ' — ' + styleById(settings.styleIvory).name +
              ' vs ' + styleById(settings.styleEbony).name);
        }, 200);
      }, 1250);
    }
    // tournament theatre, always announced, never skipped: when a stage
    // begins the crowd names who advanced into it, and when two nations
    // meet again the game knows and says so
    if (G.mode === 'aivai' && settings.aivaiAuto) {
      const boutIx = arena.bouts;
      const stage = stageOfBout(boutIx);
      SFX_BANK.effect(['stage_group','stage_quarter','stage_semi','stage_final'][stage], { vol: .26 });
      let meetDelay = 5200;
      if (boutIx > 0 && stageOfBout(boutIx - 1) !== stage) {
        const line = aiName(arena.champion) + ' advances to the ' + SEASON_STAGES[stage].name + '!';
        meetDelay = 8400;
        setTimeout(() => {
          if (openingEpoch !== gameEpoch || G.over || drawerOpen) return;
          SFX_BANK.play('crown_fanfare', { vol: 0.9 });
          setTimeout(() => { if (openingEpoch === gameEpoch && !G.over && !drawerOpen) SFX_BANK.play('st_air1', { vol: 0.8 }); }, 750);
          flashLabel(line, 'majestic');
        }, 4300);
      }
      if (G.pairMeets >= 2) {
        const line = displayName(IVORY) + ' and ' + displayName(EBONY) +
          ' meet again — the ' + ord(G.pairMeets) + ' time in the arena.';
        setTimeout(() => {
          if (openingEpoch !== gameEpoch || G.over || drawerOpen) return;
          SFX_BANK.play('st_drum1', { vol: 0.8 });
          SFX_BANK.effect('reunion', { vol: .25 });
          flashWhisper(line);
        }, meetDelay);
      }
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
    G.over = false; G.result = null; G.recorded = false; overShown = false;
    G.lastMove = G.history.length ? G.history[G.history.length - 1].move : null;
    G.sel = null; G.hint = null;
    G.capStreak = 0; G.capStreakSide = 0;
    pendingTrap = null;
    G.firstStrike = G.history.some((h) => h.move.caps.length > 0);
    doomClear();
    G.legal = E.legalMoves(G.rs, G.board, G.side);
    rebuildPieces();
    FX.play('undo');
    if (Math.random() < 0.35) SFX_BANK.play('v_undo', { vol: 0.8 });
    G.phase = 'idle';
    doomClear(); // a rollback can unpromise the doom — the vignette goes too
    updateAll();
    scheduleAI(); // undo can hand the turn back to the computer — keep it moving
  }

  function scheduleAI() {
    if (G.over || G.phase !== 'idle' || G.progressConflict) return;
    if (G.mode === 'hotseat') return;
    if (G.mode === 'ai' && G.side === G.humanSide) return;
    if (G.mode === 'aivai' && G.aiPaused) return;
    // ambient table talk: real draughts patter while the computer ponders —
    // paced so it feels like a chatty opponent, not a broken record
    if (G.mode === 'ai' && G.history.length >= 2 &&
        Date.now() - lastTalkAt > 58000 && Math.random() < 0.6) {
      lastTalkAt = Date.now();
      const line = TABLE_TALK[(Math.random() * TABLE_TALK.length) | 0];
      setTimeout(() => {
        SFX_BANK.play('notify_pop');
        setTimeout(() => SFX_BANK.play(line.snd, { vol: 0.9 }), 200);
        flashWhisper(line.say);
      }, 900);
    }
    G.phase = 'thinking';
    updateAll();
    runSearch('ai');
  }

  // the words people actually say over the draughts board
  const TABLE_TALK = [
    { snd: 'v_tt1',  say: 'Give a man to get a man — that is draughts.' },
    { snd: 'v_tt2',  say: 'Keep your back row tight…' },
    { snd: 'v_tt3',  say: 'Patience. Draughts punishes the hasty.' },
    { snd: 'v_tt4',  say: 'I would not touch that piece if I were you…' },
    { snd: 'v_tt5',  say: 'Go on. Push it. See what happens.' },
    { snd: 'v_tt6',  say: 'The move is mine — and the move is everything.' },
    { snd: 'v_tt7',  say: 'Careful now. One slip and it is over.' },
    { snd: 'v_tt8',  say: 'You are playing right into my hands…' },
    { snd: 'v_tt9',  say: 'Hmm. You are better than you look.' },
    { snd: 'v_tt10', say: 'Let us trade — the endgame loves me.' },
  ];
  let lastTalkAt = 0;

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
    // Matchup and event information stay in fixed cells while turn status changes.
    for (const [id, value] of [['bannerIvory', displayName(IVORY)], ['bannerEbony', displayName(EBONY)]]) {
      $(id).textContent = value; $(id).title = value;
    }
    const tournament = arenaOn(), eventBout = G.arenaBout ?? arena.bouts;
    $('bannerEventLabel').textContent = tournament ? 'Season ' + (G.arenaSeason ?? arena.season) : 'Game';
    const context = tournament
      ? SEASON_STAGES[stageOfBout(eventBout)].name
      : G.mode === 'aivai' ? 'Exhibition' : G.mode === 'ai' ? 'Vs Computer' : 'Two players';
    let detail = tournament
      ? 'Bout ' + (eventBout + 1) + '/' + SEASON_LEN + (G.pairMeets >= 2 ? ' · ' + ord(G.pairMeets) + ' meeting' : '')
      : G.rs.name;
    const ending = lowMaterialCountdown(G.board, G.history, G.legal);
    if (ending && !G.over) detail = ending.scoringNext ? 'Draw countdown · scoring chance' : 'Draw in ' + ending.remaining + ' moves';
    $('bannerContext').textContent = context; $('bannerContext').title = context;
    $('bannerDetail').textContent = detail; $('bannerDetail').title = detail;
    const engineThinking = G.phase === 'thinking' && !G.over;
    banner.classList.toggle('thinking', engineThinking);
    document.body.classList.toggle('think-a', engineThinking && G.side === IVORY);
    document.body.classList.toggle('think-b', engineThinking && G.side !== IVORY);
    if (engineThinking) FX.thinkStart(); else FX.thinkStop();
    if (G.over) {
      const r = G.result;
      dot.className = 'dot ' + (r.winner === IVORY ? 'ivory' : r.winner === EBONY ? 'ebony' : sideDot());
      text.textContent = r.winner === null
        ? 'Draw' : displayName(r.winner) + ' wins';
      $('bannerContext').textContent = r.reason || context;
      $('bannerContext').title = r.reason || context;
      text.title = text.textContent;
      return;
    }
    dot.className = 'dot ' + sideDot();
    if (G.phase === 'thinking') {
      text.textContent = hintPending ? 'Looking for a hint' : (G.mode === 'ai' && G.side !== G.humanSide
        ? 'Thinking…' : 'Thinking — ' + displayName(G.side));
    } else if (G.phase === 'animating') {
      text.textContent = 'Moving — ' + displayName(G.side);
    } else {
      text.textContent = G.mode === 'ai'
        ? (G.side === G.humanSide ? 'Your move' : 'To move — ' + displayName(G.side))
        : 'To move — ' + displayName(G.side);
    }
    text.title = text.textContent;
  }
  function sideDot() { return G.side === IVORY ? 'ivory' : 'ebony'; }

  function updateTrays() {
    const perSide = (G.rs.n / 2) * G.rs.pieceRows;
    const byIvory = perSide - countSide(EBONY); // ebony losses = ivory's captures
    const byEbony = perSide - countSide(IVORY);
    const tray = (label, color, count) => {
      let minis = '';
      for (let i = 0; i < count; i++) minis += '<span class="mini ' + color + '"></span>';
      const safe = String(label).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      return '<span class="tray-name" tabindex="0" aria-label="' + safe + '">' + safe + '</span>' +
        '<b class="tray-count">' + count + '</b><span class="tray-captures" aria-hidden="true">' + minis + '</span>';
    };
    // arena games name the capturer, not the colour
    for (const [id, label, color, count] of [
      ['trayTop', 'Captured by ' + displayName(IVORY), 'ebony', byIvory],
      ['trayBottom', 'Captured by ' + displayName(EBONY), 'ivory', byEbony]]) {
      const el = $(id), renderKey = JSON.stringify([label,color,count]);
      if(el.__draftiTrayRenderKey===renderKey)continue;
      const previous = el.querySelector('.tray-name');
      const offset = previous && previous.textContent === label ? previous.scrollLeft : 0;
      const previousDiscs = el.querySelector('.tray-captures');
      const discOffset = previous && previous.textContent === label && previousDiscs ? previousDiscs.scrollLeft : 0;
      el.innerHTML = tray(label, color, count);
      el.querySelector('.tray-name').scrollLeft = offset;
      el.querySelector('.tray-captures').scrollLeft = discOffset;
      el.__draftiTrayRenderKey=renderKey;
    }
  }

  function updateHistory() {
    const ol = $('history');
    const last=G.history.at(-1),previous=ol.__draftiHistoryRender;
    const current={list:G.history,length:G.history.length,last,badge:last?.badge,notation:last?.notation,promotes:last?.move.promotes,
      mode:G.mode,rsId:G.rsId,emptyName:G.history.length?null:sideName(G.rs.firstSide)};
    // Thinking/moving transitions do not change the score sheet. Rebuilding
    // its entire growing DOM on each phase made late-game fast playback
    // progressively heavier. Moves, verdict badges, undo and restored
    // histories still invalidate this presentation-only cache immediately.
    if(previous&&Object.keys(current).every(key=>current[key]===previous[key]))return;
    ol.__draftiHistoryRender=current;
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
    const liveArena = G.mode === 'aivai' && !!G.board;
    for (const button of $('segDiff').querySelectorAll('button')) {
      button.disabled = G.mode === 'aivai' && LEVEL_IDS.indexOf(button.dataset.v) < 3;
    }
    set('segDiff', liveArena ? searchLevelForSide() : settings.diff);
    $('strengthLabel').textContent = liveArena
      ? 'Live strength — ' + displayName(G.side)
      : 'Starting strength — ten rungs up the ladder';
    $('liveStrength').hidden = !liveArena;
    if (liveArena) {
      $('liveStrength').textContent = displayName(IVORY) + ' — ' + LEVELS[G.diffIvory].name +
        ' · ' + displayName(EBONY) + ' — ' + LEVELS[G.diffEbony].name +
        (settings.aivaiAuto ? ' · Season ' + (G.arenaSeason ?? arena.season) : '');
    }
    set('segClock', settings.clock);
    set('segSpeed', G.aiSpeed);
    set('segStyle', settings.style);
    set('segStyleI', settings.styleIvory);
    set('segStyleE', settings.styleEbony);
    set('segStreamer', settings.streamer);
    set('segAudience', settings.audienceEnabled ? 'on' : 'off');
    $('segAudience').querySelector('[data-v="on"]').disabled = !AUDIENCE.installed();
    $('btnAudienceDownload').disabled = AUDIENCE.installing();
    $('btnAudienceRemove').disabled = !AUDIENCE.installed() || AUDIENCE.installing();
    $('audienceVolume').value = Math.round(settings.audienceVolume*100);
    $('audienceVolumeValue').textContent = Math.round(settings.audienceVolume*100)+'%';
    set('segProgression', humanLadder.automatic() ? 'on' : 'off');
    $('rowProgression').hidden = settings.mode !== 'ai';
    $('progressionNote').textContent = humanLadder.automatic()
      ? 'Next opponent: ' + LEVELS[humanLadder.current()].name + '. Each win advances one rung, up to The Machine. Draws and defeats keep your rung.'
      : 'Manual strength: ' + LEVELS[humanLadder.current()].name + '. Selecting a rung keeps it here until you enable automatic progression.';
    $('rowSide').style.display = settings.mode === 'ai' ? '' : 'none';
    $('rowDiff').style.display = settings.mode !== 'hotseat' ? '' : 'none';
    $('rowStyle').style.display = settings.mode === 'ai' ? '' : 'none';
    const arenaOnSetting = settings.mode === 'aivai' && settings.aivaiAuto;
    $('rowStyleI').style.display = settings.mode === 'aivai' && !settings.aivaiAuto ? '' : 'none';
    $('rowStyleE').style.display = settings.mode === 'aivai' && !settings.aivaiAuto ? '' : 'none';
    $('rowRounds').style.display = arenaOnSetting ? '' : 'none';
    $('rowHumanlike').style.display = settings.mode === 'aivai' || settings.mode === 'ai' ? '' : 'none';
    $('rowClock').style.display = settings.mode === 'aivai' ? 'none' : '';
    $('rowName').style.display = settings.mode === 'aivai' ? 'none' : '';
    $('name2Wrap').style.display = settings.mode === 'hotseat' ? '' : 'none';
    $('rowAuto').style.display = settings.mode === 'aivai' ? '' : 'none';
    $('rowNames').style.display = settings.mode === 'aivai' || settings.humanFlags ? '' : 'none';
    renderNameGrid();
    set('segAuto', settings.aivaiAuto ? 'on' : 'off');
    set('segRounds', settings.arenaRounds);
    set('segHumanlike', settings.humanlike ? 'on' : 'off');
    if ($('arenaNote')) {
      $('arenaNote').textContent = settings.mode !== 'aivai'
        ? 'The arena only runs in AI vs AI mode.'
        : settings.aivaiAuto
          ? ROSTER.length + ' nations rotate through the arena: Tanzania hosts the board and Kenya comes calling first, then East Africa, the rest of Africa, and every nation across Europe, Asia, the Americas and Oceania — open The players to rename any team you like. Each side\'s pieces wear its flag\'s colours; rename a team to anything else and its pieces return to the classic colours until the country\'s name comes back. The winner keeps the board; a beaten champion joins the back of the line, so no nation hogs the schedule. Every ' + SEASON_LEN +
            ' bouts a season closes — a full tournament of group stage, quarter-finals, semi-finals and a grand final, each step-up announced — and the world returns one rung stronger. A challenger never faces a champion more than two rungs above it, so bouts stay fair, and when two nations meet again, the game remembers and says so. When every nation has played and the champion still stands, it retires — with the ceremony it deserves.'
          : 'Hand-picked engines: pick the two schools yourself. Auto-rematch is off, so the game stops after every bout.';
    }
    renderArenaProgress();
    $('nameInput').value = settings.pname;
    $('name2Input').value = settings.pname2;
    const rs = E.RULESETS[settings.rsId];
    const stNote = settings.mode === 'aivai'
      ? (settings.aivaiAuto
        ? (rosterById(G.seatIvory).face ? rosterById(G.seatIvory).face + ' ' : '') + aiName(G.seatIvory) + ' (' +
          styleById(rosterById(G.seatIvory).styleId).name + ') vs ' +
          aiName(G.seatEbony) + ' (' +
          styleById(rosterById(G.seatEbony).styleId).name + ').'
        : styleById(settings.styleIvory).name + ' vs ' + styleById(settings.styleEbony).name + '.')
      : styleById(settings.style).blurb;
    $('setupNote').textContent = settings.mode === 'ai'
      ? rs.name + ' — ' + sideName(rs.firstSide) + ' opens. You play ' + sideName(settings.humanSide) + '. ' + stNote
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
    set('segPieces', settings.pieces);
  }

  function updateControls() {
    $('btnSavedLeague').hidden=!G.progressConflict;
    $('btnUndo').disabled = !G.history.length || G.phase === 'animating' || G.phase === 'over' || G.mode === 'aivai';
    $('btnHint').disabled = !humanTurn() || G.phase !== 'idle' || !G.legal.length;
    $('btnRotate').disabled = settings.mode !== 'hotseat';
    $('aivaiBar').hidden = settings.mode !== 'aivai';
    $('btnRetire').disabled = !(G.mode === 'aivai' && settings.aivaiAuto);
    $('btnRetire').classList.toggle('active', manualRetire);
    $('btnRetire').setAttribute('aria-pressed', String(manualRetire));
    $('btnRetire').textContent = manualRetire ? '🎖 Retirement on' : '🎖 Retirement off';
    $('qaBar').style.display = settings.mode === 'aivai' ? 'none' : '';
    $('qaHint').disabled = $('btnHint').disabled;
    $('qaUndo').disabled = $('btnUndo').disabled;
    $('qaHint').classList.toggle('active', hintPending);
  }

  function updateAll() {
    frameEl.classList.toggle('flip', shouldFlip());
    applyFlagPalettes();
    updateBanner();
    updateTrays();
    updateHistory();
    updateSegs();
    updateControls();
    renderHighlights();
    globalThis.DRAFTI_CINEMA?.refresh(G);
  }

  // ---------------- modals ----------------
  function openModal(id) {
    closeMenu(); // the drawer must not cover confirmation or statistics dialogs
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
      $('cfTitle').textContent='Start a new game?';$('cfText').textContent='The current game will be abandoned.';$('cfYes').textContent='New game';
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
  function renderPlayerProfiles() {
    const select=$('playerProfile');if(!select)return;
    const players=playerProgress.list(),signature=JSON.stringify([playerProgress.active().id,players]);
    if(select.dataset.signature===signature)return;
    select.replaceChildren();
    for(const player of players){const option=document.createElement('option');option.value=player.id;option.textContent=player.name;select.appendChild(option);}
    select.value=playerProgress.active().id;select.dataset.signature=signature;
  }
  function loadActivePlayer() {
    gameEpoch++;
    cancelVerdictWork();
    reqId++;aiPending=false;hintPending=false;cancelAutoNext();
    if(worker){worker.terminate();worker=null;}workerBroken=false;
    arena=loadJSON(ARENA_KEY,null)||{champion:'TZ',queue:ladderQueue('TZ'),appeared:[],season:1,bouts:0,xp:{},wins:{},streak:0,challRounds:0};
    guardArena();
    for(const key of Object.keys(arenaProgress))delete arenaProgress[key];
    Object.assign(arenaProgress,loadJSON(ARENA_PROGRESS_KEY,{})||{});
    if(!arenaProgress.bonusXp || typeof arenaProgress.bonusXp!=='object')arenaProgress.bonusXp={};
    for(const key of Object.keys(stats))delete stats[key];Object.assign(stats,loadJSON(STATS_KEY,{})||{});
    humanLadder=createHumanProgression(loadJSON(HUMAN_LADDER_KEY,null),settings.diff);
    mistakeMemory=createMistakeMemory(loadJSON(LEARNING_KEY,null));
    arenaProgressSignature='';settings.pname=cleanName(playerProgress.active().name,'Uhakika');saveJSON(SETTINGS_KEY,settings);
    if(!resumeLeagueMatch())newGame();renderPlayerProfiles();
  }
  $('playerProfile').addEventListener('change',()=>{
    const target=$('playerProfile').value;
    if(G.progressConflict)playerProgress.refresh();else saveCurrentMatch();
    const saved=playerProgress.switchTo(target);loadActivePlayer();
    if(!saved)flashWhisper('Player switched for this session; this device could not save the change.');
  });
  $('btnPlayerCreate').addEventListener('click',()=>{
    const name=cleanName($('newPlayerName').value,'');
    if(!name){flashWhisper('Enter a player name first.');return;}
    saveCurrentMatch();const id=playerProgress.create(name);
    if(!id){flashWhisper('Use a different player name; up to twelve local players can be saved.');return;}
    $('newPlayerName').value='';loadActivePlayer();
    if(!playerProgress.persist())flashWhisper('This player is available now, but this device could not save the profile.');
  });
  $('btnLeagueReset').addEventListener('click',()=>{
    $('cfTitle').textContent='Reset this player’s league?';
    $('cfText').textContent='Restart '+playerProgress.active().name+'’s league, nation experience and saved arena match. Personal records, other players and appearance stay intact.';
    $('cfYes').textContent='Reset league';
    pendingConfirm=()=>{playerProgress.resetLeague();loadActivePlayer();};openModal('modalConfirm');
  });
  $('btnSavedLeague').addEventListener('click',()=>{
    const id=playerProgress.active().id;playerProgress.refresh();playerProgress.switchTo(id);loadActivePlayer();
  });
  renderPlayerProfiles();
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
    confirmIfNeeded(() => { settings.mode = v; saveJSON(SETTINGS_KEY, settings); if(!resumeLeagueMatch())newGame(); });
  });
  wireSeg('segStreamer', (v) => {
    if (v === settings.streamer) return;
    settings.streamer = v;
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    STREAMER.reset();
    STREAMER.joinedMidgame = G.history.length > 0;
    if (STREAMER.joinedMidgame) STREAMER.rememberSession();
    // Selecting a mode is silent. Its next real game event supplies context;
    // joining an ongoing match must not replay a new-game welcome.
  });
  wireSeg('segSide', (v) => {
    const s = +v;
    if (s === settings.humanSide) return;
    confirmIfNeeded(() => { settings.humanSide = s; saveJSON(SETTINGS_KEY, settings); newGame(); });
  });
  wireSeg('segDiff', (v) => {
    if (G.mode === 'ai' && humanLadder.manual(v)) saveHumanLadder();
    changeDifficulty(v);
  });
  wireSeg('segProgression', v => {
    humanLadder.setAutomatic(v === 'on');saveHumanLadder();updateSegs();
  });
  $('btnLadderReset').addEventListener('click', () => confirmIfNeeded(() => {
    humanLadder=createHumanProgression({schema:1,automatic:true,level:1});saveHumanLadder();newGame();
  }));
  wireSeg('segAudience', v => {
    if (v === 'on' && !AUDIENCE.installed()) return;
    settings.audienceEnabled=v === 'on';saveJSON(SETTINGS_KEY,settings);
    if (!settings.audienceEnabled) AUDIENCE.stop();updateSegs();
  });
  $('btnAudienceDownload').addEventListener('click',async()=>{await AUDIENCE.install();updateSegs();});
  $('btnAudienceRemove').addEventListener('click',async()=>{await AUDIENCE.remove();updateSegs();});
  $('audienceVolume').addEventListener('input',event=>{
    settings.audienceVolume=Math.max(0,Math.min(1,+event.target.value/100));
    $('audienceVolumeValue').textContent=Math.round(settings.audienceVolume*100)+'%';saveJSON(SETTINGS_KEY,settings);
  });
  wireSeg('segClock', (v) => {
    settings.clock = +v; saveJSON(SETTINGS_KEY, settings);
    clockArmedKey = -1; // re-arm with the new budget
    updateSegs();
  });
  function revealPlaybackNeighbour(speed, previous) {
    const box=$('segSpeed'),buttons=Array.from(box.querySelectorAll('button'));
    const direction=Math.sign(speed-previous);if(!direction)return;
    const index=buttons.findIndex(b=>+b.dataset.v===speed);if(index<0)return;
    const next=buttons[Math.max(0,Math.min(buttons.length-1,index+direction))];
    const frame=box.getBoundingClientRect(),a=buttons[index].getBoundingClientRect(),b=next.getBoundingClientRect();
    const left=Math.min(a.left,b.left)-frame.left+box.scrollLeft;
    const right=Math.max(a.right,b.right)-frame.left+box.scrollLeft;
    let target=box.scrollLeft;
    if(left<target+3)target=left-3;
    else if(right>target+box.clientWidth-3)target=right-box.clientWidth+3;
    target=Math.max(0,Math.min(box.scrollWidth-box.clientWidth,target));
    box.scrollTo({left:target,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  wireSeg('segSpeed', (v) => {
    if (![1, 2, 4, 6, 8, 10, 16].includes(+v)) return;
    const previous=G.aiSpeed;
    settings.speed = +v; G.aiSpeed = +v;
    presentationWait?.retime();
    saveJSON(SETTINGS_KEY, settings); updateSegs();
    revealPlaybackNeighbour(+v,previous);
  });
  wireSeg('segAuto', (v) => {
    settings.aivaiAuto = v === 'on';
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    if (!settings.aivaiAuto) cancelAutoNext();
  });
  wireSeg('segRounds', (v) => {
    settings.arenaRounds = +v;
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    SFX_BANK.play('ui_toggle_on');
  });
  wireSeg('segHumanlike', (v) => {
    settings.humanlike = v === 'on';
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    SFX_BANK.play(settings.humanlike ? 'ui_toggle_on' : 'ui_toggle_off');
    if (settings.humanlike) flashWhisper('AI human mode: the engines will sit down and play like people.');
  });

  $('btnRetire').addEventListener('click', () => {
    if (!arenaOn()) return;
    manualRetire = !manualRetire;
    settings.retireEvents = manualRetire;
    saveJSON(SETTINGS_KEY, settings);
    updateControls();
    SFX_BANK.play('notify_pop');
    flashWhisper(manualRetire ? 'Retirement announcements stay on for qualifying results until switched off.' : 'Automatic retirement announcements switched off.');
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


  const nationOptions = ROSTER.map(r => '<option value="' + r.id + '">' + r.name + '</option>').join('');
  for (const [id, key] of [['nationIvory', 'nationIvory'], ['nationEbony', 'nationEbony']]) {
    $(id).innerHTML = nationOptions;
    $(id).value = presentation[key];
    $(id).addEventListener('change', () => {
      presentation[key] = $(id).value;
      saveJSON(PRESENTATION_KEY, presentation);
      applyFlagPalettes();
      SFX_BANK.play('ui_save');
    });
  }
  function syncPresentation() {
    $('humanFlags').checked = !!settings.humanFlags;
    $('arenaFlags').checked = settings.arenaFlags !== false;
    $('streamView').checked = !!presentation.stream;
    document.body.classList.toggle('stream-view', !!presentation.stream);
  }
  for (const id of ['humanFlags', 'arenaFlags']) $(id).addEventListener('change', () => {
    settings[id] = $(id).checked;
    saveJSON(SETTINGS_KEY, settings);
    updateSegs();
    applyFlagPalettes();
    SFX_BANK.play('ui_save');
  });
  $('streamView').addEventListener('change', () => {
    presentation.stream = $('streamView').checked;
    saveJSON(PRESENTATION_KEY, presentation);
    syncPresentation();
    SFX_BANK.play('ui_save');
  });
  $('btnFullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { flashWhisper('Use your browser’s full-screen option on this device.'); }
  });
  syncPresentation();

  $('btnNameReset').addEventListener('click', () => {
    const had = Object.keys(nameOverrides).length > 0;
    for (const k of Object.keys(nameOverrides)) delete nameOverrides[k];
    saveNames();
    renderNameGrid();
    updateAll();
    SFX_BANK.play(had ? 'ui_toggle_on' : 'ui_click');
    if (had) flashWhisper('Every nation has its name back — the flag colours return.');
  });

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
    saveCurrentMatch();
    if (!G.aiPaused) scheduleAI();
  });
  $('btnSound').addEventListener('click', () => {
    settings.sound = !settings.sound;
    FX.syncVolume();
    saveJSON(SETTINGS_KEY, settings);
    if (!settings.sound) FX.thinkStop();
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
    if (key === 'think' && !settings.sfx.think) FX.thinkStop();
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

  // Deliberate previews are separate from automatic gameplay reactions.
  const paletteLabels = { stage_group: 'Group stage', stage_quarter: 'Quarter-final', stage_semi: 'Semi-final',
    stage_final: 'Grand final', king_glint: 'King shimmer', retention: 'Title defence', oneup: 'One up',
    laugh_baby_short: 'Baby giggle', laugh_baby_full: 'Baby laughter', munch_mmm: 'Chewing · mmm',
    sorry_dontcry: 'Sorry, don’t cry', dont_cry: 'Don’t cry', pregnant_shock: 'Surprised exclamation',
    stream_greeting: 'Streamer: welcome', stream_cta: 'Streamer: like & share', stream_praise: 'Streamer: nice move',
    stream_great: 'Streamer: brilliant!', stream_capture: 'Streamer: capture', stream_feast: 'Streamer: double jump!',
    stream_blunder: 'Streamer: oh no', stream_gift: 'Streamer: a gift!', stream_trap: 'Streamer: trap warning',
    stream_trap_spring: 'Streamer: trap springs!', stream_crown: 'Streamer: kinged!', stream_streak: 'Streamer: on fire',
    stream_comeback: 'Streamer: comeback!', stream_victory: 'Streamer: victory!', stream_defeat: 'Streamer: so close',
    stream_think: 'Streamer: while it thinks', stream_outro: 'Streamer: sign-off' };
  const paletteTitle = id => paletteLabels[id] || id.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  for (const event of [...new Set(Object.values(SFX_BANK.defs).map(d => d.event).filter(Boolean))]) {
    const button = document.createElement('button'); button.className = 'btn'; button.dataset.event = event;
    button.textContent = paletteTitle(event); $('sfxPalette').appendChild(button);
  }
  for (const id of Object.keys(SFX_BANK.ownerMap)) {
    const button = document.createElement('button'); button.className = 'btn'; button.dataset.clip = id;
    button.textContent = paletteTitle(id); $('sfxOriginals').appendChild(button);
  }
  for (const grid of [$('sfxPalette'), $('sfxOriginals')]) grid.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    FX.ensure(); SFX_BANK.decodeAll();
    const sound = button.dataset.event ? SFX_BANK.effect(button.dataset.event, { vol: .42 }) : SFX_BANK.audition(button.dataset.clip);
    $('sfxPreviewStatus').textContent = !settings.sound ? 'Sound is muted.' : sound ? 'Playing: ' + button.textContent : 'Choose another sound, or check its category switch.';
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
    SFX_BANK.effect('theme', { vol: .18 });
  });

  // piece-style picker: swatch buttons with a two-dot preview of the men
  const pieceSeg = $('segPieces');
  for (const p of PIECES) {
    const b = document.createElement('button');
    b.dataset.v = p.id;
    b.title = p.name;
    b.className = 'piece-opt';
    b.innerHTML = p.prev
      ? '<span class="dot l" style="background:' + p.prev[0] + '"></span>' +
        '<span class="dot d" style="background:' + p.prev[1] + '"></span>' + p.name
      : p.name;
    pieceSeg.appendChild(b);
  }
  wireSeg('segPieces', (v) => {
    settings.pieces = v;
    saveJSON(SETTINGS_KEY, settings);
    applyPieces(v);
    FX.play('move');
    SFX_BANK.play('ui_theme', { vol: 0.7 });
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
    SFX_BANK.effect('drawer', { vol: .12 });
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
  // Tier timing only decides WHEN a think reaction may fire; WHICH clip plays
  // always comes off the shared no-repeat think deck below.
  const THINK_TIERS = [
    { at: 6500, say: 'Take your time…', soft: true },
    { at: 12000, say: 'Still thinking…' },
    { at: 25000, say: 'Any day now…' },
    { at: 45000, say: 'Just agree you lost…' },
    { at: 75000, say: 'Need help?' },
    { at: 105000, say: 'I age…' },
  ];
  let thinkArmedKey = -1, humanThinkStart = 0, thinkFired = 0;
  let clockArmedKey = -1, clockDeadline = 0, lastTickSec = -1;
  const turnKey = () => G.history.length * 2 + (G.side === IVORY ? 0 : 1);

  // ---- shared decks, with context-aware thinking pools ----
  // Ordinary decks keep their Fisher-Yates cycle. Director decks prefer the
  // least-used eligible recording, respecting current actor, category history,
  // cooldowns, narrator voice and mood without getting stuck on blocked cards.
  function makeDeck(ids) {
    const bag = ids.slice();
    const uses = new Map();
    let last = null;
    const shuffle = () => {
      for (let i = bag.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = bag[i]; bag[i] = bag[j]; bag[j] = t;
      }
    };
    shuffle();
    return (eligible) => {
      if (typeof eligible === 'function') {
        // Prefer the least-used eligible recording. A depleted voice/mood
        // cannot strand the deck forever while incompatible cards remain.
        const candidates = ids.filter(eligible);
        if (!candidates.length) return null;
        const minimum = Math.min(...candidates.map(id => uses.get(id) || 0));
        const fresh = candidates.filter(id => (uses.get(id) || 0) === minimum);
        const different = fresh.filter(id => id !== last);
        const pool = different.length ? different : fresh;
        const id = pool[(Math.random() * pool.length) | 0];
        uses.set(id, (uses.get(id) || 0) + 1); last = id;
        return id;
      }
      if (!bag.length) { bag.push(...ids); shuffle(); }
      let ix = bag.length - 1;
      if (bag[ix] === last && bag.length > 1) ix = (Math.random() * (bag.length - 1)) | 0;
      const id = bag.splice(ix, 1)[0];
      last = id;
      return id;
    };
  }
  const THINK_POOL = [].concat(
    ['th_n01', 'th_n02', 'th_n03', 'th_n04', 'th_n05', 'th_n06', 'th_n07',
     'th_n08', 'th_n09', 'th_n10', 'th_n11', 'th_n12', 'th_n13', 'th_n14',
     'th_n15', 'th_n16', 'th_n17', 'th_n18', 'th_n19', 'th_n20', 'th_n21',
     'th_n22', 'th_n23', 'th_n24',
     'th_n01b', 'th_n02b', 'th_n03b', 'th_n04b', 'th_n05b', 'th_n06b', 'th_n07b',
     'th_n08b', 'th_n09b', 'th_n10b', 'th_n11b', 'th_n13b', 'th_n14b',
     'th_n15b', 'th_n16b', 'th_n17b', 'th_h01', 'th_h02', 'th_h03', 'th_h04', 'th_h05', 'th_h06', 'th_h07',
     'th_h08', 'th_h09', 'th_h10', 'th_h11', 'th_h12', 'th_h13', 'th_h14',
     'th_h15', 'th_h16', 'th_h17', 'th_h18', 'th_h19', 'th_h20',
     't1a', 't1b', 't1c', 't1d', 't1e', 't2a', 't2b', 't2c', 't2d', 't2e',
     't3a', 't3b', 't3c', 't3d', 't4a', 't4b', 't4c', 't4d', 't5a', 't5b', 't5c', 'v_time',
     'later_moments', 'later_hours',
     'th_m1', 'th_m2', 'th_m3', 'th_m4', 'th_m5', 'th_m6',
     'th_g1', 'th_g2', 'th_p1', 'th_p2', 'th_p3', 'th_o1', 'th_o2', 'th_o3', 'th_o4',
     'th_t1', 'th_t2', 'th_t3', 'th_t4', 'th_t5', 'th_t6', 'th_c1', 'th_f1', 'th_s1'],
    SFX_BANK.defs.th_n01 ? [] : ['notify_pop']
  );
  const thinkSound = (actor) => SFX_BANK.drawCue('narrator:' + actor, THINK_POOL, actor);

  // narrator time cards while an engine is lost in thought. Thresholds are
  // tuned to the ladder's real budgets: only genuinely long thinks (budget +
  // margin) ever trigger one, the clip itself comes off the no-repeat deck,
  // and the gag sits on a leash (45 s global, three per game, silent at 2×/4×
  // spectator speed) so it can never become a metronome.
  const AI_CARDS = [
    { at: 3400, say: 'Deep in thought…' },
    { at: 8500, say: 'Still calculating…' },
  ];
  let aiCardKey = -1, aiCardStart = 0, aiCardFired = 0;
  let lastAiCardAt = 0, aiCardsThisGame = 0; // the gag stays on a leash

  setInterval(() => {
    STREAMER.pulse();
    AUDIENCE.pulse();
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
      // A narrator card is a rare gag, not a metronome: the think must be
      // genuinely long for its rung (budget + margin), the gag itself sits on
      // a 45 s global leash with three per game, and it rests entirely at
      // 2×/4× spectator speed.
      const seatLevel = G.mode === 'aivai' ? (G.side === IVORY ? G.diffIvory : G.diffEbony) : G.diff;
      const budgetFloor = Math.min((LEVELS[seatLevel] || LEVELS.l5).budgetMs,
        G.mode === 'ai' ? 1300 : 1e9) + 500;
      while (aiCardFired < AI_CARDS.length && dt >= Math.max(AI_CARDS[aiCardFired].at, budgetFloor)) {
        if (G.mode === 'aivai' && G.aiSpeed > 1 || Date.now() - lastAiCardAt < 45000 || aiCardsThisGame >= 3) break;
        const card = AI_CARDS[aiCardFired++];
        const source = SFX_BANK.play(thinkSound('engine'), { vol: 0.9, narrator: true, narratorActor: 'engine', queue: false });
        if (source) { lastAiCardAt = Date.now(); aiCardsThisGame++; }
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
      // A visual nudge, without an idle clock tick.
      if (tier.soft) {
        flashWhisper(tier.say);
        continue;
      }
      // a dead-quiet position (tier 3): crickets first, sometimes
      if (tier.at === 45000 && Math.random() < 0.3) SFX_BANK.play('cricket');
      const epoch = SFX_BANK.audioEpoch, position = SFX_BANK.queuePosition();
      setTimeout(() => {
        const current = SFX_BANK.queuePosition();
        if (epoch !== SFX_BANK.audioEpoch || position.ply !== current.ply || position.side !== current.side || current.over) return;
        SFX_BANK.play(thinkSound('human'), { vol: 0.95, narrator: true, narratorActor: 'human', queue: false });
      }, 170);
      flashWhisper(tier.say);
    }
  }, 250);

  // ---------------- boot ----------------
  const AUDIENCE = createAudienceVibes({
    settings,location,crypto:window.crypto,caches:window.caches,fetch:(...args)=>fetch(...args),
    now:()=>performance.now(),random:()=>Math.random(),bank:SFX_BANK,fx:FX,
    context:()=>({epoch:gameEpoch,menu:drawerOpen,hidden:document.hidden,paused:G.mode==='aivai'&&G.aiPaused,
      conflict:G.progressConflict,ceremony:!$('ceremony').hidden,over:G.over,tension:!!G.board&&countSide(IVORY)<=4&&countSide(EBONY)<=4}),
    status:text=>{$('audienceStatus').textContent=text;
      $('segAudience').querySelector('[data-v="on"]').disabled=!AUDIENCE.installed();},
    save:()=>saveJSON(SETTINGS_KEY,settings),
    played:row=>{
      if (row.purpose === 'cheer' && settings.audienceVolume > 0 &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const tray = $(row.side === IVORY ? 'trayTop' : 'trayBottom');
        tray?.animate?.([
          {outline: '2px solid transparent', outlineOffset: '1px'},
          {outline: '2px solid var(--accent-soft)', outlineOffset: '3px', offset: .25},
          {outline: '2px solid transparent', outlineOffset: '5px'},
        ], {duration: 700, easing: 'ease-out'});
      }
      if(SOUND_AUDIT){const event={...row,kind:'audience',category:'audience',at:Math.round(performance.now()),
      mode:G.mode,ply:G.history.length,run:performance.timeOrigin,epoch:SFX_BANK.audioEpoch,phase:G.phase};
      console.info('[DRAFTI audio]',JSON.stringify(event));SOUND_AUDIT.sound(event);}},
  });
  SFX_BANK.audienceHook=info=>AUDIENCE.bankStarted(info);
  SFX_BANK.audienceReset=()=>AUDIENCE.stop();
  applyTheme(settings.theme);
  applyPieces(settings.pieces);
  document.body.classList.toggle('hv', !!settings.hv);
  document.body.classList.toggle('ambient-off', !settings.ambient);
  if(!resumeLeagueMatch())newGame();
  try { FX.ensure(); } catch { /* audio starts on first gesture instead */ }
  AUDIENCE.init();

  // Minimal test hook: lets automated tests drive the real input path and
  // inspect game state. Not used by the game itself.
  window.__drafti = {
    state: G, tap: onSquareClick, sfx: SFX_BANK, fx: FX, rebuild: rebuildPieces,
    menu: { open: openMenu, close: closeMenu, isOpen: () => drawerOpen },
    workerSource,
    engine: E, executeMove, showGameOver, settings,
    arena: () => arena, // live arena state, for automated verification
  };
})();
