# Sound & voice attributions

Every sound in DRAFTI is open-licensed, synthesized in-house, or a short
sourced meme effect credited below. Samples are embedded in `web/index.html`
(base64 MP3); the processed source files live in `src/audio/`. This file
lists the origin and license of each.

The bank holds **218 sounds**: 22 recorded samples, 10 sourced meme effects
(below), 153 neural-TTS voice lines and 33 original synthesized
interface/game sounds (plus four more synthesized effects — trap snap,
refusal buzz, relief chime and the level-up fanfare — generated in-code at
playback time).

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
