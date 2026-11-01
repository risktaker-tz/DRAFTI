'use strict';
/* DRAFTI web UI — game state, rendering, input, animation, AI worker, extras. */
(function () {
  const E = makeEngine();
  const IVORY = E.IVORY, EBONY = E.EBONY;
  const HOP_MS = 200;
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const CROWN = '<svg class="crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18h17l1.4-9.2-5.4 3.6L12 5.2 7.5 12.4 2.1 8.8z" stroke-width="1"/></svg>';

  // ---------------- persistence ----------------
  const SETTINGS_KEY = 'drafti.settings.v1';
  const STATS_KEY = 'drafti.stats.v1';
  function loadJSON(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : fb; } catch { return fb; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode etc. */ } }

  const settings = Object.assign(
    { rsId: 'american', mode: 'ai', diff: 'medium', humanSide: IVORY, sound: true, rotate: true },
    loadJSON(SETTINGS_KEY, {})
  );
  if (!E.RULESETS[settings.rsId]) settings.rsId = 'american';
  if (settings.mode !== 'ai' && settings.mode !== 'hotseat') settings.mode = 'ai';
  if (!['easy', 'medium', 'hard'].includes(settings.diff)) settings.diff = 'medium';

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
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
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
      o.connect(g); g.connect(ctx.destination);
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
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start(t);
    },
    play(name) {
      if (!settings.sound) return;
      try {
        switch (name) {
          case 'select': this.tone(340, 0.05, 'triangle', 0.10); break;
          case 'move': this.noise(0.06, 0.16, 0, 900); this.tone(190, 0.08, 'triangle', 0.14, 0, 140); break;
          case 'capture': this.noise(0.09, 0.26, 0, 620); this.tone(120, 0.13, 'sine', 0.28, 0, 68); break;
          case 'king': this.tone(660, 0.14, 'triangle', 0.18); this.tone(990, 0.2, 'triangle', 0.18, 0.1); break;
          case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.2, i * 0.13)); break;
          case 'lose': [392, 330, 262].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.18, i * 0.16)); break;
          case 'draw': this.tone(440, 0.2, 'triangle', 0.16); this.tone(440, 0.28, 'triangle', 0.16, 0.24); break;
          case 'illegal': this.tone(110, 0.07, 'square', 0.1); this.tone(100, 0.08, 'square', 0.1, 0.09); break;
          case 'undo': this.tone(300, 0.09, 'triangle', 0.13, 0, 210); break;
        }
      } catch { /* audio is best-effort */ }
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
  };

  const posKey = (b, s) => b.join(',') + '|' + s;
  const boardAt = (i) => G.board[i];
  const pieceAt = (sq) => G.pieces.find((p) => p.sq === sq);
  const countSide = (s) => { let n = 0; for (let i = 0; i < G.board.length; i++) if (G.board[i] * s > 0) n++; return n; };
  const sideName = (s) => (s === IVORY ? 'Ivory' : 'Ebony');
  const humanTurn = () => !G.over && (G.mode === 'hotseat' || G.side === G.humanSide);

  function repAdd(k) { G.repMap.set(k, (G.repMap.get(k) || 0) + 1); }
  function repRemove(k) { const v = (G.repMap.get(k) || 0) - 1; if (v <= 0) G.repMap.delete(k); else G.repMap.set(k, v); }

  // ---------------- AI worker ----------------
  let worker = null, workerBroken = false, reqId = 0, aiPending = false, hintPending = false, thinkStart = 0;

  function getWorker() {
    if (worker || workerBroken) return worker;
    try {
      const src =
        'const makeEngine = (' + makeEngine.toString() + ');\n' +
        'const E = makeEngine();\n' +
        'self.onmessage = (e) => {\n' +
        '  const d = e.data; if (d.cmd !== "search") return;\n' +
        '  const t0 = Date.now();\n' +
        '  const res = E.search(E.RULESETS[d.rsId], new Int8Array(d.board), d.side, d.opts);\n' +
        '  res.id = d.id; res.cmd = "searchResult"; res.ms = Date.now() - t0;\n' +
        '  postMessage(res);\n' +
        '};';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = (e) => handleSearch(e.data);
      worker.onerror = () => { workerBroken = true; worker = null; };
    } catch { workerBroken = true; }
    return worker;
  }

  const DIFF_OPTS = {
    easy: { budgetMs: 120, maxDepth: 2, jitter: 30 },
    medium: { budgetMs: 420, maxDepth: 10, jitter: 6 },
    hard: { budgetMs: 1200, maxDepth: 24, jitter: 2 },
  };

  function runSearch(kind) {
    const id = ++reqId;
    thinkStart = Date.now();
    const payload = {
      cmd: 'search', id, rsId: G.rsId, side: G.side, noProgress: G.noProg,
      board: G.board,
      opts: kind === 'hint'
        ? { budgetMs: 600, maxDepth: 12, jitter: 0 }
        : DIFF_OPTS[G.diff] || DIFF_OPTS.medium,
    };
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
      updateAll();
      return;
    }
    // keep the computer's move from feeling instant
    const delay = Math.max(0, 450 - (Date.now() - thinkStart));
    setTimeout(() => {
      if (res.id !== reqId || G.phase !== 'idle') return;
      if (G.diff === 'easy' && Array.isArray(res.rootScores) && res.rootScores.length > 1) {
        if (Math.random() < 0.18) { executeMove(G.legal[(Math.random() * G.legal.length) | 0]); return; }
        const top = res.rootScores.reduce((a, b) => (b.score > a ? b.score : a), -Infinity);
        const pool = res.rootScores.filter((r) => r.score >= top - 90);
        const pick = pool[(Math.random() * pool.length) | 0];
        const m2 = G.legal.find((m) => m.path.join() === pick.m.path.join());
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
    for (const el of squareEls()) el.classList.remove('sel', 'hop', 'target', 'capture-target', 'last', 'hint');
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
    if (!G.sel || !humanTurn()) return;
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

  async function executeMove(mv) {
    if (!mv || G.phase !== 'idle') return;
    G.phase = 'animating';
    G.sel = null; G.hint = null;
    updateAll();
    await animateMove(mv);
    commitMove(mv);
    checkGameEnd();
    G.phase = G.over ? 'over' : 'idle';
    updateAll();
    if (!G.over) scheduleAI();
    else showGameOver();
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
    FX.play(G.mode === 'ai'
      ? (r.winner === null ? 'draw' : r.winner === G.humanSide ? 'win' : 'lose')
      : r.winner === null ? 'draw' : 'king');
    $('goTitle').textContent = r.winner === null ? 'A draw'
      : (G.mode === 'ai'
        ? (r.winner === G.humanSide ? 'You win' : 'The computer wins')
        : sideName(r.winner) + ' wins');
    $('goResult').textContent = r.winner === null ? 'Honours are shared.'
      : sideName(r.winner) + ' takes the game.';
    $('goReason').textContent = r.reason || '';
    setTimeout(() => openModal('modalGameOver'), 650);
  }

  // ---------------- game lifecycle ----------------
  function newGame() {
    reqId++; // invalidate any in-flight search
    aiPending = false; hintPending = false;
    G.rs = E.RULESETS[settings.rsId];
    G.rsId = settings.rsId;
    G.mode = settings.mode;
    G.diff = settings.diff;
    G.humanSide = settings.humanSide;
    G.sqn = E.squareNumbers(G.rs);
    G.board = E.setupBoard(G.rs);
    G.side = G.rs.firstSide;
    G.noProg = 0;
    G.history = [];
    G.repMap = new Map();
    repAdd(posKey(G.board, G.side));
    G.legal = E.legalMoves(G.rs, G.board, G.side);
    G.over = false; G.result = null; G.recorded = false;
    G.phase = 'idle'; G.sel = null; G.hint = null; G.lastMove = null;
    buildBoard();
    rebuildPieces();
    updateAll();
    scheduleAI();
  }

  function undo() {
    if (!G.history.length || G.phase === 'animating' || G.phase === 'over') return;
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
    G.legal = E.legalMoves(G.rs, G.board, G.side);
    rebuildPieces();
    FX.play('undo');
    G.phase = 'idle';
    updateAll();
  }

  function scheduleAI() {
    if (G.over || G.phase !== 'idle') return;
    if (G.mode !== 'ai' || G.side === G.humanSide) return;
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
        : sideName(r.winner) + ' wins — ' + (r.reason || '');
      return;
    }
    dot.className = 'dot ' + sideDot();
    if (G.phase === 'thinking') {
      banner.classList.add('thinking');
      text.textContent = hintPending ? 'Looking for a hint' : (G.mode === 'ai' && G.side !== G.humanSide
        ? 'The computer is thinking' : sideName(G.side) + ' to move');
    } else if (G.phase === 'animating') {
      text.textContent = sideName(-G.side) + ' moves…';
    } else {
      text.textContent = G.mode === 'ai'
        ? (G.side === G.humanSide ? 'Your move — ' + sideName(G.side) : sideName(G.side) + ' to move')
        : sideName(G.side) + ' to move';
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
      return;
    }
    let html = '';
    G.history.forEach((h, ix) => {
      html += '<li' + (ix === G.history.length - 1 ? ' class="current"' : '') + '>' +
        '<span class="no">' + (ix + 1) + '.</span>' +
        '<span class="pdot ' + (h.side === IVORY ? 'ivory' : 'ebony') + '"></span>' +
        '<span>' + h.notation + (h.move.promotes ? ' ♔' : '') + '</span></li>';
    });
    ol.innerHTML = html;
    ol.scrollTop = ol.scrollHeight;
  }

  function updateSegs() {
    const set = (id, val) => {
      for (const b of $(id).querySelectorAll('button')) b.classList.toggle('active', b.dataset.v === String(val));
    };
    set('segRules', settings.rsId);
    set('segMode', settings.mode);
    set('segSide', settings.humanSide);
    set('segDiff', settings.diff);
    $('rowSide').style.display = settings.mode === 'ai' ? '' : 'none';
    $('rowDiff').style.display = settings.mode === 'ai' ? '' : 'none';
    const rs = E.RULESETS[settings.rsId];
    $('setupNote').textContent = settings.mode === 'ai'
      ? rs.name + ' — ' + sideName(rs.firstSide) + ' opens. You play ' + sideName(settings.humanSide).toLowerCase() + '.'
      : rs.name + ' — ' + sideName(rs.firstSide) + ' opens. Pass and play.';
    $('btnRotate').style.display = settings.mode === 'hotseat' ? '' : 'none';
    $('btnSound').textContent = settings.sound ? '🔊' : '🔇';
    $('btnRotate').classList.toggle('active', settings.mode === 'hotseat' && settings.rotate);
  }

  function updateControls() {
    $('btnUndo').disabled = !G.history.length || G.phase === 'animating' || G.phase === 'over';
    $('btnHint').disabled = !humanTurn() || G.phase !== 'idle' || !G.legal.length;
    $('btnRotate').disabled = settings.mode !== 'hotseat';
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
    const rows = ['american', 'international'].map((rid) => {
      const s = Object.assign({ p: 0, w: 0, l: 0, d: 0, bestRun: 0 }, stats[rid]);
      const name = E.RULESETS[rid].name;
      return '<tr><td>' + name + '</td><td>' + s.p + '</td><td>' + s.w + '</td><td>' + s.l + '</td><td>' + s.d + '</td><td>' + s.bestRun + '</td></tr>';
    }).join('');
    $('statsTable').innerHTML =
      '<tr><th>Ruleset</th><th>Played</th><th>Won</th><th>Lost</th><th>Drawn</th><th>Best run</th></tr>' + rows;
    openModal('modalStats');
  }

  // ---------------- controls wiring ----------------
  function wireSeg(id, apply) {
    $(id).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
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

  $('btnNew').addEventListener('click', () => confirmIfNeeded(newGame));
  $('btnUndo').addEventListener('click', undo);
  $('btnHint').addEventListener('click', requestHint);
  $('btnStats').addEventListener('click', showStats);
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

  $('goRematch').addEventListener('click', () => { closeModals(); newGame(); });
  $('goClose').addEventListener('click', closeModals);
  $('statsClose').addEventListener('click', closeModals);
  $('statsReset').addEventListener('click', () => {
    stats.american = {}; stats.international = {};
    saveStats(); showStats();
  });
  $('cfYes').addEventListener('click', () => { closeModals(); const f = pendingConfirm; pendingConfirm = null; if (f) f(); });
  $('cfNo').addEventListener('click', () => { closeModals(); pendingConfirm = null; });
  $('backdrop').addEventListener('pointerdown', (e) => {
    if (e.target !== $('backdrop')) return;
    if (!$('modalConfirm').hidden) return; // confirm needs an explicit choice
    closeModals();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('modalConfirm').hidden) { closeModals(); pendingConfirm = null; }
      else closeModals();
    }
  });

  // ---------------- boot ----------------
  newGame();

  // Minimal test hook: lets automated tests drive the real input path and
  // inspect game state. Not used by the game itself.
  window.__drafti = { state: G, tap: onSquareClick };
})();
