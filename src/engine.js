'use strict';
/*
 * DRAFTI rules engine — an original implementation of five public-domain
 * draughts rulesets:
 *
 *   - american      American Checkers / English draughts, 8x8, 12 men a side.
 *                   Dark side opens. Men capture forward only. Kings step one
 *                   square. A man entering the king row is crowned and the move
 *                   ends immediately. Captures are mandatory (free choice among
 *                   sequences; continuation of a multi-jump is forced).
 *
 *   - international International Draughts (FMJD), 10x10, 20 men a side.
 *                   Light side opens. Men capture forward AND backward. Kings
 *                   fly any distance and pick their landing square. Maximum
 *                   capture is compulsory. A man is crowned only if it ENDS its
 *                   turn on the far edge (passing through does not crown).
 *
 *   - brazilian     Brazilian Draughts (Dama), 8x8, 12 men a side: the
 *                   international rules played on the smaller board. Light
 *                   side opens, flying kings, men capture both ways, maximum
 *                   capture compulsory, pass-through does not crown.
 *
 *   - canadian      Canadian Draughts (Grand Jeu), 12x12, 30 men a side:
 *                   international rules on the big board. Same flags, more
 *                   space — flying kings dominate the endgame.
 *
 *   - russian       Russian Draughts (Shashki), 8x8, 12 men a side. Light
 *                   side opens. Men capture forward AND backward, kings fly.
 *                   Captures are mandatory, but there is NO majority rule:
 *                   any capture sequence may be chosen. A man that lands on
 *                   the king row mid-capture is crowned immediately and — if
 *                   the king can keep capturing — MUST continue as a king
 *                   within the same move (crownContinues). A man jumping
 *                   across the last row without landing there stays a man.
 *
 * Board encoding: Int8Array(n*n), index = row*n+col, row 0 is the top
 * (Ebony's back rank). Piece codes: 0 empty, 1 ivory man, 2 ivory king,
 * -1 ebony man, -2 ebony king. Ivory starts at the bottom and moves up.
 *
 * Dark (playable) squares satisfy (row + col) % 2 === 1, which gives each
 * player the double corner on their right, matching tournament orientation.
 *
 * This function must stay self-contained: it is stringified into a Web Worker
 * for the AI search, and loaded directly by Node for the test suite.
 */
function makeEngine() {
  const IVORY = 1, EBONY = -1;
  const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const MATE = 1000000;

  const RULESETS = {
    american: {
      id: 'american', name: 'American Checkers', n: 8, pieceRows: 3,
      flyingKings: false, menCaptureBack: false, maxCapture: false,
      promoteEndsMove: true, firstSide: EBONY, drawPlies: 80,
      manValue: 100, kingValue: 175, advance: 4, homeGuard: 14, center: 4,
    },
    international: {
      id: 'international', name: 'International Draughts', n: 10, pieceRows: 4,
      flyingKings: true, menCaptureBack: true, maxCapture: true,
      promoteEndsMove: false, firstSide: IVORY, drawPlies: 50,
      manValue: 100, kingValue: 320, advance: 2, homeGuard: 10, center: 3,
    },
    brazilian: {
      id: 'brazilian', name: 'Brazilian Draughts', n: 8, pieceRows: 3,
      flyingKings: true, menCaptureBack: true, maxCapture: true,
      promoteEndsMove: false, firstSide: IVORY, drawPlies: 50,
      manValue: 100, kingValue: 300, advance: 3, homeGuard: 12, center: 4,
    },
    canadian: {
      id: 'canadian', name: 'Canadian Draughts', n: 12, pieceRows: 5,
      flyingKings: true, menCaptureBack: true, maxCapture: true,
      promoteEndsMove: false, firstSide: IVORY, drawPlies: 50,
      manValue: 100, kingValue: 320, advance: 2, homeGuard: 10, center: 3,
    },
    russian: {
      id: 'russian', name: 'Russian Draughts', n: 8, pieceRows: 3,
      flyingKings: true, menCaptureBack: true, maxCapture: false,
      crownContinues: true, promoteEndsMove: false, firstSide: IVORY,
      drawPlies: 50,
      manValue: 100, kingValue: 280, advance: 3, homeGuard: 12, center: 4,
    },
  };

  function isDark(r, c) { return ((r + c) & 1) === 1; }

  function setupBoard(rs) {
    const b = new Int8Array(rs.n * rs.n);
    for (let r = 0; r < rs.n; r++) {
      for (let c = 0; c < rs.n; c++) {
        if (!isDark(r, c)) continue;
        const i = r * rs.n + c;
        if (r < rs.pieceRows) b[i] = -1;               // ebony man, top
        else if (r >= rs.n - rs.pieceRows) b[i] = 1;   // ivory man, bottom
      }
    }
    return b;
  }

  function isLastRow(rs, side, r) {
    return side === IVORY ? r === 0 : r === rs.n - 1;
  }

  function forwardDirs(side) {
    return side === IVORY ? [DIRS[0], DIRS[1]] : [DIRS[2], DIRS[3]];
  }

  // ---- move generation -----------------------------------------------------
  // Move shape: { from, path: [from, landing, landing...], caps: [jumped squares], promotes }
  // Every path is a complete (leaf) sequence: while further captures exist the
  // move must continue, so partial captures are never generated.

  function genCaptures(rs, b, side) {
    const n = rs.n, out = [];

    // `crowned`: a man that was crowned mid-sequence and is continuing as a
    // king (Russian rules) — the leaf must still report promotes.
    function rec(bd, cur, code, path, caps, capSet, isRoot, crowned) {
      const isKing = code === 2 || code === -2;
      const r = (cur / n) | 0, c = cur % n;
      let extended = false;
      bd[cur] = 0; // the moving piece vacates its square and may pass back over it

      const dirs = isKing ? DIRS : (rs.menCaptureBack ? DIRS : forwardDirs(side));
      for (const [dr, dc] of dirs) {
        if (isKing && rs.flyingKings) {
          // Flying king: slide down the diagonal to the first piece; if it is an
          // uncaptured enemy, land on any empty square beyond it.
          let k = 1, pi = -1;
          for (;;) {
            const rr = r + dr * k, cc = c + dc * k;
            if (rr < 0 || rr >= n || cc < 0 || cc >= n) { pi = -1; break; }
            const idx = rr * n + cc, q = bd[idx];
            if (q === 0) { k++; continue; }
            if (q * side > 0 || capSet.has(idx)) pi = -1; // own or already-captured piece blocks
            else pi = idx;
            break;
          }
          if (pi < 0) continue;
          let l = k + 1, any = false;
          for (;;) {
            const lr = r + dr * l, lc = c + dc * l;
            if (lr < 0 || lr >= n || lc < 0 || lc >= n) break;
            if (bd[lr * n + lc] !== 0) break; // captured pieces stay put until the move ends
            const li = lr * n + lc;
            any = true;
            capSet.add(pi); path.push(li); caps.push(pi);
            rec(bd, li, code, path, caps, capSet, false, crowned);
            path.pop(); caps.pop(); capSet.delete(pi);
            l++;
          }
          if (any) extended = true;
        } else {
          // Single-step jump: a man, or a king under non-flying rules.
          const or_ = r + dr, oc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
          if (lr < 0 || lr >= n || lc < 0 || lc >= n) continue;
          const oi = or_ * n + oc, li = lr * n + lc;
          if (bd[oi] === 0 || bd[oi] * side > 0 || capSet.has(oi)) continue;
          if (bd[li] !== 0) continue;
          const landsLast = !isKing && isLastRow(rs, side, lr);
          const crownNow = landsLast && rs.promoteEndsMove;
          capSet.add(oi); path.push(li); caps.push(oi);
          if (crownNow) {
            out.push({ from: path[0], path: path.slice(), caps: caps.slice(), promotes: true });
          } else if (landsLast && rs.crownContinues) {
            // Russian: the man is crowned the moment it lands on the king row
            // and keeps capturing — as a king — if the sequence continues.
            rec(bd, li, side * 2, path, caps, capSet, false, true);
          } else {
            rec(bd, li, code, path, caps, capSet, false, crowned);
          }
          path.pop(); caps.pop(); capSet.delete(oi);
          extended = true;
        }
      }

      if (isRoot) bd[cur] = code; // visited landing squares were empty and stay empty
      if (!extended && caps.length > 0) {
        out.push({
          from: path[0], path: path.slice(), caps: caps.slice(),
          // crowned: mid-capture crowning (Russian) — the piece ends as a king
          // wherever the sequence finishes. Otherwise a leaf on the last row
          // crowns (international family) unless crowning ends the move,
          // which the crownNow branch above has already handled.
          promotes: crowned || (!isKing && !rs.promoteEndsMove && isLastRow(rs, side, r)),
        });
      }
    }

    for (let i = 0; i < n * n; i++) {
      if (b[i] * side <= 0) continue;
      rec(b, i, b[i], [i], [], new Set(), true, false);
    }
    return out;
  }

  function genQuiets(rs, b, side) {
    const n = rs.n, out = [];
    for (let i = 0; i < n * n; i++) {
      const code = b[i];
      if (code * side <= 0) continue;
      const isKing = code === 2 || code === -2;
      const r = (i / n) | 0, c = i % n;
      const dirs = isKing ? DIRS : forwardDirs(side);
      const reach = isKing && rs.flyingKings ? n - 1 : 1;
      for (const [dr, dc] of dirs) {
        for (let k = 1; k <= reach; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || rr >= n || cc < 0 || cc >= n) break;
          if (b[rr * n + cc] !== 0) break;
          out.push({
            from: i, path: [i, rr * n + cc], caps: [],
            promotes: !isKing && isLastRow(rs, side, rr),
          });
        }
      }
    }
    return out;
  }

  function legalMoves(rs, b, side) {
    const caps = genCaptures(rs, b, side);
    if (caps.length) {
      if (!rs.maxCapture) return caps;
      let mx = 0;
      for (const m of caps) if (m.caps.length > mx) mx = m.caps.length;
      return caps.filter((m) => m.caps.length === mx);
    }
    return genQuiets(rs, b, side);
  }

  function applyMove(rs, b, m, side) {
    const nb = b.slice();
    const code = nb[m.from];
    nb[m.from] = 0;
    for (const j of m.caps) nb[j] = 0;
    const end = m.path[m.path.length - 1];
    const isKing = code === 2 || code === -2;
    const endRow = (end / rs.n) | 0;
    nb[end] = !isKing && (m.promotes || isLastRow(rs, side, endRow)) ? side * 2 : code;
    return nb;
  }

  // Counter for draw-by-inactivity: reset on any capture or man move.
  function nextNoProgress(rs, b, m, side, noProgress) {
    const wasMan = b[m.from] === 1 || b[m.from] === -1;
    return m.caps.length > 0 || wasMan ? 0 : noProgress + 1;
  }

  // ---- notation --------------------------------------------------------------
  // Play squares are numbered 1..K row by row from the top, i.e. from Ebony's
  // side: standard score-sheet numbering for both rulesets.

  function squareNumbers(rs) {
    const map = new Int16Array(rs.n * rs.n);
    let k = 0;
    for (let r = 0; r < rs.n; r++) {
      for (let c = 0; c < rs.n; c++) {
        if (isDark(r, c)) map[r * rs.n + c] = ++k;
      }
    }
    return map;
  }

  function moveToNotation(rs, sqn, m) {
    const sep = m.caps.length ? 'x' : '-';
    return m.path.map((i) => sqn[i]).join(sep);
  }

  // ---- evaluation (positive = good for `side` to move) ------------------------
  //
  // `w` (optional) carries a playing-style personality: { for, aggr, guard,
  // king, trade, center }. The multipliers apply ONLY to pieces owned by
  // `w.for`, so a styled engine values its own advancement, back-rank guard,
  // kings, material (via `trade`: higher = happier to give material up) and
  // central squares differently from the opponent's.

  function evaluate(rs, b, side, jitter, w) {
    const n = rs.n;
    const mine = w && w.for;
    const aggr = mine ? (w.aggr || 1) : 1;
    const guard = mine ? (w.guard || 1) : 1;
    const kingM = mine ? (w.king || 1) : 1;
    const trade = mine ? (w.trade || 1) : 1;
    const centerM = mine ? (w.center || 1) : 1;
    let s = 0;
    for (let i = 0; i < n * n; i++) {
      const code = b[i];
      if (code === 0) continue;
      const sign = code > 0 ? 1 : -1;
      const styled = sign === mine;
      const isKing = code === 2 || code === -2;
      const r = (i / n) | 0, c = i % n;
      let v;
      if (isKing) {
        v = rs.kingValue * (styled ? kingM : 1);
        if (rs.flyingKings) {
          let mob = 0;
          for (const [dr, dc] of DIRS) {
            for (let k = 1; k <= 3; k++) {
              const rr = r + dr * k, cc = c + dc * k;
              if (rr < 0 || rr >= n || cc < 0 || cc >= n || b[rr * n + cc] !== 0) break;
              mob++;
            }
          }
          v += mob * 4;
        }
      } else {
        v = rs.manValue * (styled ? (2 - trade) : 1);
        v += (code > 0 ? n - 1 - r : r) * rs.advance * (styled ? aggr : 1); // crowning race
        if (r === (code > 0 ? n - 1 : 0)) v += rs.homeGuard * (styled ? guard : 1);
      }
      if (r >= 2 && r <= n - 3 && c >= 2 && c <= n - 3) v += rs.center * (styled ? centerM : 1);
      s += sign * v;
    }
    let e = side === IVORY ? s : -s;
    if (jitter) e += (Math.random() * 2 - 1) * jitter;
    return e;
  }

  // ---- search: negamax + alpha-beta + transposition table ---------------------

  function search(rs, board, side, opts) {
    opts = opts || {};
    const budgetMs = opts.budgetMs || 400;
    const maxDepth = opts.maxDepth || 16;
    const jitter = opts.jitter || 0;
    const noProgStart = opts.noProgress || 0;
    const deadline = Date.now() + budgetMs;

    const rootMoves = legalMoves(rs, board, side).map((m) => ({ m, score: -Infinity }));
    if (!rootMoves.length) {
      return { best: null, score: -MATE, depth: 0, nodes: 0, rootScores: [] };
    }
    if (rootMoves.length === 1) {
      return { best: rootMoves[0].m, score: 0, depth: 0, nodes: 0, rootScores: [] };
    }

    const z = new Int32Array(rs.n * rs.n * 4);
    let seed = 0x9e3779b9;
    for (let i = 0; i < z.length; i++) {
      seed = (seed * 1664525 + 1013904223) | 0;
      z[i] = seed;
    }
    const hashOf = (b, s) => {
      let h = 0;
      for (let i = 0; i < b.length; i++) {
        const q = b[i];
        if (q !== 0) h = (h ^ z[i * 4 + q + 2]) | 0;
      }
      return h * 2 + (s === IVORY ? 0 : 1);
    };

    const tt = new Map();
    let nodes = 0, aborted = false;

    function negamax(b, s, depth, alpha, beta, noProg) {
      if ((++nodes & 511) === 0 && Date.now() > deadline) aborted = true;
      if (aborted) return 0;
      if (noProg >= rs.drawPlies) return 0;

      const moves = legalMoves(rs, b, s);
      if (!moves.length) return -(MATE + depth); // no reply: side to move loses
      if (depth <= 0) return evaluate(rs, b, s, jitter, opts.weights);

      const key = hashOf(b, s);
      const e = tt.get(key);
      let ttBest = -1;
      if (e) {
        if (e.d >= depth) {
          if (e.f === 0) return e.s;
          if (e.f === 1 && e.s > alpha) alpha = e.s;
          else if (e.f === 2 && e.s < beta) beta = e.s;
          if (alpha >= beta) return e.s;
        }
        ttBest = e.best;
      }

      const scored = moves.map((m) => ({
        m,
        k: (m.from === ttBest ? 1e6 : 0) + m.caps.length * 1000 + (m.promotes ? 500 : 0),
      }));
      scored.sort((a, b2) => b2.k - a.k);

      const a0 = alpha;
      let best = -Infinity, bestMove = -1;
      for (const { m } of scored) {
        const wasMan = b[m.from] === 1 || b[m.from] === -1;
        const nb = applyMove(rs, b, m, s);
        const np = m.caps.length > 0 || wasMan ? 0 : noProg + 1;
        const v = -negamax(nb, -s, depth - 1, -beta, -alpha, np);
        if (aborted) return 0;
        if (v > best) { best = v; bestMove = m.from; }
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }

      tt.set(key, {
        d: depth, s: best,
        f: best <= a0 ? 2 : best >= beta ? 1 : 0,
        best: bestMove,
      });
      return best;
    }

    let bestMove = rootMoves[0].m, bestScore = 0, completedDepth = 0;
    for (let depth = 1; depth <= maxDepth; depth++) {
      rootMoves.sort((a, b2) => b2.score - a.score);
      let alpha = -Infinity, iterBest = null, iterScore = -Infinity;
      let abortedIter = false;
      for (const rm of rootMoves) {
        const wasMan = board[rm.m.from] === 1 || board[rm.m.from] === -1;
        const nb = applyMove(rs, board, rm.m, side);
        const np = rm.m.caps.length > 0 || wasMan ? 0 : noProgStart + 1;
        // fullRootWindow: search every root with an open window so ALL root
        // scores are exact (needed when callers compare roots against each
        // other — trap/bait analysis), at the cost of root-level pruning.
        const v = -negamax(nb, -side, depth - 1, -Infinity,
          opts.fullRootWindow ? Infinity : -alpha, np);
        if (aborted) { abortedIter = true; break; }
        rm.score = v;
        if (v > iterScore) { iterScore = v; iterBest = rm.m; }
        if (v > alpha) alpha = v;
      }
      if (abortedIter && depth > 1) break;
      if (!abortedIter) {
        bestMove = iterBest || bestMove;
        bestScore = iterScore;
        completedDepth = depth;
        if (bestScore > MATE - 1000) break; // forced win found
      }
      if (Date.now() > deadline) break;
    }

    return {
      best: bestMove, score: bestScore, depth: completedDepth, nodes,
      rootScores: rootMoves.map((rm) => ({ m: rm.m, score: rm.score })),
    };
  }

  return {
    IVORY, EBONY, RULESETS, MATE,
    setupBoard, legalMoves, applyMove, nextNoProgress,
    squareNumbers, moveToNotation, evaluate, search,
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = makeEngine;
