# Shrimp original (mvUVrweNvsQ) — transcription & cut evidence

Source: `upload/shrimp-original.wav` (as received: PCM s16le, 16 kHz, mono,
13.839 s, 442,930 bytes — matches the stated 13.84 s mono16k source from
youtube.com/shorts/mvUVrweNvsQ). Branch tip verified before work:
`191bbbef1ad53099a9ed28aab95863fb9f39e7d3`. Nothing in the game repository was
touched; no existing audio was modified or replaced.

## Method

1. **z-ai ASR**: unavailable this session — every call (whole file, then the
   question slice) returned HTTP 429 "Too many requests" across ~8 attempts
   with 35 s backoff.
2. **Fallback (this sandbox is Linux)**: local `faster-whisper small` (int8,
   CPU, `word_timestamps=True`, beam 5). A whole-file pass produced text whose
   word timings contradicted the measured energy envelope (words placed inside
   measured silence — alignment drift), so its output was rejected.
3. **Authoritative pass**: the file was sliced at the −30 dB energy utterance
   boundaries (±60 ms pad) and each slice transcribed **independently**
   (`condition_on_previous_text=False`, no VAD drift). Resulting word times
   agree with the −40 dB energy map within ~20 ms everywhere (e.g. whisper
   places "Is" at 11.22; the energy map starts that speech run at 11.225).

## Verbatim speech with word timestamps (absolute, seconds)

| words | time range |
| --- | --- |
| Mmm. | 0.14 – 0.42 |
| Because they're all… | 1.65 – 2.58 |
| Oh, there's something. | 3.04 – 3.63 |
| Mmm. | 4.18 – 4.54 |
| So my cousin is going to the 7-Eleven. | 5.53 – 7.25 |
| Oh, that's good. | 8.69 – 9.38 |
| They got that spice smell in it. | 9.51 – 10.98 |
| **Is** | **11.22 – 11.38** |
| **this** | **11.38 – 11.54** |
| **the** | **11.54 – 11.71** |
| **shrimp** | **11.71 – 11.90** |
| **one?** | **11.90 – 12.14** |
| Anyway. | 12.63 – 12.89 |

(The 13.46–13.81 s tail contains no speech, only low-level noise/blips.)

## Silence boundaries around the question (−40 dB map, gaps ≥ 90 ms merged)

- before the phrase ("…smell in it." → "Is"): gap **11.105 – 11.225** (0.12 s)
- after the phrase ("one?" → "Anyway."): gap **12.305 – 12.685** (0.38 s)
- after "Anyway.": quiet from **13.105** to end, minus two tiny blips

## The line occurs exactly ONCE

There is **no repeated second utterance** of "Is this the shrimp one??" in
this take — one occurrence only (11.22–12.14 s), immediately followed by the
speaker's own "Anyway." Per the task brief, no fake second take was made; the
cuts below are honest framings of the **same single original utterance**,
differing only in in/out points (raw sample copies — no EQ, normalization,
pitch or tempo changes):

| file | source span | dur | content |
| --- | --- | --- | --- |
| shrimp-q1-pure-question.wav | 11.140 – 12.280 | 1.140 s | "Is this the shrimp one?" |
| shrimp-q2-question-anyway.wav | 11.140 – 13.150 | 2.010 s | question + "Anyway." (asked-and-moved-on) |
| shrimp-q3-full-context.wav | 8.680 – 12.280 | 3.600 s | "Oh, that's good. They got that spice smell in it." + question |
| shrimp-q4-anyway-tag.wav | 12.600 – 13.150 | 0.550 s | "Anyway." alone, as a separate reaction tag |

Every cut was verified to be a **sample-for-sample exact copy** of the source
region (`exact_copy=True` for all four), starts/ends inside measured silence,
and keeps the original 16 kHz mono s16 format. q1/q2 are the two recommended
swaps if two slots are needed: they share the identical phrase audio but frame
it differently (naked question vs. question+dismissal), which reads as variety
without inventing a second take.

## Caveats

- Transcription engine: faster-whisper `small` (z-ai ASR quota-blocked). Word
  boundaries are model-estimated but energy-cross-validated (±20 ms); treat
  word times as ±30 ms, utterance boundaries as exact to the energy map.
- The whole-file whisper pass also produced one drifted variant reading
  ("was this the shrimp one anyway"); the per-slice pass resolves the actual
  wording as "Is this the shrimp one?" + "Anyway."

## Supporting artifacts (in this folder)

- `whisper_words.json` — per-slice transcription with absolute word times
- `energy_map.json` — −30/−35/−40 dB silence maps and segmentations
