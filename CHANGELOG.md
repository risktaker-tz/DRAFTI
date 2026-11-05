# Changelog

## 2026-11-05 — AI cycle escape and contact-synced movement

- Give each AI the real game's visited-position counts at move selection. When its chosen route repeats a position, it takes a fresh legal route only when full-search scores remain close; the safe margin widens after a protected loop repeats, while materially stronger lines and normal game results stay intact. This does not force a win or end a game.
- Time capture feedback to the jumped piece's actual location along the eased hop, let the light trail finish with the moving piece, and play quiet-move landing feedback at arrival without adding wait time.

## 2026-11-05 — Endgame threshold and continuous movement

- Require both crowned sides to have three pieces or fewer before starting the ten-turn draw countdown; a king counts as a piece. A four-piece side keeps play going.
- Let each piece complete its full selected movement interval before the next capture hop, removing the previous pause at every landing while preserving speed scaling and capture effects.

## 2026-11-05 — Season Cups

- Award the Season Cup to the actual grand-final winner, or shared cups for a drawn final. Present the winning flags, an existing short trophy fanfare and a season-engraved metallic trophy, with eight increasing prestige tiers.
- Keep season honours per local player under a new versioned key, saved with the season advance. Show recent honours and the actual winner-stays season format in the arena menu; preserve stage XP, fair scheduling and retirement ceremonies.
- Include the three-turn draw-proof implementation in simulation fingerprints so saved evidence cannot silently reuse different rules.

## 2026-11-05 — Menu-only Preview Studio

- Move Preview Studio into Table & themes → Board feel in the menu. Keep it closed at startup on phone and desktop, and remove the floating gameplay launcher. Preserve all thirty effects and studio controls.

## 2026-11-05 — Ultra materials and protected endgames

- Add engraved rims, layered contact shadows, crafted frame trim and subtle Marble Lux veins across the existing material system. Correct the visual lower-disc position of flipped kings.
- Separate similar flag palettes perceptually, preferring genuine secondary flag colours while preserving all flag sources and user controls.
- Require a king on each side before automatic draws. Keep the short countdown for two-or-fewer pieces each; start the ten-turn countdown when at least one side has three pieces. Preserve any possible winning continuation within three turns; incomplete checks continue play.
- Remove deliberate random beginner blunders from spectator matches without reducing search depth or changing the human Beginner ladder.
- Preserve movement-speed behavior, sounds, situational cinematic effects, themes and progress. Startup optimization is deferred to a later checkpoint.

## 2026-11-04 — Approved cinematic checkpoint

- Add thirty board, piece and background effects with occasion checks, priorities, per-game quotas and cooldowns. Reserve fractures for multi-captures and tactical edge lighting for rare engine-confirmed moments.
- Improve full-strength arena playback by calculating the next legal position during movement. Apply speed changes immediately to pending presentation waits without reducing search budgets or depth.
- Render retirement flags from all 194 verified original SVG sources offline, with stale-champion guards and the existing fallback.
- Preserve exact flag-source bytes in fresh checkouts. Keep selected materials, themes, sound design, flags, rules, progress and installed-app update behavior.
- Re-read playback speed on every capture hop; avoid rebuilding unchanged growing score sheets and capture trays on thinking/moving phase changes.
- Reverse each country pair's previous colours on rematches, even after an upset, long gap or season boundary. Migrate older resumed leagues and safely initialize new/reset profiles.

Validated with automated engine, move-generation, audio, rules, persistence, playback, worker and installation checks; browser demonstrations of all thirty effects and a legal final-square double capture. Full master-blueprint acceptance remains in progress. Extremely demanding AI positions remain limited by available computation; physical installed-device and native reduced-motion acceptance are still open.
