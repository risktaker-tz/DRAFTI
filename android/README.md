# DRAFTI for Android

Kotlin + Jetpack Compose scaffold for the DRAFTI checkers game. The rules
engine (`app/src/main/java/tz/risktaker/drafti/engine/`) is a faithful port of
the web engine in `web/` — same rulesets, same move generation, same AI.

## Opening the project

1. Open `android/` in **Android Studio** (Koala or newer recommended).
2. Let Gradle sync. If the wrapper jar is missing (this repo does not commit
   binaries), either let Android Studio regenerate it, or run `gradle wrapper`
   once with a local Gradle 8.9+ install.
3. Run the `app` configuration on a device or emulator (minSdk 24).

## What is implemented

- Both rulesets: American Checkers (8×8) and International Draughts (10×10)
- Full rules engine port: forced captures, flying kings, maximum-capture rule,
  both crowning conventions, draw counters
- AI opponent (negamax + alpha-beta + transposition table) on
  `Dispatchers.Default`, with Casual / Club / Tough strength levels
- Pass-and-play (two players) mode
- Selection with click-steered multi-jumps, hint, undo, move log
- Classic club visual theme (Canvas-drawn board, Material 3 chrome)

## Not yet on Android (see the web version)

- Piece movement animations, sounds, stats persistence, board rotation —
  tracked as roadmap items in the root README.

> The scaffold has not been audited on physical devices yet; the web version
> under `web/` is the fully verified build. API and version numbers in the
> Gradle files are current stable at the time of writing and may need bumping
> by the time you build.
