# Season Cup checkpoint

The existing twelve-bout winner-stays challenge season now ends with a recorded Season Cup. The grand-final winner earns the cup; a drawn final gives both finalists shared honours. The award uses the completed match seats, even when retirement has already changed the next host. It does not choose moves, force winners, change XP or change the arena queue.

Cups progress through Bronze, Silver, Gold, Platinum, Royal Sapphire, Emerald Crown, Diamond and Celestial. Higher seasons add gems and their own engraved prestige number; prestige never cycles backwards. The trophy carries the actual winning nation flag, or both flags on a shared cup. Existing in-house trophy fanfares provide the short music through the director, category mixer, global mute and ceremonial priority. No national anthem is claimed, no audio bytes are replaced, and no new download is needed.

`drafti.season-honours.v1` is routed through the existing local-player store. Honours and the new arena season save together with the finished match cleared. League reset explicitly clears the active player's honours. Old leagues start tracking awards from this update; no historical titles are invented. The arena menu displays the latest twelve recorded cups, while the save retains the full award history. Unknown future save schemas are preserved.

Verification:

- All 64 engine, crosscheck, rules, audio, persistence, worker, playback, cinematic and installation checks pass: `season-cup-tests.json`.
- Actual final-result tests cover both physical colours, drawn finals, retirement on/off, duplicate-award rejection, resume, per-player separation/reset and atomic saving.
- Native Gold and Celestial review fixtures execute a legal last-piece capture through `executeMove`; the winner, flag and recorded title agree. These are isolated review games, not public match results. Long review timers are held only for screenshots.
- `season-cup-audible-browser.json` records an actual trophy source start with an AudioContext running, master gain 0.9 and ceremonial priority 100.
- Shared-final boundary proof renders both finalist flags on a phone without horizontal overflow. It verifies the result-to-award boundary, not legal draw adjudication.
- Restarting during a held ceremony hides it; resolving its old timer cannot restart the former countdown: `season-cup-cancelled-browser.json`.
- Sound integrity still measures 544 embedded clips with no missing ids/events, duration violations, encoding violations or oversized files. Existing recordings and engine source are unchanged.
- Both builders produce identical 14,284,907-byte HTML, SHA256 `63376929a3127519815ed02ee64481e228af2c824fb0503d740fc9ff20ba3235`.

The menu-only Studio checkpoint `62b2ace71ff63df3f01f52a09f5d9b9b0d9540e1` was already deployed READY as `dpl_5CbjxFE66AQYdnZHhGfGSdWhi6qK`. Both public hosts returned HTTP 200 with identical 14,276,247-byte HTML, SHA256 `69272b9e6ce9b09e0bc05cca1f6afca0ed1634b1fa3a3f3003fc315eed254f2a`.

Broader master-blueprint acceptance remains active: complete current-policy fairness seasons, full all-theme rendered contrast/motion checks, remaining reviewed audience content and streamer vocabulary, and physical installed-device checks are not claimed complete here. Startup work stays deferred as instructed.
