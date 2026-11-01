# DRAFTI — checkers, refined

An **original, open-source checkers game**. DRAFTI is an independent
implementation of the public-domain game of draughts — no code, assets, or
data were taken from any commercial app. The rules of checkers belong to
everyone; DRAFTI is our own take on them.

![DRAFTI](docs/screenshot.png)

## Features

- **Two rulesets**
  - *American Checkers* (English draughts, 8×8) — dark side opens, men capture
    forward only, kings step one square, crowning a man ends the move.
  - *International Draughts* (FMJD, 10×10) — light side opens, men capture
    forwards *and* backwards, flying kings land anywhere behind the jumped
    piece, and the **maximum-capture rule** is enforced.
- **AI opponent** — negamax with alpha-beta pruning, iterative deepening and a
  transposition table, running in a Web Worker so the board never freezes.
  Three strengths: Casual, Club, Tough.
- **Pass-and-play** — two players on one device, with optional automatic board
  rotation each turn.
- **Extras** — undo, full move log with standard score-sheet notation
  (`9-13`, `22x15`, `21x14x5`), move hints, per-ruleset win/loss/draw record,
  wooden-cub sound effects synthesized with Web Audio. No accounts, no
  trackers, works offline.

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
src/                  web sources: rules engine, UI, styles, page template
build_web.py          assembles src/ into web/index.html
tests/                Node test suite for the rules engine
android/              Kotlin + Jetpack Compose scaffold (engine ported)
docs/                 screenshots
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
  node counts (7 / 49 / 302 / 1469 / 7361 / 36768).
- A second, independently written move generator (different data structures,
  different recursion style) must produce byte-identical move sets on every
  position reached in thousands of random playouts.
- Handcrafted unit tests pin the tricky rules: forced capture and forced
  multi-jump continuation, the maximum-capture rule, flying-king landing
  choice, both crowning conventions (American: crowning ends the move;
  International: crowning only if the turn *ends* on the far edge), captured
  pieces blocking until the move ends, and draw rules (40/25-move inactivity,
  threefold repetition).

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
- Themes (walnut club, marble tournament, travel magnetic)

## License

MIT — see [LICENSE](LICENSE). The game of checkers belongs to the public
domain; this implementation is ours, and it can be yours too.
