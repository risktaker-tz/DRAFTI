# Readability and first-visit theme checkpoint

Marble Lux is the fresh-install default; all existing valid saved themes remain unchanged. Real first visit: docs/default-marble-browser.json and PNG. All21saved choices and changing the real picker are tested in tests/test_default_theme.js.

Light-theme control bug: --panel-opaque remained dark while theme text became dark. Reuse the verified opaque theme face for the four existing underboard surfaces; choose readable foregrounds without changing board/material geometry, captured-disc logic, horizontal scrolling, flags, or audio. Keep original accent hover/selection layers over an opaque base. The independent review caught missing inactive-speed hover and transparent quick-action hover cases; both have explicit CSS-binding regressions. Independent sRGB checks cover483default/layered surfaces over21themes.

Quiet captions previously crossed the matchup names. Keep their stage host so text stays upright during board flips, anchor to44%inside the board frame, preserve all words/title and2.4-second timing. Real phone bounds: caption375–403px, board211–585px, billboard81–199px. No overlap.

Four rendered physical theme views are saved for Walnut Royale, Neon Glass, Tournament Green and Marble Lux. Board and disc measurements show true squares/circles; phone390px has no page-width overflow. These screenshots/measurements are scoped in docs/physical-theme-browser.json. A full-page fixed-background capture artifact was investigated; its temporary body-height change was fully reverted. Native captures replaced those artifacts. Full animation/king/reduced-motion/complete mode acceptance remains separate.

No original sound recording changed. This is another playable checkpoint within the active, unfinished master blueprint. Audience Vibes/streamer follow-up and the documented legacy audio-size/duration violations remain outstanding.
