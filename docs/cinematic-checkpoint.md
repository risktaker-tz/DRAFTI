# Cinematic playback checkpoint — 3 November 2026

This is a playable progress checkpoint, not completion of the master blueprint.

## Behaviour

- Previous move marks had no expiry and were repainted from `G.lastMove`. They now have a 900 ms lifetime whose elapsed time survives redraws. The hard diagonal square band is removed.
- Each actual hop draws a temporary tapered light ribbon in board coordinates. Multi-captures add a moving arrowhead on each real segment. Parent-board rotation owns flipping; 8/10/12 boards and all four diagonal directions are exercised. Cleanup is bounded; reduced motion creates no ribbons.
- The old 35 ms hop floor collapsed the faster settings. The first replacement was still too fast for the owner. The final viewing rungs use 700/550/430/340/270/210/100 ms for 1×/2×/4×/6×/8×/10×/16×; 16× owns the previous rapid 2× hop. Ribbons sit below all discs and share their motion easing. Rematch countdowns scale and respond to speed changes; protected original retirement and streamer speech remain natural.
- At fast arena speeds, retrospective commentary uses one separate worker rather than blocking the next move-search queue. Exact-position checks allow a late verified lesson, but prevent it from sounding a tactical judgement over a newer position. Human/1× ordering and all search budgets, depths, weights and difficulty values remain unchanged. Hardware still bounds real calculation speed.
- Streamer openings used one chance at a busy moment, with no retry. A contextual pulse now retries within the opening window and fills appropriate quiet thinking moments. It avoids paused arenas, hidden pages and menus. Midgame joins do not replay a greeting. Captures, crowns and victory retain their event meaning; the authored double-capture recording is not used for three-piece feasts.
- Post-ceremony intermissions can use an eligible engagement line, with enough time to finish. Calls retain quotas, no-repeat and 90-second CTA cooldown. A stream-ending outro is never used for this gap. Existing audio, themes, piece materials, flags, controls and effects are preserved.
- The owner then identified a welcome during an ongoing livestream: per-game resets were repeating a session greeting. The welcome flag now survives bouts, voice switches and same-tab reloads. Delayed tactical lines require their original game and ply. Capture streaks no longer claim match-win streaks; a good move after a blunder no longer claims a material comeback. Thirty additional same-voice lines remain a queued ZAI task, not installed audio.
- National identity was tied to the auto-rematch setting, so stopping at a result could remove flags. The current match now remembers whether it seated nations, plus its season/bout. Its actual team names, flag palettes and event remain through review/result/retirement even as the ladder advances. Newly started manual-style matches retain classic identity. Rename and flag-off laws remain intact.

## Evidence

`docs/cinematic-release-tests.json` records all 45 JavaScript checks passing. The engine reports 38,466 assertions, zero failures. Node/Python builds match exactly at 13,075,564 bytes, SHA-256 `b964dd57e44a292d54f6606a0336d6cf93af2a1a6503869e99ef3bf4cef64390`.

Independent move generation crosscheck: American 10,874; Brazilian 7,316; Russian 7,308; International 13,972; Canadian 6,000; East Africa 8×8 7,446; East Africa 10×10 13,739; East Africa 12×12 5,997 positions, all zero mismatches.

`docs/cinematic-arena-browser.json` is actual retained browser playback: a complete fresh East Africa 10×10 arena game, 87 plies, plus part of the following game. The first game started at 1× and finished at 16×; this is not a controlled 16× benchmark. The sound verifier passes its complete-game boundary and cooldown/context checks. Female greeting, capture, double-capture, crown and engagement recordings actually started. No runtime errors were recorded. The same navigation continued through further bouts; a complete retained season and audible listening matrix remain separate acceptance requirements.

The first suite attempt encountered a missing `python3` Windows alias, an output-buffer limit on the verbose engine test, and isolated fixtures missing newly introduced production dependencies. Subsequent runs use the installed Blender Python, sufficient output capture and correctly supplied fixture dependencies. No engine expectation was weakened. The retained season report `docs/cinematic-season-browser.json` records 22 complete games including all 12 bouts of Season 1, 5,634 starts and 154 distinct IDs, with no recorded runtime errors or verifier issues. It came from the earlier preview: the owner's observed greeting/pacing issues mean it is not semantic/listening acceptance of the final version. The final corrected version needs continued actual playback.

## ZAI snapshot

Fetched isolated branch `codex/zai-audience-vibes` at `8af4ec7`. It remains actively generating/reviewing; it was not interrupted or assigned a competing task. A detached review worktree preserves its files separately from this release.

The current manifest lists 296 clips and 14,486,254 audio bytes. 255 entries explicitly disclose review outside the quota-limited ASR batch. Some remaining transcripts are nonverbal descriptions or inconclusive output. These claims do not prove a content-reviewed 501-clip audience pack or a working app integration. No unreviewed bulk pack, unrelated remote UI, or generated HTML was merged into the playable release. Continue reviewing actual files and content before the optional Audience Vibes installer/director is shipped.

## Still outstanding

The master blueprint remains active, including the full sound/visual/install acceptance matrix, legacy audio limits, optional audience pack and its integration, automatic human difficulty advancement, remaining intelligent reactions, complete season/hotseat playback and matching final hosts. This checkpoint does not claim those complete.

Final corrected browser check: Mozambique/Angola names and both CSS flag palettes were byte-identical before/after Stop and review; 2x pieces exposed a 467.5 ms transition. Evidence: docs/cinematic-review-flags.json. The preview recorded no runtime errors during these checks.
