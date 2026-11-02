# Wire the stadium stings into the moments that earn them.
import pathlib

UI = pathlib.Path('/home/z/my-project/download/DRAFTI/src/ui.js')
s = UI.read_text()

# 1. streak counter sanitize (next to bouts)
old = "  if (typeof arena.bouts !== 'number' || arena.bouts < 0) arena.bouts = 0;"
new = old + "\n  if (typeof arena.streak !== 'number' || arena.streak < 0) arena.streak = 0;"
assert old in s
s = s.replace(old, new, 1)

# 2. champion defends -> streak grows; crown changes -> streak resets + upset gasp
old = """    } else if (winnerSide === IVORY) {
      arena.challRounds++;"""
new = """    } else if (winnerSide === IVORY) {
      arena.challRounds++;
      arena.streak = (arena.streak || 0) + 1;
      if (arena.streak === 3) {
        // a title defense hat-trick — give the crowd its airhorn moment
        setTimeout(() => SFX_BANK.play('st_air1', { vol: 0.8 }), 1600);
        setTimeout(() => SFX_BANK.play('st_coin1', { vol: 0.6 }), 2500);
      }"""
assert old in s
s = s.replace(old, new, 1)

old = """    if (winnerSide === EBONY) {
      // the challenger takes the crown; the beaten champion goes to the back
      arena.queue.push(champId);"""
new = """    if (winnerSide === EBONY) {
      // the challenger takes the crown; the beaten champion goes to the back
      arena.streak = 0;
      arena.queue.push(champId);"""
assert old in s
s = s.replace(old, new, 1)

# 3. new-champion crowd reaction (gasp + roar) in the auto flow
old = """    const res = applyArenaResult(G.result && G.result.winner ? G.result.winner : 0);
    if (res.text) flashWhisper(res.text);"""
new = """    const prevChamp = arena.champion;
    const res = applyArenaResult(G.result && G.result.winner ? G.result.winner : 0);
    if (res.text) flashWhisper(res.text);
    if (res.champion !== prevChamp) {
      // an upset! the crowd gasps, then roars the new name
      setTimeout(() => SFX_BANK.play(pick(['st_gasp1', 'st_gasp2']), { vol: 0.85 }), 500);
      setTimeout(() => SFX_BANK.play('st_crowd1', { vol: 0.7 }), 1400);
    }"""
assert old in s
s = s.replace(old, new, 1)

# 4. ceremony: drumroll under the gong, applause when the name lands
old = """    el.hidden = false;
    SFX_BANK.play('gong', { vol: 0.9 });
    setTimeout(() => SFX_BANK.play(pick(['v_retire1', 'v_retire2']), { vol: 1 }), 900);"""
new = """    el.hidden = false;
    SFX_BANK.play('gong', { vol: 0.9 });
    setTimeout(() => SFX_BANK.play('st_drum1', { vol: 0.75 }), 350);
    setTimeout(() => SFX_BANK.play(pick(['v_retire1', 'v_retire2']), { vol: 1 }), 1000);
    setTimeout(() => SFX_BANK.play(pick(['st_appl1', 'st_appl2']), { vol: 0.85 }), 2000);"""
assert old in s
s = s.replace(old, new, 1)

# 5. the last tick of the countdown gets a riser into the bout
old = """      const tick = setInterval(() => {
        left -= 1;
        if (left <= 0) { clearInterval(tick); fire(); return; }
        announce();
      }, 1000);"""
new = """      const tick = setInterval(() => {
        left -= 1;
        if (left <= 0) { clearInterval(tick); fire(); return; }
        if (left === 1) SFX_BANK.play('st_riser1', { vol: 0.65 });
        announce();
      }, 1000);"""
assert old in s
s = s.replace(old, new, 1)

# 6. first doom verdict: a heartbeat under the "let me tell you something"
old = """    setTimeout(() => {
      SFX_BANK.play(first ? 'tellyou' : 'vineboom', { vol: first ? 1 : 0.9 });
      setTimeout(() => SFX_BANK.play(pick(DOOM_LINES.slice(1)), { vol: 0.95 }), first ? 2300 : 500);"""
new = """    setTimeout(() => {
      SFX_BANK.play(first ? 'tellyou' : 'vineboom', { vol: first ? 1 : 0.9 });
      if (first) setTimeout(() => SFX_BANK.play('st_heart1', { vol: 0.7 }), 2800);
      setTimeout(() => SFX_BANK.play(pick(DOOM_LINES.slice(1)), { vol: 0.95 }), first ? 2300 : 500);"""
assert old in s
s = s.replace(old, new, 1)

# 7. crowning an occasional little fanfare on top of the king sting
old = """    if (mv.promotes) {
      p.code = G.side * 2;
      refreshPiece(p);
      FX.play('king');
    }"""
new = """    if (mv.promotes) {
      p.code = G.side * 2;
      refreshPiece(p);
      FX.play('king');
      if (Math.random() < 0.55) setTimeout(() => SFX_BANK.play('st_tada1', { vol: 0.6 }), 320);
    }"""
assert old in s
s = s.replace(old, new, 1)

# 8. bait taken: the crowd oohs at the blunder
old = """    // the cat pounces when a trap actually catches its mouse
    if (kind === 'trap_win' && Math.random() < 0.3) {
      setTimeout(() => SFX_BANK.play('meow', { vol: 0.85 }), 1300);
    }"""
new = """    // the cat pounces when a trap actually catches its mouse
    if (kind === 'trap_win' && Math.random() < 0.3) {
      setTimeout(() => SFX_BANK.play('meow', { vol: 0.85 }), 1300);
    }
    // a bait taken is a blunder in public: the crowd winces
    if (kind === 'trap_fail' && Math.random() < 0.35) {
      setTimeout(() => SFX_BANK.play(pick(['st_ooh1', 'st_ooh2']), { vol: 0.7 }), 1100);
    }"""
assert old in s
s = s.replace(old, new, 1)

# 9. illegal-click whistle, both call sites
old = "    if (!cands.length) { FX.play('illegal'); return; }"
new = """    if (!cands.length) {
      FX.play('illegal');
      if (Math.random() < 0.3) setTimeout(() => SFX_BANK.play('st_whis1', { vol: 0.5 }), 320);
      return;
    }"""
assert old in s
s = s.replace(old, new, 1)

UI.write_text(s)
print('stadium wiring done')
