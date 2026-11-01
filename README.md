# DRAFTI — checkers, refined

An **original, open-source checkers game**. DRAFTI is an independent
implementation of the public-domain game of draughts — no code, assets, or
data were taken from any commercial app. The rules of checkers belong to
everyone; DRAFTI is our own take on them.

![DRAFTI](docs/screenshot.png)

A double jump earns the eagle and the gold "Magnificent!" treatment:

![Magnificent](docs/screenshot-events.png)

## Features

- **Five international rulesets**
  - *American Checkers* (English draughts, 8×8) — dark side opens, men capture
    forward only, kings step one square, crowning a man ends the move.
  - *Brazilian Draughts* (8×8) — international rules on the smaller board.
  - *Russian Draughts* (Shashki, 8×8) — captures are mandatory but there is no
    majority rule, and a man crowned mid-capture **continues the same move as
    a flying king**.
  - *International Draughts* (FMJD, 10×10) — light side opens, men capture
    forwards *and* backwards, flying kings land anywhere behind the jumped
    piece, and the **maximum-capture rule** is enforced.
  - *Canadian Draughts* (12×12) — international rules on the grand board,
    30 men a side; flying kings own the long diagonals.
- **Three game modes**
  - *Computer* — negamax with alpha-beta pruning, iterative deepening and a
    transposition table, running in a Web Worker so the board never freezes.
    **Ten levels on one ladder**: Beginner, Novice, Casual, Club, Expert,
    Master, Grandmaster, Super GM, World Champion and The Machine — the weak
    rungs blunder and wander like a human novice, the top rungs think for
    seconds a move and never blink. Your highest conquered level is tracked
    in the record, with a fanfare the first time you take a new rung.
  - *Two players* — pass-and-play on one device, with optional automatic
    board rotation each turn.
  - *AI vs AI* — spectate two engines playing each other, with pause and
    1× / 2× / 4× speed — and each side can follow a **different national
    school** (Italian Furioso vs Czech Fortress, anyone?).
- **Twelve world playing styles** — every opponent is a personality, not just
  a search depth: 🇺🇸 American, 🇬🇧 English positional, 🇮🇹 Italian Furioso,
  🇪🇸 Spanish flank play, 🇨🇿 Czech Fortress, 🇫🇷 French élégance, 🇷🇺 Russian
  gambits, 🇰🇪 Kenyan hustle, 🇹🇿 Tanzanian joker, 🇧🇷 Brazilian samba,
  🇲🇳 Mongolian raider kings, plus the balanced Classic. Each school biases
  the engine's evaluation — aggression, back-rank guard, king hunger,
  willingness to trade, centre play — and each has its own table talk: a
  persona voice introduces it, and its catchphrases drop in when it captures.
- **Trap drama, both directions** — the engine watches every move for
  baits: when your quiet move sets a shot and the computer takes the wrong
  capture, the trap *springs* ("Your trap snapped shut!"); when it picks the
  safe capture instead you hear "Denied. Not today."; when the computer baits
  *you*, falling for it lands "You took the bait!" while reading it right
  earns "Good read."; and when a low-level machine sets a winning trap and
  then fails to use it, the judge can't believe it either. Snaps, buzzes and
  relief chimes are synthesized in-code; the callouts are neural voice lines.
- **Optional move clock** — 30 / 60 / 90 seconds per human move, with ticking
  tension in the last ten seconds and a referee whistle when time expires (a
  legal move is played for you, and the judge has words).
- **A game menu that stays out of the way** — the ☰ button (or the `M` key)
  slides every setting over a dimmed board: rules, opponent, strength, move
  clock, themes, sound mixing, the full move log and your record. Close it
  with ✕, `Esc`, the backdrop or *Back to the game*, and the whole page
  belongs to the match again — board, turn banner, move ticker, trays.
- **Hint & Undo live at the board** — a 💡 Hint / ↩ Undo pill sits right
  under the board in every live situation, with `H` and `U` keyboard
  shortcuts, so coaching and takebacks never hide behind a menu. Undo is
  AI-aware: it takes back your move, cancels the machine's reply, and the
  engine re-plans if you roll back past its move.
- **17 boards, tuned to be readable** — every table was contrast-checked
  (square-vs-square and piece-vs-square) so the checker pattern and both
  piece colours are always distinct: eight futuristic sets (Neon Circuit,
  Hologlass, Cyber Jade, Synthwave, Vapor Dreams, Solar Storm, Deep Space,
  and the glassy neon-lit **Neon Glass**), the light Quantum Ice and Marble
  Lux, a CRT scanline Retro Arcade, and the classics (Midnight Club, Walnut
  Classic, Tournament green, stark Ivory & Ebony, Sakura) — plus the
  ultra-realistic **Walnut Royale**: maple and walnut squares with visible
  wood grain and turned-wood pieces. A **High visibility** toggle adds
  hatched dark squares and strong piece rims for colour-blind players and
  bright rooms, and an **Ambient glow** toggle drifts two soft light fields
  tinted by each theme's own accents behind the whole page. Your picks are
  remembered.
- **190+ reactive sounds** — the game watches everything and reacts:
  - multi-piece jumps get **majestic animal fanfares** — a bald eagle scream
    for a double jump, a lion's roar (plus a board thump) for three or more,
    an elephant trumpet and brass fanfare when a man is crowned, plus
    capture-streak impacts ("On a rampage!");
  - **the judge** follows your play: accurate moves earn "Nice move.",
    "Sharp!" or "The only move!" when just one move holds the game; a quiet
    move that quietly springs a winning trap gets a *Sneaky!* reveal;
    questionable choices get "Hmm. Interesting choice." or "A slight
    wobble."; real mistakes get the full **"Why did you do that?!"**
    treatment; repair a blunder immediately and the judge nods — "Repaired!
    Strong recovery.";
  - **think, and the table talks back** — stare at the board for 12, 25, 45,
    75 or 105 seconds and the heckles escalate from a polite "Still thinking?
    Take your time." through "You're losing it, mate." and "Just agree you
    lost already." to "I ordered food. It arrived. I ate it. Still waiting.";
    survive the wait and then play a good move, and you earn the **big-brain
    treatment** ("Wow. That was worth the wait!", "Okay, genius. I see you.")
    — play a blunder after all that thought instead, and the judge lands the
    savage line ("You thought about THAT for half a minute?!");
  - blunders get **comedy** — a hanging piece earns a cartoon *woops*/*klonk*
    /banana-peel slip (from the CC0 Warner Bros. cartoon sound collection), a
    move the engine judges genuinely bad gets the sad trombone and an
    "Oh no. Oh no no no.", and a real disaster earns the Wilhelm scream;
  - miss an available double jump and a slide whistle drops in with
    "You had ONE job!";
  - **realistic voice commentary** ("That is chess, not checkers!",
    "Unbelievable!", "All hail the king!") generated with neural TTS, in two
    voices — the British judge and the persona announcer who introduces every
    national style;
  - **opponent table talk** — each of the twelve schools gets its own
    introduction and a pair of catchphrases ("Bellissimo! What an attack!",
    "The wall holds.", "Hustle and flow!") that fire when it captures;
  - **trap drama stings** — synthesized metallic snap, refusal buzz and
    relief chime underline the bait callouts;
  - **ladder celebrations** — conquering a new best level, three-win streaks
    and giant-killings at grandmaster rungs each get their own callout;
  - **interface sound design** — drawer whooshes, toggle blips, a theme
    sparkle, a starting gong, undo rewinds, victory fanfares, defeat womps,
    draw chimes and the ticking clock;
  - every category (majestic / judge / drama / comedy / voice / heckles /
    interface / classic wooden sounds) can be toggled and volume-mixed in
    the Sound design panel.
  All samples are open-licensed or synthesized in-house — full credits and
  links in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
- **Extras** — undo, full move log with standard score-sheet notation
  (`9-13`, `22x15`, `21x14x5`) plus a live ticker under the board, move
  hints, **engine-verdict badges** on the score sheet (`!!` brilliant,
  `?!` inaccurate, `?` mistake, `??` blunder), per-ruleset win/loss/draw
  record with your highest conquered level. No accounts, no trackers, works
  offline.

Two of the new tables — the glassy **Neon Glass** and the ultra-realistic
**Walnut Royale**:

![Neon Glass](docs/screenshot-glass.png)

![Walnut Royale](docs/screenshot-royale.png)

![Game menu](docs/screenshot-menu.png)

## Play the web version

The whole game is **one self-contained HTML file** — no install, no build:

```bash
# either just open it
open web/index.html            # macOS
xdg-open web/index.html        # Linux

# or serve it
python3 -m http.server -d web  # then visit http://localhost:8000
```

## Repository layout

```
web/index.html        the playable game (built, self-contained single file)
src/                  web sources: rules engine, UI, styles, page template,
                      audio (embedded samples + manifest)
build_web.py          assembles src/ into web/index.html
tests/                Node test suite for the rules engine
android/              Kotlin + Jetpack Compose scaffold (engine ported)
docs/                 screenshots
ATTRIBUTIONS.md       licenses and credits for every embedded sound
```

## Development

```bash
python3 build_web.py          # rebuild web/index.html after editing src/
node tests/test_engine.js     # 13,000+ assertions: rules, perft, AI, fuzzing
node tests/crosscheck_movegen.js   # independent second move generator, diffed
                              # on 24,000+ random positions
```

### How the engine is validated

- **Perft** from the starting position matches the published English-draughts
  node counts (7 / 49 / 302 / 1469 / 7361 / 36768), with opening counts
  checked for all five rulesets (7 / 7 / 7 / 9 / 11) and symmetric-reply
  counts at depth two.
- A second, independently written move generator (different data structures,
  different recursion style) must produce byte-identical move sets on every
  position reached in random playouts — run for all five rulesets.
- Handcrafted unit tests pin the tricky rules: forced capture and forced
  multi-jump continuation, the maximum-capture rule (and its absence in
  Russian), flying-king landing choice, all three crowning conventions
  (American: crowning ends the move; International family: crowning only if
  the turn *ends* on the far edge; Russian: crowning mid-capture continues
  as a king), captured pieces blocking until the move ends, and draw rules
  (inactivity, threefold repetition).

### The AI

Iterative-deepening negamax with alpha-beta pruning, a Zobrist-keyed
transposition table, capture-first move ordering, and a material +
advancement + back-rank + mobility evaluation. The web build runs the search
in a Web Worker created from the same engine source, so there is exactly one
implementation of the rules across game and AI. Casual level adds search
randomization so games stay varied.

## Android

`android/` contains a Kotlin + Jetpack Compose scaffold with the same rules
engine ported 1:1 (`Rules.kt`, `Ai.kt`) and a functional Canvas board UI with
AI and two-player modes. Open it in Android Studio and let Gradle sync — see
`android/README.md`.

## Roadmap

- Piece movement animations and sounds on Android
- Online multiplayer (the rules engine is already deterministic and
  serializable — a room-code relay server is the missing piece)
- Tournament clock, PDN import/export for saving and sharing games
- More themes: travel magnetic set, glass and stone materials

## License

MIT — see [LICENSE](LICENSE). The game of checkers belongs to the public
domain; this implementation is ours, and it can be yours too.
