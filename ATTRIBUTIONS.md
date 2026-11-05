# Sound & voice attributions

Season Cup ceremonies reuse the existing `fx_trophy_1`–`fx_trophy_4` in-house ceremonial fanfares credited below. They accompany the actual winning flag(s); they are original game music, not national anthem recordings. No existing recordings were replaced for this feature.

Every sound in DRAFTI is open-licensed, synthesized in-house, or a short
sourced meme effect credited below. Samples are embedded in `web/index.html`
(base64 MP3); the processed source files live in `src/audio/`. This file
lists the origin and license of each.

The bank holds **380 sounds**: recorded samples, sourced meme effects and
original excerpts (below), neural-TTS voice lines, and original synthesized
interface/game sounds (plus four more synthesized effects — trap snap,
refusal buzz, relief chime and the level-up fanfare — generated in-code at
playback time). Per-sound provenance is recorded in `scripts/audio_catalog.json`.

## Meme sound effects (sourced verbatim, identified by their own captions)

| Sound in game | What it says | Source video | Use in the game |
| --- | --- | --- | --- |
| `badboy`, `badboy2` | "You are a bad boy!" | "You Are A Bad Boy - Naija Comedy Sound Effect" by Topinfo_ng — https://www.youtube.com/watch?v=PGLg01Lcw10 | Greedy multi-captures (2+ pieces in one move) |
| `tellyou` | "Let me tell you something, let me tell you something…" | "Let Me Tell You Something - Meme Sound Effect" by YTSFX — https://www.youtube.com/watch?v=NkOeRRj-04k | The moment a 3+ capture feast begins |
| `oof` | "OOF" (card 01) | "popular meme sound effects" by Mondal Screen — https://www.youtube.com/shorts/N1BOQ_9laWs | Double-capture impact |
| `ahhscary` | "AHH! SCARY" (card 02) | same compilation | Disaster-blunder reaction |
| `animewow` | "ANIME WOW" (card 03) | same compilation | Brilliant-move reaction |
| `later_moments` | "A few moments later" (card 04) | same compilation | Narrator card during long engine thinks |
| `omg` | "OH MY GOD" (card 06) | same compilation | Disaster-blunder reaction |
| `later_hours` | "2 HOURS LATER" (card 08) | same compilation | Narrator card during very long engine thinks |
| `god` | "GOD." (card 10) | same compilation | Drawn games |

Each segment was located with silence analysis of the source audio and
cross-checked against the numbered caption cards burned into the video
frames (01, 02, 03, 04, 06, 08, 10) — no mapping is guessed. These clips are
short excerpts included for entertainment; the original uploads remain the
property of their creators, who are credited here and in the in-app bank.

## Meme moments — historical in-house voiced recreations

The original build sandbox could not download these two requested Shorts.
Both exact sources were subsequently obtained on the owner's Windows machine
and the requested originals are now installed. The historical TTS versions
remain unchanged under `sfx_swap/backups/` for a reversible swap. See the
verified source sections below and `sfx_swap/README.txt`.

| Sound in game | What it says (recreation) | Wanted source clip | Use in the game |
| --- | --- | --- | --- |
| `shrimp1`, `shrimp2` | Historical TTS fallbacks, now backed up; replaced by the original question and question-plus-Anyway framings below | https://youtube.com/shorts/mvUVrweNvsQ | Reversible fallback only |
| `v_retire1`, `v_retire2` | Historical TTS fallback, preserved under `sfx_swap/backups/`; replaced by the verified originals below on 2026-11-02 | https://youtube.com/shorts/KBVNiOAnHiA | Reversible fallback only |

## Animal comedy & viral stings (freesound.org, CC0)

Picked from CC0-filtered freesound searches, trimmed and level-matched to
the bank. Each entry names the game sound, the freesound sound id and
uploader.

| Sound in game | Source | Use in the game |
| --- | --- | --- |
| `chicken` | freesound.org/s/830091 by MBPL | The doomed side shuffling on, keep-playing patter |
| `panic` | freesound.org/s/727396 by Mastersoundboy2005 | Alarmed squawk — the engine realises it is trapped |
| `duck` | freesound.org/s/719115 by OwennewO | Sitting-duck blunders (missed jump alternate) |
| `meow` | freesound.org/s/110011 by tuberatanka | The cat lays a trap / catches its mouse |
| `purr` | freesound.org/s/575933 by Buskieboy | A crushing engine, "Purrrfect." |
| `vineboom` | freesound.org/s/802074 by modusmogulus | Double-capture impact alternate, doom taunts |
| `bruh` | freesound.org/s/506582 by ivar.nohre | Blunder reaction alternate |
| `dundundun` | freesound.org/s/411232 by Sean-TE0 | Dramatic bait tease (drama category) |
| `sadviolin` | freesound.org/s/516652 by szegvari | The doom announcement for a lost position |
| `cricket` | freesound.org/s/842645 by Breviceps | Crickets during a long think in a dead-quiet position |

All ten were located with the CC0 license filter
(`license:"Creative Commons 0"`) applied to the search.

## Cartoon & comedy effects

| Sounds | Source | License |
| --- | --- | --- |
| Slide whistle, Zip, Woops!, Klonk, Funny Fall, Ha-Ha!, Wild Uproar, Shloop!, Funny Cork Pop, Ooh That Smarts!, Banana Peel, Gulp!, Wild Roar | "Crash Bang Boom — The Best of Warner Bros. Sound FX" — https://archive.org/details/crash-bang-boom-the-best-of-warner-bros.-sound-fx | CC0 1.0 |
| Tromboing, Scrambling Feet, Fred's Hard Head Hit | "Hanna-Barbera Cartoon Sound FX" — https://archive.org/details/HannaBarberaCartoonSoundFX | CC BY 3.0 US |
| Wilhelm scream | https://archive.org/details/WilhelmScreamSample | Public domain |
| Rimshot | https://archive.org/details/rimshot | Public domain |

## Animal & misc recordings

| Sounds | Source | License |
| --- | --- | --- |
| Elephant trumpet, Bear Roaring | "Red Library — Animals Misc" — https://archive.org/details/Red_Library_Animals_Misc | CC0 1.0 |
| Wolf Whistles, Old Car Ahooga Horn, Slide Whistle | "Red Library — Bells Horns Whistles" — https://archive.org/details/Red_Library_Bells_Horns_Whistles | CC0 1.0 |
| Lion roar | freesound.org/s/567803 by iut_Paris8 (CC0); alternate take: freesound.org/s/469123 by Manim8 (CC0) | CC0 1.0 |
| Bald eagle | freesound.org/s/392212 by jjwallace (CC0) | CC0 1.0 |

Freesound takes were located with the CC0 license filter
(`license:"Creative Commons 0"`) applied to the search.

## Voice lines

All spoken lines ("Ohhh, magnificent!", "That is chess, not checkers!",
"Why did you do that?!", "What a trap!", "You had one job!",
"Oh no. Oh no no no.", "Still thinking? Take your time.", "You're losing it,
mate.", "Just agree you lost already.", "Big brain moment!", "Wow. That was
worth the wait!", "You thought about that for half a minute?!", "On a
rampage!", …) were generated for DRAFTI with a neural text-to-speech engine
(z-ai TTS, voice "jam") — original recordings made for this project, no
third-party material.

Batch-4 additions (trap drama callouts, the twelve national-style
introductions and catchphrases, difficulty-ladder celebrations, extra
heckles and verdict lines) were generated the same way, in two voices:
the judge "jam" and the persona announcer "kazi".

Batch-5 additions (heavy-hit callouts in both voices — "Oof! That was
heavy!" / "Boy, that was heavy!" — wrong-piece blame lines, feast and
trap-slaughter commentary, capture-count callouts, the AI-vs-AI arena
announcer and spectator jokes, and the auto-rematch level-up line) were
generated the same way.

Batch-6 additions (draughts table talk — "Give a man to get a man — that is
draughts, my friend." and nine more — bait taunts like "Whatever you do, do
not take that piece.", plan-ruined and lucky lines ("You're lucky this
time.", "My plan! Ruined!", "Boy, that was some move."), the doom-loop
taunts ("You are trapped. There is no escape."), narrow-escape callouts,
crowning hype ("The king has arrived!"), "First blood!" and two more
heavy-hit lines) were generated the same way, in both voices.

Batch-7 additions (the think deck: 24 narrator lines for long engine thinks
— "Meanwhile, on the board…", "Ten moves deep already." — and 20 heckles for
a slow human — "Coffee break?", "One move. One." — each in both voices, so a
thinking moment can go through more than a hundred clips before anything
repeats) were generated the same way, in both voices.

Batch-8 additions (the arena roster's ten self-introductions — "I am Simba.
The king of the board." — one per Tanzanian AI) were generated the same way.

## Interface & synthesized game sounds

33 sounds (drawer open/close whooshes, click, toggle blips, save chime, theme
sparkle, error buzz, slide, clock tick/tock, alarm, referee whistle,
notification pop, heartbeat, crown/win fanfares, defeat womp, draw chime,
gong, drumroll, sparkle, riser, downer, laser, coin, power-up, achievement,
capture-streak impacts) were synthesized for DRAFTI with numpy + FFmpeg from
oscillators, noise and envelopes — original works with no source material.

## Processing

All samples were trimmed, peak-normalized to −1.5 dBFS, faded and re-encoded
to 56 kbps mono MP3 (44.1 kHz) with FFmpeg. See `scripts/` history in the
project workspace for the processing pipeline.

## License note

DRAFTI's code is MIT. The embedded audio keeps its original licenses (CC0 /
public domain / CC BY as listed above); the CC BY items require attribution,
which this file provides. If you redistribute the game, keep this file.

## Original retirement and skill excerpts — obtained 2026-11-02

Source: https://youtube.com/shorts/KBVNiOAnHiA . The original Museveni speech was downloaded successfully from the exact requested Short on the owner’s Windows machine. Its English source captions are retained in docs/retirement-source-captions.vtt, with a source frame for visual verification. Original rights remain with the source creator; these are credited short sourced excerpts under the same meme-excerpt policy used above, not CC0 or TTS.

| File | Source interval | Processed duration | Game use |
|---|---|---|---|
| v_retire1.mp3 | 0.30–5.80 s | 5.84 s including retained padding | Natural full retirement sentence |
| v_retire2.mp3 | 0.00–15.00 s | Exactly 15.00 s decoded | Major retirement ceremonies, expressly approved by the owner; 32 kbps keeps the clip below 60 KiB |
| v_retire_short.mp3 | 11.70–14.70 s | 3.34 s including padding | Short retirement variation |
| skill_original.mp3 | 2.10–4.20 s | 2.44 s including padding | Rare engine-verified brilliant moves; 90-second cooldown |

All are mono 22050 Hz, retain natural speech timing, and have decoded peaks between −1.50 and −1.56 dBFS. The first two replaced only their explicitly requested TTS recreations; both old MP3s are backed up unchanged under sfx_swap/backups/. No unrelated clip was replaced.

The narrator recordings later_moments and later_hours were independently matched against the freshly downloaded original compilation (https://youtube.com/shorts/N1BOQ_9laWs): normalized waveform correlations 0.987310 and 0.992551. See docs/narrator-original-comparison.json. Their existing bytes are preserved.

## Procedural thinking rustle

`FX.breathe` in `src/ui.js` generates original filtered random grain with a smooth sine-squared envelope, introduced for sparse, quiet long-thought ambience. It uses no recording or external sample; covered by this repository’s MIT license. Existing credited `sparkle`, `v_ooh1` and `v_chess` recordings also accompany safe captures that break material equality, under their existing category controls and provenance. No source recordings were replaced for these changes.

## Original shrimp question — obtained 2026-11-02

Source: https://youtube.com/shorts/mvUVrweNvsQ . Original rights remain with the source creator; these short credited meme excerpts are not CC0 or recreated voices. `shrimp1.mp3` uses source 11.105–12.570 s (question alone, 1.465 s); `shrimp2.mp3` uses 11.105–13.150 s (the same question plus “Anyway”, 2.045 s). Only one original question occurs; the slots are different framings of that same take. Both play at natural speed. The downloaded transcription report, source hash, processing measurements and exact boundaries are in `docs/shrimp-source-verification.md` and `docs/shrimp-original-cuts.json`. Historical recreations are preserved under `sfx_swap/backups/`.

Playback controls: mute now fades the master output even during a long original passage, preserving the selected volume for unmute. Cancelling an arena ceremony also cancels its pending audio, overlay and next-game continuation. These control fixes change no credited recording.

Final-square capture selection reuses the existing full move animation and its per-hop capture sounds. No recordings are replaced or shortened by this input shortcut.

## Owner handoff sourced effects — added 2026-11-02

Five additional sources were supplied by the owner as verified local downloads
(handoff ZIP SHA-256 e8bfb069fbea08eedb54d4f700f40b428563c400dd4042850bc4a9f0d5be9925;
per-file hashes verified against SHA256SUMS.json and recorded in
docs/owner-audio-cuts.json). Uploader "no copyright" titles are treated as
UNVERIFIED: these are short credited excerpts, not CC0. Eighteen curated cuts
were installed additively through `scripts/install_owner_audio_cuts.py`
(SHA-pinned sources, measured boundaries, speech-guarded processing: mono
22050 Hz, ≤56 kbps, decoded peaks −1.51…−1.74 dBFS, ≤60 KiB, all ≤3.42 s,
natural timing preserved — no pitch or tempo changes, no fabricated takes).
Raw full recordings stay out of git (`scripts/research_media/` is ignored).
Deliberately excluded: six Pidgin phrases whose exact words two independent
transcription models could not agree on, the compilation's "Thanks for
watching!" outro, a 6.02-second combined sting that cannot be split honestly
within 3.5 s, a shimmer-noise wash (loop-risk), and mid-laugh trims. The
existing 362 recordings are byte-for-byte unchanged. Event wiring is NOT
claimed: the uses below are suggestions pending the shared sound director
integration (`scripts/owner_audio_map.json`).

| Clip | Source | Exact cut | Content (evidence) | Suggested use |
|---|---|---|---|---|
| `munch_mmm` | youtube.com/shorts/mvUVrweNvsQ | 0.205–0.525 s | Mouth hum "Mmm" (ASR + energy map) | Occasional capture/feast savoring |
| `laugh_baby_short` | youtube.com/shorts/kW2NDCIpnW0 | 0.415–1.925 s | First baby-giggle burst | Rare silly-human-move reaction (≤1/game, ≥5 min cooldown) |
| `laugh_baby_full` | youtube.com/shorts/kW2NDCIpnW0 | 2.905–6.325 s | Full baby laugh (same take, distinct phrase) | Same, alternate framing |
| `susp_hit_boom` | youtube.com/shorts/AKozkV3MeWE | 0.465–0.975 s | Low boom/hit (31 ms attack) | Trap spring |
| `susp_drone_deep` | youtube.com/shorts/AKozkV3MeWE | 2.075–4.745 s | Deep ominous drone (95% low band) | Long-think tension |
| `susp_sting_mid` | youtube.com/shorts/AKozkV3MeWE | 5.565–6.315 s | Mid metallic sting | Sharp alert |
| `susp_drone_creep` | youtube.com/shorts/AKozkV3MeWE | 7.595–8.805 s | Creeping low drone (slow attack) | Endgame danger |
| `susp_burst` | youtube.com/shorts/AKozkV3MeWE | 9.775–10.885 s | Sudden mid burst | Sudden material loss |
| `susp_build` | youtube.com/shorts/AKozkV3MeWE | 11.685–14.335 s | Rising tension build | Endgame build-up |
| `ah_scream` | youtube.com/shorts/fkRNoM2f9GM | 0.035–0.355 s | Comic "AHH!" scream (ASR) | Small comic shock |
| `comic_hit` | youtube.com/shorts/fkRNoM2f9GM | 1.115–1.675 s | Bright percussive comedy hit | Punchline accent |
| `mwah_kisses` | youtube.com/shorts/fkRNoM2f9GM | 6.385–9.800 s | Repeated comic mouth-kiss "mwah" sounds (ASR) | Over-affectionate gag |
| `sorry_dontcry` | youtu.be/g0cRfVqV04Q | 7.520–10.200 s | "Oh, sorry, sorry, sorry, don't cry." (word timestamps) | Consolation after a heavy loss |
| `dont_cry` | youtu.be/g0cRfVqV04Q | 21.000–21.780 s | "Don't cry." (word timestamps) | Short sympathy tag |
| `g0_bass_sting` | youtu.be/g0cRfVqV04Q | 26.500–29.900 s | Sustained ominous bass sting (excerpt of 26.145–32.105 s) | Wahala moment |
| `comic_hit_bright` | youtu.be/g0cRfVqV04Q | 32.945–33.655 s | Bright comedy hit (distinct recording from `comic_hit`, waveform corr 0.06) | Punchline accent, alternate color |
| `pregnant_shock` | youtu.be/g0cRfVqV04Q | 48.425–49.585 s | Comic "PREGNANT?!" exclamation (stable across two ASR models) | Huge comic surprise |
| `g0_deep_wah` | youtu.be/g0cRfVqV04Q | 53.615–56.145 s | Deep comedic sting (distinct from `g0_bass_sting`, corr −0.006) | Deep wahala sting |

Exact bytes, durations, peaks and SHA-256 per clip: `docs/owner-audio-cuts.json`.

# DRAFTI original physical and event effects

124 additive, nonverbal procedural performances. Four variants per family use different articulation, modal decay, excitation or musical phrases. They do not imitate speech or claim sampled-instrument provenance. Existing recordings are retained.

Source: [reproducible synthesizer](https://github.com/risktaker-tz/DRAFTI/blob/codex/blueprint-release/scripts/make_physical_sfx.py). License: repository MIT LICENSE. Processing: mono 22050 Hz MP3 at 56 kbps; measured decoded peaks do not exceed -1.5 dBFS. Peak-matching reports and hashes: docs/physical-audio-generation.json.

| Event | Files | Category |
| --- | --- | --- |
| bell | fx_bell_1, fx_bell_2, fx_bell_3, fx_bell_4 | drama |
| boing | fx_boing_1, fx_boing_2, fx_boing_3, fx_boing_4 | comedy |
| coin | fx_coin_1, fx_coin_2, fx_coin_3, fx_coin_4 | party |
| countdown | fx_countdown_1, fx_countdown_2, fx_countdown_3, fx_countdown_4 | ui |
| crown | fx_crown_1, fx_crown_2, fx_crown_3, fx_crown_4 | majestic |
| defeat | fx_defeat_1, fx_defeat_2, fx_defeat_3, fx_defeat_4 | drama |
| draw | fx_draw_1, fx_draw_2, fx_draw_3, fx_draw_4 | ui |
| drawer | fx_drawer_1, fx_drawer_2, fx_drawer_3, fx_drawer_4 | ui |
| feast | fx_feast_1, fx_feast_2, fx_feast_3, fx_feast_4 | majestic |
| gong | fx_gong_1, fx_gong_2, fx_gong_3, fx_gong_4 | drama |
| impact | fx_impact_1, fx_impact_2, fx_impact_3, fx_impact_4 | majestic |
| jump | fx_jump_1, fx_jump_2, fx_jump_3, fx_jump_4 | ui |
| king_glint | fx_king_glint_1, fx_king_glint_2, fx_king_glint_3, fx_king_glint_4 | ui |
| landing | fx_landing_1, fx_landing_2, fx_landing_3, fx_landing_4 | ui |
| oneup | fx_oneup_1, fx_oneup_2, fx_oneup_3, fx_oneup_4 | party |
| popper | fx_popper_1, fx_popper_2, fx_popper_3, fx_popper_4 | party |
| retention | fx_retention_1, fx_retention_2, fx_retention_3, fx_retention_4 | party |
| reunion | fx_reunion_1, fx_reunion_2, fx_reunion_3, fx_reunion_4 | drama |
| rimshot | fx_rimshot_1, fx_rimshot_2, fx_rimshot_3, fx_rimshot_4 | comedy |
| roll | fx_roll_1, fx_roll_2, fx_roll_3, fx_roll_4 | drama |
| slide | fx_slide_1, fx_slide_2, fx_slide_3, fx_slide_4 | ui |
| stage_final | fx_stage_final_1, fx_stage_final_2, fx_stage_final_3, fx_stage_final_4 | majestic |
| stage_group | fx_stage_group_1, fx_stage_group_2, fx_stage_group_3, fx_stage_group_4 | drama |
| stage_quarter | fx_stage_quarter_1, fx_stage_quarter_2, fx_stage_quarter_3, fx_stage_quarter_4 | drama |
| stage_semi | fx_stage_semi_1, fx_stage_semi_2, fx_stage_semi_3, fx_stage_semi_4 | drama |
| theme | fx_theme_1, fx_theme_2, fx_theme_3, fx_theme_4 | ui |
| toggle | fx_toggle_1, fx_toggle_2, fx_toggle_3, fx_toggle_4 | ui |
| trophy | fx_trophy_1, fx_trophy_2, fx_trophy_3, fx_trophy_4 | party |
| victory | fx_victory_1, fx_victory_2, fx_victory_3, fx_victory_4 | party |
| whistle | fx_whistle_1, fx_whistle_2, fx_whistle_3, fx_whistle_4 | comedy |
| zip | fx_zip_1, fx_zip_2, fx_zip_3, fx_zip_4 | comedy |

## Live streamer voices — in-house TTS, added 2026-11-02

The three live-streamer modes (Female / Male / Funny, all OFF by default and
mutually exclusive in the Sound design menu) add forty original commentary
lines generated in-house with the project's TTS tooling: the Female mode uses
the tongtong voice, the Male mode the jam voice, and the Funny mode generates
nothing at all — it reuses the app's own judge voice plus already-credited
funny reactions already listed above. Every line is original DRAFTI content
drafted from the researched phrasebook in `docs/streamer-phrasebook.md`
(1110 researched phrases with sources), spoken by in-house TTS, processed
through the standard speech-guarded pipeline (mono 22050 Hz, ≤56 kbps,
decoded peaks ≤ −1.5 dBFS, ≤60 KiB), and catalogued per clip with source,
license, use, mood, family, role and event metadata in
`scripts/audio_catalog.json`. No third-party recording, no cloned voice and
no existing clip was replaced; the modes play only in place of a covered
event's spoken reaction, never on top of one, and every cooldown, quota and
category control of the existing sound design still applies. Existing
clips are byte-for-byte unchanged.

## Existing voice processing corrections — 2026-11-03

The subsequent cinematic playback/streamer update adds CSS animation and event scheduling only. It reuses the existing credited Female/Male/Funny recordings and animal effects at natural speech rate. No recording was replaced or downloaded for that update; all source, performer and licensing entries continue to apply.

Nine existing in-house TTS recordings (`s_in_american`, `s_in_classic`, `t4b`, `th_h02`, `th_h18`, `v_slau2`, `v_spec3`, `v_tt2`, `v_tt6`) exceeded the standard duration. Their voices, words, sources and licenses are unchanged. Only centres of internal pauses below -60 dBFS were removed, retaining140ms on either side, followed by the standard mono22050Hz/56kbps peak-normalized MP3 encode. No speech speed-up or replacement recording was used. Full original MP3 backups remain in `sfx_swap/backups/`; hashes, source/processed lengths, every cut, decoded waveform checks and honestly qualified ASR comparisons are in `scripts/audio_processing_fixes.json`.
