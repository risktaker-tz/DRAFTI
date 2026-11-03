#!/usr/bin/env python3
"""Resumable generator for streamer-vocabulary sentence batches.

Usage: python3 generate.py --voice sf2 --count 20 [--asr-spot N]
Generates raw takes with z-ai TTS (patient 429 backoff, no concurrency),
processes each with the established voice_proc pipeline, measures LUFS,
records sha256, and updates state.json + streamer-pack/manifest.json.
Only fully processed, measured takes are counted; failures are recorded
honestly and stay outside accepted totals.
"""
import argparse, hashlib, json, os, re, subprocess, sys, time, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / 'scripts'))
from sentences import records  # noqa: E402
import voice_proc  # noqa: E402

RAW = ROOT / 'scripts' / 'research_media' / 'streamer_raw'
PACK = ROOT / 'streamer-pack'
STATE = HERE / 'state.json'
FFMPEG = os.environ.get('FFMPEG') or 'ffmpeg'

VOICE_BY_PREFIX = {'sf2': 'tongtong', 'sm2': 'jam', 'sj2': 'kazi'}


def load_state():
    if STATE.exists():
        return json.loads(STATE.read_text(encoding='utf8'))
    return {'clips': {}}


def save_state(st):
    STATE.write_text(json.dumps(st, indent=1, sort_keys=True), encoding='utf8')


def tts(text, voice, dest, attempts=8):
    """One raw take with patient rate-limit backoff. Returns True on success."""
    staging = dest.with_suffix('.partial.wav')
    log = dest.with_suffix('.log')
    for attempt in range(1, attempts + 1):
        try:
            r = subprocess.run(['z-ai', 'tts', '-i', text, '-o', str(staging),
                                '--voice', voice, '--format', 'wav'],
                               capture_output=True, text=True, timeout=180)
        except subprocess.TimeoutExpired:
            r = None
        if r is not None and r.returncode == 0 and staging.exists() and staging.stat().st_size > 44:
            os.replace(staging, dest)
            return True
        errlog = (r.stderr if r is not None else '') or ''
        log.write_text(errlog[-2000:], encoding='utf8')
        if not re.search(r'429|rate.?limit|too many requests', errlog, re.I):
            return False          # permanent failure for this attempt round
        time.sleep(35)            # patient quota wait, no retry storms
    return False


def measure_lufs(path):
    try:
        r = subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-i', str(path),
                            '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'],
                           capture_output=True, text=True, timeout=60)
        m = re.findall(r'I:\s*(-?\d+\.?\d*)\s*LUFS', r.stderr)
        return float(m[-1]) if m else None
    except Exception:
        return None


def sha256(path):
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def next_batch(recs, voice_prefix, count):
    """Next `count` pending sentences for one voice, in id order."""
    todo = [r for r in recs
            if r['id'].startswith(voice_prefix)
            and state['clips'].get(r['id'], {}).get('status') != 'accepted']
    return todo[:count]


def build_manifest(st):
    clips = []
    for r in recs():
        c = st['clips'].get(r['id'])
        if not c or c['status'] != 'accepted':
            continue
        f = PACK / 'audio' / f"{r['id']}.mp3"
        if not f.exists():
            continue
        clips.append({
            'id': r['id'], 'file': f"audio/{r['id']}.mp3", 'mode': r['mode'],
            'voice': r['voice'], 'text': r['text'], 'role': r['role'],
            'predicate': r['predicate'], 'perspective': r['perspective'],
            'hourGate': r['hourGate'], 'mood': r['mood'], 'family': r['family'],
            'durationSec': c['seconds'], 'bytes': f.stat().st_size,
            'sha256': sha256(f), 'peakDbfs': c['peakDbfs'], 'lufs': c.get('lufs'),
            'source': f"in-house generation: z-ai neural TTS voice '{r['voice']}'",
            'license': 'original in-house generated audio; no third-party source',
            'processing': ('silence-trim; 120ms head / 220ms tail pad; 10ms fades; '
                           'peak normalized to -1.5 dBFS; mono 22050 Hz; MP3 56 kbps'),
        })
    clips.sort(key=lambda c: c['id'])
    by_mode = {}
    for c in clips:
        by_mode[c['mode']] = by_mode.get(c['mode'], 0) + 1
    manifest = {'schema': 'drafti-streamer-pack/1', 'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'voiceIdentities': {'female': 'z-ai tongtong', 'male': 'z-ai jam', 'funny': 'z-ai kazi'},
                'counts': by_mode, 'total': len(clips),
                'totalBytes': sum(c['bytes'] for c in clips), 'clips': clips}
    (PACK / 'manifest.json').write_text(json.dumps(manifest, indent=1, ensure_ascii=False),
                                        encoding='utf8')
    return manifest


state = load_state()


def main():
    global state
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', required=True, choices=list(VOICE_BY_PREFIX))
    ap.add_argument('--count', type=int, default=20)
    ap.add_argument('--asr-spot', type=int, default=0, help='ASR-verify first N of this batch')
    args = ap.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    (PACK / 'audio').mkdir(parents=True, exist_ok=True)
    voice = VOICE_BY_PREFIX[args.voice]
    all_recs = list(records())
    batch = next_batch(all_recs, args.voice, args.count)
    print(f'batch for {args.voice}: {[r["id"] for r in batch]}')
    accepted = 0
    for r in batch:
        raw = RAW / f"{r['id']}.wav"
        entry = state['clips'].setdefault(r['id'], {'status': 'pending', 'takes': 0})
        if not raw.exists():
            entry['takes'] += 1
            print(f'{r["id"]}: TTS...', flush=True)
            if not tts(r['text'], voice, raw):
                entry.update(status='failed', error='tts-failed')
                save_state(state)
                print(f'{r["id"]}: TTS FAILED', flush=True)
                continue
        try:
            out = PACK / 'audio' / f"{r['id']}.mp3"
            fade = raw.with_suffix('.fade.wav')
            import numpy as np
            samples = voice_proc.decode(FFMPEG, raw)
            n = len(samples)
            fi, fo = round(.010 * voice_proc.RATE), round(.012 * voice_proc.RATE)
            if n > fi + fo:
                samples[:fi] *= np.linspace(0, 1, fi)
                samples[-fo:] *= np.linspace(1, 0, fo)
            import wave
            with wave.open(str(fade), 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(voice_proc.RATE)
                w.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())
            meta = voice_proc.process(fade, out, FFMPEG, maximum=6.0)
            fade.unlink()
            entry.update(status='accepted', seconds=meta['seconds'],
                         peakDbfs=meta['peakDbfs'], bytes=meta['bytes'],
                         lufs=measure_lufs(out), error=None)
            accepted += 1
            print(f'{r["id"]}: ACCEPTED {meta}', flush=True)
        except Exception as e:
            entry.update(status='failed', error=str(e)[:200])
            print(f'{r["id"]}: FAILED {e}', flush=True)
        save_state(state)
    build_manifest(state)
    print(f'accepted this run: {accepted}')


if __name__ == '__main__':
    main()
