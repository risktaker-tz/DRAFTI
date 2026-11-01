# Sound & voice attributions

Every sound in DRAFTI is open-licensed or synthesized in-house. Samples are
embedded in `web/index.html` (base64 MP3); the processed source files live in
`src/audio/`. This file lists the origin and license of each.

The bank holds **113 sounds**: 22 recorded samples (below), 58 neural-TTS
voice lines and 33 original synthesized interface/game sounds.

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
