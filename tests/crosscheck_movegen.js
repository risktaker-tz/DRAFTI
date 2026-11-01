'use strict';
/*
 * Independent cross-check for the DRAFTI engine (run: node crosscheck_movegen.js).
 *
 * Second move generator, deliberately written differently: plain 2D arrays,
 * full board copies at every recursive step, piece physically relocated on
 * each hop. Same RULES as the engine (captured pieces stay on the board and
 * block until the move ends; promotion conventions per ruleset), zero shared
 * code paths. Diffs move SETS against the engine on every position visited
 * during thousands of random playouts.
 */
const makeEngine = require('../src/engine.js');
const E = makeEngine();

const DIRS4 = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function clone(b) { return b.map((row) => row.slice()); }

function to2D(flat, n) {
  const b = [];
  for (let r = 0; r < n; r++) b.push(Array.from(flat.slice(r * n, r * n + n)));
  return b;
}

function indepCaptureSeqs(rs, b0, side) {
  const n = rs.n, out = [];
  const kingRow = side === 1 ? 0 : n - 1;
  const dirsFor = (isKing) =>
    isKing || rs.menCaptureBack ? DIRS4 : (side === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

  function rec(bd, r, c, isKing, trail, caps, visited, crowned) {
    let extended = false;
    for (const [dr, dc] of dirsFor(isKing)) {
      if (isKing && rs.flyingKings) {
        let k = 1;
        while (r + dr * k >= 0 && r + dr * k < n && c + dc * k >= 0 && c + dc * k < n &&
               bd[r + dr * k][c + dc * k] === 0) k++;
        const pr = r + dr * k, pc = c + dc * k;
        if (pr < 0 || pr >= n || pc < 0 || pc >= n) continue;
        if (bd[pr][pc] * side > 0 || visited.has(pr * n + pc)) continue;
        let l = k + 1, any = false;
        while (r + dr * l >= 0 && r + dr * l < n && c + dc * l >= 0 && c + dc * l < n &&
               bd[r + dr * l][c + dc * l] === 0) {
          const lr = r + dr * l, lc = c + dc * l;
          any = true;
          const nb = clone(bd);
          nb[r][c] = 0; nb[lr][lc] = side * 2; // king relocates; victim stays (blocks)
          const nv = new Set(visited); nv.add(pr * n + pc);
          rec(nb, lr, lc, true, trail.concat([lr * n + lc]), caps.concat([pr * n + pc]), nv, crowned);
          l++;
        }
        if (any) extended = true;
      } else {
        const lr = r + 2 * dr, lc = c + 2 * dc;
        if (lr < 0 || lr >= n || lc < 0 || lc >= n) continue;
        const or_ = r + dr, oc = c + dc;
        if (bd[or_][oc] === 0 || bd[or_][oc] * side > 0 || visited.has(or_ * n + oc)) continue;
        if (bd[lr][lc] !== 0) continue;
        const landsLast = !isKing && lr === kingRow;
        extended = true;
        if (landsLast && rs.promoteEndsMove) {
          out.push({ trail: trail.concat([lr * n + lc]), caps: caps.concat([or_ * n + oc]), promotes: true });
        } else if (landsLast && rs.crownContinues) {
          // Russian: crowned at once, the sequence continues as a flying king.
          const nb = clone(bd);
          nb[r][c] = 0; nb[lr][lc] = side * 2;
          const nv = new Set(visited); nv.add(or_ * n + oc);
          rec(nb, lr, lc, true, trail.concat([lr * n + lc]), caps.concat([or_ * n + oc]), nv, true);
        } else {
          const nb = clone(bd);
          nb[r][c] = 0;
          nb[lr][lc] = side; // piece keeps its type (king stays king under non-flying rules)
          const nv = new Set(visited); nv.add(or_ * n + oc);
          rec(nb, lr, lc, isKing, trail.concat([lr * n + lc]), caps.concat([or_ * n + oc]), nv, crowned);
        }
      }
    }
    if (!extended && caps.length > 0) {
      const endR = ((trail[trail.length - 1] / n) | 0);
      out.push({
        trail: trail.slice(), caps: caps.slice(),
        promotes: crowned || (!isKing && !rs.promoteEndsMove && endR === kingRow),
      });
    }
  }

  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (b0[r][c] === 0 || b0[r][c] * side < 0) continue;
      const isKing = Math.abs(b0[r][c]) === 2;
      rec(b0, r, c, isKing, [r * n + c], [], new Set());
    }
  return out;
}

function indepQuietMoves(rs, b0, side) {
  const n = rs.n, out = [];
  const kingRow = side === 1 ? 0 : n - 1;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const p = b0[r][c];
      if (p === 0 || p * side < 0) continue;
      const isKing = Math.abs(p) === 2;
      const dirs = isKing ? DIRS4 : (side === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
      const reach = isKing && rs.flyingKings ? n - 1 : 1;
      for (const [dr, dc] of dirs) {
        for (let k = 1; k <= reach; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || rr >= n || cc < 0 || cc >= n || b0[rr][cc] !== 0) break;
          out.push({
            trail: [r * n + c, rr * n + cc], caps: [],
            promotes: !isKing && rr === kingRow,
          });
        }
      }
    }
  return out;
}

function indepLegal(rs, b0, side) {
  const caps = indepCaptureSeqs(rs, b0, side);
  if (caps.length) {
    if (!rs.maxCapture) return caps;
    const mx = Math.max(...caps.map((m) => m.caps.length));
    return caps.filter((m) => m.caps.length === mx);
  }
  return indepQuietMoves(rs, b0, side);
}

const key = (m) => m.trail.join(',') + '|' + m.caps.join(',') + '|' + (m.promotes ? 1 : 0);
const setOf = (ms) => new Set(ms.map(key));

// ---- playouts & comparison --------------------------------------------------
function run(rs, games, maxPlies) {
  games = games || 150; maxPlies = maxPlies || 140;
  let mismatches = 0, checked = 0;
  for (let g = 0; g < games; g++) {
    let flat = E.setupBoard(rs), side = rs.firstSide, np = 0;
    for (let t = 0; t < maxPlies; t++) {
      const engMoves = E.legalMoves(rs, flat, side);
      if (!engMoves.length || np >= rs.drawPlies) break;

      const b2 = to2D(flat, rs.n);
      const ind = setOf(indepLegal(rs, b2, side));
      const eng = setOf(engMoves.map((m) => ({ trail: m.path, caps: m.caps, promotes: m.promotes })));
      checked++;
      if (ind.size !== eng.size || [...eng].some((k) => !ind.has(k))) {
        mismatches++;
        if (mismatches <= 3) {
          console.log(`MISMATCH in ${rs.id} game ${g} ply ${t}:`);
          console.log('  engine-only:', [...eng].filter((k) => !ind.has(k)));
          console.log('  indep-only :', [...ind].filter((k) => !eng.has(k)));
          console.log('  board:', Array.from(flat).join(','));
        }
      }

      // random move, biased toward captures half the time
      let m;
      const capMoves = engMoves.filter((x) => x.caps.length > 0);
      if (capMoves.length && Math.random() < 0.7) m = capMoves[(Math.random() * capMoves.length) | 0];
      else m = engMoves[(Math.random() * engMoves.length) | 0];
      np = E.nextNoProgress(rs, flat, m, side, np);
      flat = E.applyMove(rs, flat, m, side);
      side = -side;
    }
  }
  console.log(`${rs.id}: ${checked} positions cross-checked, ${mismatches} mismatches`);
  return mismatches;
}

// the 12x12 board is much heavier — fewer games, same depth of scrutiny
let bad = run(E.RULESETS.american)
  + run(E.RULESETS.brazilian)
  + run(E.RULESETS.russian)
  + run(E.RULESETS.international)
  + run(E.RULESETS.canadian, 60, 100);
console.log(bad === 0 ? 'CROSS-CHECK CLEAN' : `CROSS-CHECK FAILED (${bad})`);
process.exit(bad ? 1 : 0);
