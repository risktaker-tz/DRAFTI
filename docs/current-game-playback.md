# Current match playback evidence

The local built game was loaded in an isolated Browse Chromium session with the audio-audit query. Normal game controls selected East Africa 8×8 and the game mode. The production test hook's tap function drove the same square-selection handler as board input. The stand-in human always chose the first legal move. The Computer opponent used its actual selected ladder search.

The Computer game completed after 61 plies, with the human side winning by capturing every opposing piece. The built-in audit matched its fresh start and result boundary, with 225 sound starts inside the game. The Two players game completed after 55 plies with the same terminal condition and 235 sound starts inside its boundary. The combined report has 475 starts and 76 distinct IDs, including menu actions between games. The verifier reports zero unknown IDs, early-repeat violations, actor violations or captured page errors.

Artifacts are current-computer-audit.json and current-two-mode-audit.json. Current-computer-play.png shows a king during actual play. This is runtime event verification, not a listening certificate.

The Club-minimum runtime (3b3c4fba6e3884fb508c8aa7184e9f0fdab45a95) was then exercised in the real automatic arena. The retained current-arena-audit.json matches fresh starts and results for two complete East Africa 8×8 bouts of 74 and 82 plies, ending in the two-move and ten-move house draws respectively. It records 614 starts and 88 distinct IDs, with zero verifier issues or page errors. The verifier output is current-arena-verification.json. This supplies current arena full-bout event evidence alongside the earlier Computer and Two players reports. It does not prove a complete season or audible quality.

A twelve-bout observer progressed to five completed bouts, but the browser connection became unstable before its complete report was exported. A 1,008-case presentation matrix was also interrupted after 208 cases. Neither is complete acceptance evidence. Their reusable observers are scripts/browser_arena_season.js and scripts/browser_presentation_matrix.js. Rerun them in a stable isolated browser. Physical installation, final season playback, contrast and effect review remain open.

The strength menu was then verified with saved baseline l1 and actual arena seat levels l4/l4. It highlighted Club and showed Tanzania — Club and Kenya — Club for Season 1. The new regression also covers unequal l7/l8 opponents and personal Computer-mode selection.
