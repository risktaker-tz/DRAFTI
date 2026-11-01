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
    Three strengths: Casual, Club, Tough.
  - *Two players* — pass-and-play on one device, with optional automatic
    board rotation each turn.
  - *AI vs AI* — spectate two engines playing each other, with pause and
    1× / 2× / 4× speed.
- **Optional move clock** — 30 / 60 / 90 seconds per human move, with ticking
  tension in the last ten seconds and a referee whistle when time expires (a
  legal move is played for you, and the judge has words).
- **A game menu that stays out of the way** — the ☰ button (or the `M` key)
  slides every setting over a dimmed board: rules, opponent, strength, move
  clock, themes, sound mixing, the full move log and your record. Close it
  with ✕, `Esc`, the backdrop or *Back to the game*, and the whole page
  belongs to the match again — board, turn banner, move ticker, trays.
- **15 board themes** — pick your table in the Boards & themes panel: seven
  futuristic sets (Neon Circuit, Hologlass, Cyber Jade, Synthwave, Vapor
  Dreams, Solar Storm, Deep Space), the light Quantum Ice and Marble Lux, a
  CRT scanline Retro Arcade, and the classics (Midnight Club, Walnut Classic,
  Tournament green, stark Ivory & Ebony, Sakura). Each theme recolors the
  whole interface — squares, pieces, frame, panels, accents — and your pick
  is remembered.
- **113 reactive sounds** — the game watches everything and reacts:
  - multi-piece jumps get **majestic animal fanfares** — a bald eagle scream
    for a double jump, a lion's roar (plus a board thump) for three or more,
    an elephant trumpet and brass fanfare when a man is crowned, plus
    capture-streak impacts ("On a rampage!");
  - **the judge** follows your play: accurate moves earn "Nice move.",
    "Sharp!" or "The only move!" when just one move holds the game; a quiet
    move that quietly springs a winning trap gets a *Sneaky!* reveal;
    questionable choices get "Hmm. Interesting choice."; real mistakes get
    the full **"Why did you do that?!"** treatment;
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
    "Unbelievable!", "All hail the king!") generated with neural TTS;
  - **interface sound design** — drawer whooshes, toggle blips, a theme
    sparkle, a starting gong, undo rewinds, victory fanfares, defeat womps,
    draw chimes and the ticking clock;
  - every category (majestic / judge / comedy / voice / heckles / interface /
    classic wooden sounds) can be toggled and volume-mixed in the Sound
    design panel.
  All samples are open-licensed or synthesized in-house — full credits and
  links in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
- **Extras** — undo, full move log with standard score-sheet notation
  (`9-13`, `22x15`, `21x14x5`) plus a live ticker under the board, move
  hints, per-ruleset win/loss/draw record. No accounts, no trackers, works
  offline.

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
