# Sound & voice attributions

Every sound in DRAFTI is open-licensed, synthesized in-house, or a short
sourced meme effect credited below. Samples are embedded in `web/index.html`
(base64 MP3); the processed source files live in `src/audio/`. This file
lists the origin and license of each.

The bank holds **330+ sounds**: 22 recorded samples, 10 sourced meme effects
(below), 19 sourced animal-comedy & viral-sting samples, 183 neural-TTS
voice lines and 33 original synthesized interface/game sounds (plus four
more synthesized effects — trap snap, refusal buzz, relief chime and the
level-up fanfare — generated in-code at playback time).

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
