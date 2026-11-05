# Streamer pack credits

All 300 recordings are **original in-house generation** — no third-party audio,
no cloned performers, no runtime SpeechSynthesis.

- **Female streamer**: z-ai neural voice profile **tongtong** — the same profile as
  the existing `sf_*` bank lines (see `docs/streamer-phrasebook.md`).
- **Male streamer**: z-ai neural voice profile **jam** — the same profile as the
  existing `sm_*` bank lines and the trap-drama announcer.
- **Funny streamer**: z-ai neural voice profile **kazi** — the app's existing
  announcer persona heard in `v_nextup` and related cues (runtime evidence:
  `docs/cinematic-season-browser.json` logs `v_nextup` with `"voice":"kazi"`;
  historical generation: `scripts/historical-audio/codex-recovery-r1/tts_gen4.sh`).
  No fourth performer was invented; existing credited jokes/memes stay intact.

- Generation tool: `z-ai tts` CLI (neural TTS), one take per sentence, raw takes
  kept in ignored storage (`scripts/research_media/streamer_raw/`).
- Processing: established pipeline `scripts/voice_proc.py` (silence-trim, 120 ms
  head / 220 ms tail pad, peak normalization to −1.5 dBFS, mono 22050 Hz,
  MP3 56 kbps) plus 10 ms fades applied by `scripts/streamer-vocabulary/generate.py`.
- Authoring: sentence text written for this pack by zacharia
  (zachariafx@gmail.com); humor comes from wording only, no copyrighted
  catchphrases. Manifest schema `drafti-streamer-pack/1`, 276 clips,
  7687409 bytes at last build (2026-11-05T08:42:54Z).
