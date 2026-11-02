# DRAFTI — MASTER BLUEPRINT: DEFECT FIXES + ENHANCEMENTS ONLY

You are taking over **DRAFTI — checkers, refined**, a mature, heavily-engineered open-source checkers game. Your job is **ONLY** to (1) fix the specific defects listed below and (2) implement the specific enhancements listed below. You must NOT refactor, re-architect, rewrite, "modernise", or redesign anything else. The foundation is solid and validated — 39,000+ engine assertions pass, the live site works, players are attached to the current behaviour. Anything not listed in this document stays exactly as it is. Read this whole document before writing a line of code; every section contains hard constraints that previous contributors learned the hard way.

---

## 0. PROJECT GROUND TRUTH (start here)

- **Repo:** `https://github.com/risktaker-tz/DRAFTI` — clone it. Current head: `b9486e1` ("flags, seasons theatre, and a computer that respects your time"). Working branch: `main`. Commit early and often with clear messages; never force-push.
- **Live site (GitHub Pages):** `https://risktaker-tz.github.io/DRAFTI/web/index.html` — this is the deployed proof of the current state. Do not break it.
- **What the game is:** one self-contained HTML file (`web/index.html`, ~9.4 MB, all CSS/JS/audio embedded as base64 — no build step to PLAY, no runtime network requests, works offline, engine runs in a Web Worker). Five rulesets (American, Brazilian, Russian, International 10×10, Canadian 12×12), three modes (vs Computer with a 10-level ladder, Two players, AI vs AI world arena), 194-nation arena with seasons/tournament, 330+ reactive sounds, 21 boards, 8 piece sets.
- **Repo layout:**
  - `src/` — the editable sources: `engine.js` (rules + AI search), `ui.js` (everything: arena, sounds, flags, menu), `styles.css`, `index.template.html`, `audio/audio.manifest.js`-generated `audio.manifest.js` (9 MB base64 bank: `window.DRAFTI_SFX = { name: {c: category, b: shortCredit, d: dataURI} }`), `audio/*.mp3` (360 processed clips)
  - `build_web.py` — assembles `src/` → `web/index.html` (tokens `/*__STYLES__*/`, `/*__ENGINE__*/`, `/*__UI__*/`)
  - `tests/test_engine.js` (36,000+ assertions: rules, perft, AI, styles, bait detection, fuzzing), `tests/crosscheck_movegen.js` (independent second move generator, byte-identical on 26,000+ random positions)
  - `ATTRIBUTIONS.md` — license + source for EVERY embedded sound; `sfx_swap/` — tool for swapping in original clips; `docs/` screenshots; `android/` Kotlin scaffold (do not touch); `README.md` — accurate feature list (keep it accurate)
- **Commands:**
  ```bash
  python3 build_web.py              # rebuild web/index.html after editing src/
  node tests/test_engine.js         # must print 0 failures (currently ~39,851 passes)
  node tests/crosscheck_movegen.js  # must stay byte-identical
  python3 -m http.server -d web     # serve for browser testing
  ```

### Non-negotiable ground rules
1. **No downgrades.** Every feature listed in Section 2 must still exist and work after your changes, in at least the same quality. If you touch a system, you re-verify the whole system.
2. **No placeholders, no stubs, no "TODO" left behind.** Every sound you reference must really play; every flag colour must really render; every feature must be reachable in the UI.
3. **Engine correctness is sacred.** If you modify `src/engine.js` at all, `node tests/test_engine.js` and `node tests/crosscheck_movegen.js` must pass 100% afterwards. The AI search stays in the Web Worker. Never change rules behaviour without a test pinning it.
4. **Single file, offline, no runtime network.** No CDNs, no external fetches, no analytics. All assets embedded. Keep `web/index.html` under ~14 MB (currently 9.4) — if the bank grows past that, shorten/re-encode clips (mono 22050 Hz, 56 kbps) rather than breaking the budget.
5. **Licensing discipline.** Every new sound gets a real, verifiable source entry in `ATTRIBUTIONS.md` (file name, source URL, license, use-in-game). Prefer CC0/public-domain. Short verbatim meme excerpts from YouTube/TikTok are acceptable **only** the way the game already does it: short excerpts, credited, identified by their own captions. Never fake provenance; if you cannot obtain a clip, use the documented fallback and say so in ATTRIBUTIONS.md.
6. **Persistence keys are contracts.** `drafti.settings.v1`, `drafti.stats.v1`, `drafti.arena.v2` — migrate forward, never wipe user data. New state goes in a new versioned key with a migration path from the old one.
7. **The past bugs below (Section 6, "Regression landmines") have all been fixed once.** You re-read that section before touching anything related, and you do not reintroduce them.

---

## 1. COMPLETE INVENTORY — WHAT EXISTS AND MUST KEEP WORKING

This is the list of everything the game already does. Treat it as a protection list: after your work, every line here must still be true.

**Engine & rules** — negamax + alpha-beta + iterative deepening + Zobrist transposition table, capture-first ordering, material/advancement/back-rank/mobility eval; perft-verified against published node counts; five rulesets with their exact crowning/flying-king/maximum-capture conventions; draw rules (inactivity, threefold repetition); engine-verdict badges on the score sheet (`!!`, `?!`, `?`, `??`); standard score notation + live ticker.

**Levels & pacing** — one 10-rung ladder shared by menu and arena (`LEVELS` in `src/ui.js`: `l1` Beginner → `l10` The Machine, with `budgetMs`, `maxDepth`, `jitter`, `blunder`, `pool`). **Computer-vs-human think times were capped on purpose: search budgets cap at 1.3 s in computer mode, mulling caps under it; measured full turns 1.5–2.8 s at l10 with human-like pacing on (was up to 17 s). Deep searches belong to the spectator arena only — do not undo this.** "Human playing mode" gives engines human pacing: quick snaps on forced shots, real thinks on hard positions, occasional long stares.

**World arena (AI vs AI auto-rematch)** — 194 nations (`NATION_DATA`), Tanzania hosts (champion, ivory seat), queue in bands (1 The rivalry → 7 Oceania) shuffled inside each band; winner keeps the board, beaten champion joins the back of the line; per-challenger rounds (default 1, editable); **season = 12 bouts = tournament** (SEASON_STAGES: 0–4 group stage, 5–8 quarter-finals, 9–10 semi-finals, 11 grand final); every stage change announced with fanfare ("X advances to the semi-finals!"); reunions counted and announced ("X and Y meet again — the 5th time in the arena"); season close announced ("X advances to Season N — every nation returns one rung stronger"); retirement ceremony with the crowd line "How can you allow the one with that skill to retire?!" + 🎖 Retire button; `guardArena()` enforces the one law: two DIFFERENT nations on the board, always (this fixed the Simba-vs-Simba bug — preserve it); experience system (+2 per game, +3 win, +4 defeat; 5 xp = 1 rung; **every nation climbs one more rung each new season**); challenger rubber-band: never more than two rungs below the champion.

**Names & flags** — every nation renameable in "The players" menu card (chips, "+ all 194 nations" expander, `btnNameReset` restore button); the **colour law follows the name law**: a seat keeps its flag colours only while it bears its country's name; rename it → classic colours; restore the name or press restore → flag colours return. `FLAG_COLORS` maps all 194 nations to `[main, secondary]`; a clash resolver switches the challenger to its flag's other colour when the two mains would blur (Italy green vs Burkina Faso red), lightness split as last resort; flag colours drive pieces, banner dot, capture trays, move-log/ticker dots (`--side-a-*`/`--side-b-*` CSS variables, `body.flags-on`). Currently flags show in AI vs AI; human games keep classic ivory/ebony.

**Sound system (330+ sounds, `SFX_BANK`)** — categories `majestic | comedy | voice | judge | think | drama | party | ui` (plus in-code synthesized wooden sounds: move, capture, select, king, illegal, undo, levelup, relief, trap_snap). 183+ neural-TTS voice lines in two voices; judge commentary; per-school table talk for 12 playing styles; trap drama both directions; doom drama (red vignette, sad violin, "Let me tell you something…" taunt loop with cooldown, chicken panic, relief chime on escape); heckles escalating at 12/25/45/75/105 s of human think + big-brain treatment; time cards at 3.4 s / 8.5 s of engine think (seat-aware budget floor); first human nudge at 6.5 s; **think pulse** (soft tick under any long think — engine, hint, arena — starts/stops with the search); banner thinking dots; thinking side's pieces breathe (`thinkBreath`); first blood, crowning shockwave "The king has arrived!", board jolts on heavy captures, ladder/giant-killer/streak celebrations; sourced meme clips identified by their own caption cards; **no-repeat think deck** (`THINK_DECK`, 130+ clips, never the same twice in a row); narrator card quota per game (`aiCardsThisGame`); cooldowns (e.g. `lastDoomTaunt`); every category toggleable and volume-mixed in the Sound design panel; global mute + ⏳ Thinking chip.

**Presentation** — 21 contrast-checked tables (futuristic sets, realistic Walnut Royale, four real-equipment replicas), 8 piece sets (Tournament Red, Turned Wood, Ivory & Jet, Amber Bakelite, Steel & Brass, Neon Glass, Marble Stone, Follow table), kings = two stacked discs, High-visibility toggle, Ambient glow, jump-path previews with numbered landing badges and doomed-✕, hint 💡 / undo ↩ pills with `H`/`U` keys, AI-aware undo, optional move clock (30/60/90 s with ticking + whistle), menu drawer (☰ or `M`, seven numbered sections) sliding over the dimmed board, board flip in two-player, your name is UHAKIKA by default and editable.

**Arena playback** — AI vs AI pause, 1×/2×/4× speed, auto-rematch, between-bout countdown card with stage + meeting count.

**Repo hygiene** — MIT LICENSE, README accurate, docs/ screenshots, Android scaffold.

---

## 2. DEFECT FIXES (do these first, in this order)

### D1 — Flag colours: full 194-nation audit and correctness pass
The owner reports the pieces still do not reliably wear each country's correct flag colours. Fix it properly:

1. **Build an authoritative reference first.** Compile, from a reliable reference (official flag specifications / Wikipedia flag files), a table of each of the 194 flags' dominant colours with hex values. Save it as `scripts/flag_reference.json` in the repo (code, country, ordered dominant colours) with the source URL in a comment.
2. **Audit `FLAG_COLORS` in `src/ui.js` against it, nation by nation.** Current mapping policy is `[main, secondary]`; some entries are questionable — e.g. **Kenya is mapped to `['#B3202C','#1C7A3C']` (red/green) while the most identifiable flag colours are black, red and green** — judge each nation by its flag's most representative, most identifiable colour for a game piece, then its secondary. Fix every entry that is wrong, muddy, or too pale to read as a piece. Dark-on-dark and light-on-light are handled by the resolver, but per-nation choices must be defensible on their own.
3. **Render-proof every nation.** Write a script/eval that renders a contact sheet: every nation's pieces on the board (or a grid of piece swatches), exported to `docs/flags-audit.png` + a printed table of nation → chosen main/secondary → reference colours. Every one of the 194 must visibly match its real flag.
4. **Check the whole colour pipeline, not just the table:** the clash resolver (test the known pairs: Italy vs Burkina Faso, Indonesia vs Monaco, Ivory Coast vs Ecuador, Madagascar vs Kenya, etc.), kings' crowns contrast on flag backgrounds, banner dot, capture trays, move-log/ticker dots, the rename law (rename → classic colours, restore → flag colours, `btnNameReset`), High-visibility mode, and each of the 8 piece sets + 21 tables (flag colours must win over piece sets; the `!important` chain in `body.flags-on` rules must not be defeated by new CSS you add).
5. **Visibility in every mode.** Flags are currently arena-only. Make flag colours available in ALL modes behind the existing toggle philosophy: ON by default in the AI vs AI arena (as now), and an explicit opt-in toggle (in The players card) for Computer and Two-players games, remembered in settings. The classic ivory/ebony look remains the default for human games and always available everywhere. Nothing the owner already relies on disappears.
6. Do not touch the name law while doing this — they are one law (colour follows name) and it must keep working exactly as described in Section 1.

### D2 — Sound failures: replace the recreations with the exact original clips
The bank was built in a sandbox that could not download from YouTube Shorts. Two wanted clips are currently in-house TTS **recreations**. These are the only two known failures, and they are documented in `sfx_swap/README.txt` and `ATTRIBUTIONS.md`:

| Game sounds | Wanted original clip | Exact source | Current state | What to do |
| --- | --- | --- | --- | --- |
| `shrimp1`, `shrimp2` | "Is this the shrimp one??" | https://youtube.com/shorts/mvUVrweNvsQ | TTS recreation of the line | Download the Short's audio, cut the moment where the line is spoken, convert: `ffmpeg -i clip.m4a -ac 1 -ar 22050 -b:a 56k shrimp1.mp3` (same for `shrimp2` with a second usable take), drop into `src/audio/` replacing the recreations, rebuild with `python3 build_web.py`, update ATTRIBUTIONS.md |
| `v_retire1`, `v_retire2` | "How can you allow the one with that skill to retire?!" (the 0–15 s moment of the clip) | https://youtube.com/shorts/KBVNiOAnHiA | TTS recreation of the line | Same procedure with names `v_retire1.mp3`, `v_retire2.mp3` |

Instructions for both:
- Locate the exact timestamp by listening + silence analysis of the downloaded audio (the waveform gap before/after the spoken line marks the cut points; cross-check any caption card burned into the video frames, the way the existing meme clips were verified).
- Keep the exact file names (`shrimp1.mp3`, `shrimp2.mp3`, `v_retire1.mp3`, `v_retire2.mp3`), mono, 22050 Hz, ≤ 56 kbps, peak-normalized to −1.5 dBFS, each ≤ ~3.5 s.
- If the Short remains unreachable after genuine attempts (mirrors, alternate uploads, the uploader's other platforms, audio-tag sites), say so explicitly in ATTRIBUTIONS.md next to the entry and keep the TTS recreations as the fallback (they already exist in `sfx_swap/`-style backups — keep backups of both versions so the swap stays reversible).
- While you are in there: run a **full sound-integrity audit** — script a pass that (a) extracts every `SFX_BANK.play('…')` id and every dynamically-pooled id from `src/ui.js` and asserts each resolves to a manifest entry or an in-code synthesized sound (currently 0 dangling; keep it that way), (b) asserts every manifest clip is ≤ ~6 s and ≤ ~60 KB, (c) walks a scripted game in all three modes headless and logs every sound actually triggered, so no silent/dead path ships. Commit the audit script under `scripts/`.

### D3 — Arena fairness: no nation is favoured, and everyone gets better
The owner watched the AI league and perceived **favouritism toward Kenya**. Kenya currently enjoys a structural privilege by construction: it is band 1 ("The rivalry") and therefore **always the first challenger** in a fresh arena, and band 1 is only 1 nation so it comes around disproportionately often at the start. Remove every structural advantage:

1. **Fair opening call.** The first challenger of Season 1 may stay Kenya (the flavour is nice once), but from Season 2 on the first call must rotate fairly (e.g. rotate the honour band-wise, or draw the opening challenger at random from nations that have not yet appeared). The queue itself stays band-ordered and shuffled within band — that part is fair — but no nation may be structurally privileged in scheduling, seat, level, or openings.
2. **All AIs fully capable.** Every seat uses the exact same engine and the same 1–10 ladder; playing styles bias *personality*, not raw strength. Add a test proving it: same-level round-robin across styles must show no style with a systematic win-rate edge beyond noise.
3. **The rubber-band must help both seats fairly.** Today `hl = max(rosterLevel(challenger), championLevel − 2)` lifts the challenger. Keep the "never more than two rungs below the champion" law (it keeps bouts watchable) but verify it cannot produce runaway champions: if the champion is far above its own roster level, the bout must still be competitive.
4. **Progression — every AI keeps getting better, especially when something is at stake.** Keep and strengthen the existing systems: +2 xp per game, +3 per win, +4 per defeat, 5 xp = one rung, **+1 rung for every nation each new season**. Add stage-pressure rewards: winning a quarter-final, semi-final or the grand final, and retaining the title, each grant bonus xp; knockout bouts are played at each nation's full current strength with a modest extra search effort within arena budgets (the arena, NOT computer-vs-human, owns deep searches — see the pacing cap in Section 1). The result: a nation that keeps winning events climbs faster, and every season the whole world comes back stronger, exactly as the owner asked.
5. **Prove it with a simulation.** Write `scripts/arena_fairness_sim.js` (Node, headless, using the real engine): play at least 3 full seasons (~36 bouts) auto-rematch and print a table of bouts played, wins, and levels per nation, plus season-over-season level growth. Acceptance: no nation wins or appears at a rate statistically out of line with the queue design; Kenya is not privileged; the champion is eventually dethroned; median roster level rises each season. Commit the sim and its output table (in the report + `docs/`).

---

## 3. ENHANCEMENT E1 — A premium physical board and true checkers (the biggest visual upgrade)

The owner's verdict on the current pieces: they read as **flat ovals**. Investigate what top-tier checkers/draughts sets and board-game UIs look like, then rebuild the board-and-piece presentation to that standard — **without breaking** the 21 tables, 8 piece sets, High-visibility, flags, flip, jump-path previews, or animation performance.

**Pieces (the ovals):**
1. Diagnose why they read as ovals (`.piece .body` is `width:78%; height:78%` inside `.piece`; if the cell or flex context is not perfectly square, the circle squashes). Guarantee a true circle at every board size and viewport (`aspect-ratio: 1/1` or equivalent), on 8×8, 10×10 and 12×12 boards.
2. Redesign the man as a real checkers disc: concentric lathe grooves (repeating-radial-gradient or inline SVG), a beveled edge with top-light/bottom-dark rims, a soft contact shadow, and a subtle specular highlight — a piece you feel you could pick up. Keep it crisp at 60 fps, pure CSS/SVG (no images, no canvas, no network).
3. Kings stay two stacked discs (the lower disc peeks below, as now) — make the stack read clearly in 3D (offset lower disc + short side wall) and keep the crown emblem with strong contrast on every flag colour and piece set.
4. All 8 piece sets (Tournament Red, Turned Wood, Ivory & Jet, Amber Bakelite, Steel & Brass, Neon Glass, Marble Stone, Follow table) must be re-skinned onto the new geometry so each set looks genuinely different in material, and `Follow table` keeps working.
5. Flag colours override piece geometry colours exactly as today (the `body.flags-on` law). High-visibility rims stay.

**Board:**
6. Give every table a crafted frame: an outer frame band (material per theme: walnut, leather, metal, neon), an inner bevel/inlay line, and a soft stage shadow + ambient glow behind the board. Square coordinates remain and must stay readable on every theme.
7. Subtle per-theme square texture (wood grain, felt, glass) as today, but deepen it: bevelled square edges, a faint inner shadow at the board's dark-squares edge, and a refined last-move highlight (soft shimmer instead of a flat tint). Keep all 21 tables contrast-verified (the existing contrast tooling `check_contrast.py` in the build workspace — recreate it in `scripts/` if missing — must pass square-vs-square and piece-vs-square for every table after your changes).

**Piece & event effects (the hook — make moments feel big):**
8. Capture: the captured disc shatters/pops (scale+rotate as today) plus a short particle burst and a mini-disc that flies toward the winning side's capture tray.
9. Crowning: keep the shockwave ring, add a coronation glow that rolls across the crowned side's pieces and a crown drop-in on the piece.
10. First blood keeps its sting; add a subtle slow-motion feel on 3+ capture feasts (animation timing, not engine timing).
11. Doom: the doomed side's pieces get a faint ember pulse (in addition to the existing red vignette).
12. Victory: when a game ends, the winning side's pieces do a small victory bounce parade and a one-time confetti/spark burst; the retirement ceremony keeps its theatre.
13. Every new visual effect must have a matching sound (see E2) and must respect reduced-motion preferences (`prefers-reduced-motion`: disable particles/parade, keep functional motion).

---

## 4. ENHANCEMENT E2 — Sound design: 100+ new effects, intelligently directed

The bank currently holds 330+ sounds (per-category counts: voice 118, think 106, drama 29, judge 31, ui 33, party 21, comedy 16, majestic 6). The owner wants **a lot more — 100 or more new effects, funny ones, authentic to the moment**, and a director smart enough that nothing repeats into boredom.

**A. The voice/speaking pipeline you must use (all resources below are the ones the project has been using):**
- Neural TTS, two voices, via the `z-ai` CLI: `z-ai tts -i "<line text>" -o out.wav --voice jam --format wav` (voice **jam** = the British judge) and `--voice kazi` (voice **kazi** = the persona announcer). Retry on HTTP 429 with patient ~35 s backoff.
- Post-processing (the exact chain used for all 183+ existing lines): trim leading/trailing silence without ever cutting speech → 120 ms head, 220 ms tail → peak-normalize to −1.5 dBFS → mono 22050 Hz → MP3 56 kbps. (`ffmpeg` for decode/encode; numpy for the trim/normalize.)
- Embedding: every processed clip becomes a base64 data URI in `src/audio.manifest.js` as `name: { c: '<category>', b: '<short credit>', d: 'data:audio/mpeg;base64,…' }`; categories: `majestic | comedy | voice | judge | think | drama | party | ui`. Then `python3 build_web.py`. Credits stay short inline; full licenses in ATTRIBUTIONS.md.
- **Commit the pipeline into the repo** so it is reproducible by anyone: `scripts/tts_make.sh` (generation+retry), `scripts/voice_proc.py` (processing), `scripts/build_sfx_manifest.py` (embedding), plus `scripts/voice_lines.md` listing every voice line's name, voice, and exact text (extract this from the existing bank/manifest so the tone and format stay consistent — short, punchy lines, ≤ ~60 characters). If `z-ai tts` is unavailable in your environment, do NOT fake voice lines and do NOT use robotic runtime SpeechSynthesis: reuse/extend from the existing 360-clip pool and note the limitation in the report.
- The raw pipeline workspace also still contains the historical generators (`tts_gen*.sh`, `voice_proc*.py`, `think_stings.py`, `sfx_stadium.py`, `wire_stadium.py`, `download_sfx.py`, `process_sfx.py`, `research_sfx.py`) — use them as reference for conventions and naming.

**B. Add ≥100 new sounds across the bank, funny and moment-authentic.** Sourcing order: (1) CC0/public-domain (freesound.org with the `Creative Commons 0` filter, archive.org collections already used: Warner Bros. cartoon FX CC0, Hanna-Barbera CC-BY 3.0, Wilhelm scream PD, rimshot PD), (2) verbatim short meme excerpts from YouTube/TikTok **where authentically possible** — located by silence analysis + the video's own caption cards, exactly like the existing meme set, credited in ATTRIBUTIONS.md, kept short (≤ ~3.5 s) and in good taste for a family-friendly game; (3) in-house synthesis (as with trap_snap/relief/levelup). If a wanted meme cannot be obtained or is offensive/unsuitable, skip it and pick another — the bank is allowed to grow, not to offend. Processing target for all: mono 22050 Hz, 56 kbps, −1.5 dBFS, loudness-matched to the existing bank.

New sounds must cover at least these events (with 3–6 variants each where listed, so nothing repeats back-to-back):
- **Movement:** piece slide-whoosh scaled to distance (2–3 variants), landing "thock" variants, multi-jump step sounds within one move (each landing) + a crescendo on the final landing.
- **Captures:** 3–5 impact variants; capture-streak escalation tiers; a "big feast" finale for 3+.
- **Kings:** crowning fanfare variants, a subtle shimmer when a king moves.
- **Thinking/comedy:** more funny narrator time-cards and heckles (voice lines via the pipeline above, both voices), plus meme stings — candidates to source authentically (verify each, credit each): Vine boom (already have CC0; consider the canonical clip), "BRUH" canonical, Windows XP error, sad-violin canonical, "Dun dun duuun" canonical, "Nani?!", "Omae wa mou shindeiru", "Emotional damage", "Yeet", "Woah-oh-oh" (epic swell), cartoon zip/boing variants, slide whistle variants, " Achievement" chimes, crowd gasp, rimshot variants, drum roll, cymbal, boxing-bell, gong variants, airhorn, party popper, bowling strike, pinball, arcade coin-up, game-over jingle, 1-up, level-up fanfares, "F" sting, cricket variants, kettle boiling, clock ticking, pencil scribbling, coffee sip, chair creak, page flip, scoreboard ding, applause variants, "Ooooh!" crowd, "Awwww" crowd, vuvuzela, stadium roar variants. This list is indicative — curate to taste and availability; target **≥ 100 new ids total across categories**.
- **Arena/tournament:** season-opening gong variant per stage, group→quarter→semi→final step-up stings distinct from each other, trophy-lift + crowd chant for the champion, title-retention sting, reunion-drum variants.
- **UI:** drawer, chips, sliders, toggles, theme-sparkle variants, countdown blips, victory/defeat/draw jingle variants.

**C. The sound director gets smarter (extend, never bypass):** generalise the `THINK_DECK` no-repeat pattern into a per-category deck with a history window; a global recently-played set with per-clip cooldowns (a clip cannot repeat within N events or M seconds); mood continuity (never two same-mood narrator cards back-to-back; alternate voices jam/kazi naturally); a priority queue (big-event sounds outrank ambient ones; drop ambient when something important fires); game-phase awareness (opening/midgame/endgame/doom/celebration gates which categories may fire); keep the existing quotas (`aiCardsThisGame`) and cooldowns, and register any new categories in the Sound design panel so every sound stays toggleable and mixable. The acceptance bar: watch a full arena season and a full human game — **no clip repeats so soon it bores, no wrong-moment sounds, no spam.** This is the same discipline that fixed the earlier "repeating narrator cards / doom re-announcements / cartoon spam" bugs — do not regress them.

---

## 5. DEPLOYMENT — Vercel at drafti.vercel.app (keep GitHub Pages too)

1. Add a `vercel.json` at the repo root deploying the static site with zero build: `{ "framework": null, "outputDirectory": "web", "cleanUrls": false }`.
2. Authenticate (`vercel login`, or `VERCEL_TOKEN` if provided), then `vercel link --yes --project drafti && vercel deploy --prod --yes`. The project MUST be named exactly `drafti` so the production URL is **https://drafti.vercel.app**. If that subdomain is occupied on the account, attach `drafti.vercel.app` as the project's domain in settings.
3. Verify: `curl -s https://drafti.vercel.app | md5sum` matches the local `web/index.html` build's hash; the game boots, plays a move, and sounds fire on the deployed URL.
4. GitHub Pages deployment stays exactly as it is and must still serve the same build (verify the Pages hash too). Both hosts ship the same artifact.
5. Add the Vercel deploy badge/URL to README.md alongside the existing Pages URL.

---

## 6. REGRESSION LANDMINES — bugs fixed once already; do NOT reintroduce them

- **Duplicate-seat bug:** the arena once seated a renamed nation against itself ("Simba SC vs Simba SC"). `guardArena()` + the "two different nations, always" law fixed it. Any new seat logic goes through `guardArena()`.
- **Sound pacing collapse:** narrator cards re-fired every think, doom re-announced itself, cartoon sounds spammed. Fixed with quotas, cooldowns, no-repeat decks and pacing gates (commit `62023a5`). Every new sound must pass through the director (Section 4C), never a raw `setTimeout(SFX_BANK.play(...))` loop.
- **Computer-vs-human waits:** engine thinks once ran up to ~17 s in human games. The 1.3 s budget cap / 2.8 s worst-case turn in computer mode is a feature — the arena keeps deep searches. Never let human-facing think times regress.
- **Layout ghosts:** the board once blurred, the banner once scrolled away, and ceremony overlays once painted over the board forever. The `[hidden] { display:none !important; }` rule is load-bearing — keep it.
- **Flag law vs name law:** colours must follow names exactly (rename → classic; restore → flag). Any CSS you add must not defeat the `body.flags-on` overrides or the classic colours.
- **Persistence:** keys are versioned; migrate, never wipe (`drafti.arena.v2` already migrated the v1 club personas once).
- **Engine/test discipline:** perft counts and the crosscheck generator are the ground truth. If tests fail, your change is wrong — fix your change, not the test.
- **Size/offline:** the single file must stay self-contained (no CDN), under ~14 MB, and work from `file://` offline.
- **Documentation:** README.md and ATTRIBUTIONS.md must be updated in the same commit as the behaviour they describe. New screenshots into `docs/`.

---

## 7. VERIFICATION & ACCEPTANCE (do all of it; the work is done when this list is green)

1. `python3 build_web.py` clean; `node tests/test_engine.js` 100% pass; `node tests/crosscheck_movegen.js` byte-identical.
2. **Flags:** `docs/flags-audit.png` contact sheet of all 194 nations + printed nation→colour→reference table; spot-check in a real browser: TZ vs KE, IT vs BF (clash), Indonesia vs Monaco, rename law both directions, `btnNameReset`, HV mode, 3 piece sets, flags toggle in Computer and Two-players modes.
3. **Sounds:** integrity audit prints 0 dangling references; bank count ≥ 430 (360 + ≥ 100 new) with per-category counts; loudness/size limits respected; both wanted original meme clips either replaced (links credited) or explicitly documented as unreachable; a full scripted play-through in all three modes triggers sounds with zero console errors and zero repeats inside the cooldown windows.
4. **Fairness:** `node scripts/arena_fairness_sim.js` output shows balanced appearance/win distribution (Kenya not privileged), dethroning happens, and median level rises season over season; stage bonus xp visible in the table.
5. **Visuals:** screenshots in `docs/` (new pieces on at least 4 themes incl. Walnut Royale and Neon Glass, capture burst mid-animation, crowning, victory parade, doom embers, flags on/off) — reviewed by eye; animations smooth; no layout regressions on 8×8/10×10/12×12; `prefers-reduced-motion` honoured.
6. **Deploy:** `https://drafti.vercel.app` serves the exact new build (hash match); GitHub Pages still green (hash match).
7. Final report: what changed and why, per-defect evidence (numbers, screenshots, sim tables), new ATTRIBUTIONS entries, any wanted clip you could not obtain and the fallback used. No placeholders anywhere.

Remember at every step: **you are the caretaker of a polished product.** Fix the listed defects, add the listed enhancements, verify everything, deploy — and leave every unlisted thing exactly as you found it, working.
