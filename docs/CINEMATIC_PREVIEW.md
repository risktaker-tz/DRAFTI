# Cinematic effects review preview

This branch is a review preview of thirty optional additions/refinements. It is not approved for production. The existing game, sounds, materials, flags and engine stay in place.

Open Preview studio to try individual effects, select Subtle/Balanced/Livestream, play the showcase, or compare the original presentation. Staged visual previews do not change the game result or legal position. Actual gameplay uses the event conditions below. Reduced motion suppresses the new animation; the original sound mixer remains authoritative.

| Group | Effect | Gameplay trigger |
| --- | --- | --- |
| Board | Directional edge lights | Verified important tactic; at most twice/game, 22 seconds and six plies apart |
| Board | Landing ripples | Fresh engine analysis confirms a good capture, promotion or exceptional quiet tactic; never a routine landing |
| Board | Capture fracture shimmer | Two or more pieces captured by one piece; branching cracks grow from the actual captured square and fade |
| Board | Multi-capture energy paths | Two or more captures |
| Board | Advantage sweeps | Material lead changes sides |
| Board | Promotion runway lights | An engine-legal promotion move |
| Board | Last-stand square pulses | Verified doom assessment |
| Board | Clutch-move focus | Verified important tactic, with signature effects competing rather than stacking |
| Board | Victory perimeter lights | Actual win |
| Board | Balanced draw waves | Actual draw |
| Pieces | Soft impact compression | Capture or long king landing, with shake enabled |
| Pieces | Directional movement lean | Multi-capture, promotion or long king move, with shake enabled |
| Pieces | Material-aware glints | Engine-confirmed quality, promotion or long king landing |
| Pieces | Multi-capture charge halos | Two or more captures |
| Pieces | Crowning spark orbits | Actual promotion |
| Pieces | Winner salutes | Actual winning side |
| Pieces | Threat reactions | New legal multi-capture threat or threatened side with three or fewer pieces |
| Pieces | Hint-wink sparkles | Actual hint |
| Pieces | Survivor relief reactions | A critically threatened piece survives and its actual threat clears |
| Pieces | Fading movement echoes | Multi-capture or long king move |
| Background | Active-side spotlights | Verified pressure or exceptional tactic; faint light only during sustained thinking |
| Background | Team-coloured crowd washes | Multi-capture or verified exceptional tactic |
| Background | Pointer-responsive lighting | Board interaction only; expires after inactivity, never follows menu/studio interaction |
| Background | Theme-matched atmosphere | Sustained quiet thought or human deliberation, with ambient atmosphere enabled |
| Background | Tournament mood lighting | Actual national tournament stage, with burst only on stage/season change |
| Background | Comeback horizon glow | Actual material comeback |
| Background | Crowning aurora | Actual promotion |
| Background | Celebration sparkles | Actual win |
| Background | Calm draw transitions | Actual draw |
| Background | Intermission ambience | Once during an actual between-bout countdown, never on every countdown tick |

New preferences use only drafti.cinema.preview.v1. This preview uses bounded transient nodes, effect cooldowns, cleanup on new games, and passive pointer listeners. It adds no downloaded audio, external libraries, backend or AI-strength changes.

All thirty effects have independent quiet intervals and per-game quotas. Global cooldowns continue across rapid league bouts. Staged studio demonstrations bypass gameplay quotas without consuming them. Stale, forced, ungraded or poor moves cannot qualify as intelligent tactics. Higher priority crown/win backgrounds replace lesser crowd washes. Menus, retirement ceremonies, hidden tabs, reduced motion and the ambient toggle suppress applicable gameplay additions.

Playback keeps the same 700 ms baseline hop at 1× and scales hop duration by the selected multiplier (including capture chains). At accelerated speeds the next side searches the already-known legal next position during the current animation, using the same level, depth, budget and personality options. Only a matching epoch, board, side, ruleset, progress count and level may consume that result. Live speed changes retime an already pending humanlike presentation wait in both directions. Calculation itself is not divided by the speed selector: demanding positions at high levels can remain CPU-bound. Exact whole-match 16× throughput on every device is not proven or promised by presentation timing tests.

Retirement ceremonies now use all 194 existing verified SVG flag sources, compressed and embedded offline. Original artwork bytes are pinned by the existing reference hashes. Unsupported decompression keeps the prior emoji fallback; modern supported browsers render the same artwork across devices. No selected board, piece material or flag palette is changed. The compressed archive keeps the complete HTML below 14 MiB.
