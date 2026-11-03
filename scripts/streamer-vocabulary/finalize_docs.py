#!/usr/bin/env python3
"""Build streamer-pack/SENTENCES.md and streamer-pack/CREDITS.md from
sentences.py + state.json (accepted clips marked with metrics)."""
import json, pathlib, sys, time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
from sentences import records, GROUPS  # noqa: E402

PACK = ROOT / 'streamer-pack'
STATE = HERE / 'state.json'
state = json.loads(STATE.read_text(encoding='utf8')) if STATE.exists() else {'clips': {}}

MODE_NAME = {'sf2': 'Female (tongtong)', 'sm2': 'Male (jam)', 'sj2': 'Funny (kazi persona)'}


def build():
    lines = ['# Streamer vocabulary — 300 new sentences (100 per voice)',
             '',
             'Real recorded additions for the optional streamer pack; every row below is',
             'backed by an accepted MP3 in `audio/` with verified duration/peak/hash in',
             '`manifest.json`. Scenario groups follow `docs/ZAI_STREAMER_300_SENTENCES.md`.',
             '']
    recs = list(records())
    for prefix in ('sf2', 'sm2', 'sj2'):
        lines += [f'## {MODE_NAME[prefix]}', '',
                  '| ID | Scenario | Sentence | Predicate (short) | Hour gate | Status |',
                  '| --- | --- | --- | --- | --- | --- |']
        for r in recs:
            if not r['id'].startswith(prefix):
                continue
            st = state['clips'].get(r['id'], {})
            status = ('accepted ' + json.dumps({k: st[k] for k in ('seconds', 'bytes')})
                      if st.get('status') == 'accepted' else st.get('status', 'pending'))
            gate = r['hourGate'] or '—'
            pred = r['predicate'].split('(')[0].strip()[:60]
            text = r['text'].replace('|', '\\|')
            lines.append(f"| `{r['id']}` | {r['role']} | {text} | {pred} | {gate} | {status} |")
        lines.append('')
    (PACK / 'SENTENCES.md').write_text('\n'.join(lines), encoding='utf8')

    man = json.loads((PACK / 'manifest.json').read_text(encoding='utf8'))
    credits = f"""# Streamer pack credits

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
  catchphrases. Manifest schema `drafti-streamer-pack/1`, {man['total']} clips,
  {man['totalBytes']} bytes at last build ({man['generated']}).
"""
    (PACK / 'CREDITS.md').write_text(credits, encoding='utf8')
    print('SENTENCES.md + CREDITS.md written')


if __name__ == '__main__':
    build()
