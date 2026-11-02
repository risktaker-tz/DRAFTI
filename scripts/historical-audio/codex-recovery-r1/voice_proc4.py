#!/usr/bin/env python3
"""DRAFTI audio pipeline v4 — process batch-4 voice lines into src/audio.

Speech-safe processing identical to v3: trim silence (never speech), 120 ms
head, 220 ms tail, normalize to -1.5 dBFS, mp3 @ 56 kbps. Sources:
/home/z/my-project/scripts/tts_raw4/*.wav
"""
import pathlib
import subprocess
import sys

import numpy as np

RAW = pathlib.Path('/home/z/my-project/scripts/tts_raw4')
OUT = pathlib.Path('/home/z/my-project/download/DRAFTI/src/audio')
SR = 22050
EPS = 1e-9


def pcm(path: pathlib.Path) -> np.ndarray:
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR),
         '-f', 'f32le', '-'],
        capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def normalize(x: float, head_db: float) -> np.ndarray:
    peak = np.max(np.abs(x)) + EPS
    return x * (10 ** (head_db / 20)) / peak


def write_mp3(name: str, x: np.ndarray, kbps: int = 56) -> int:
    x = np.clip(x, -1, 1)
    raw = (x * 32767).astype('<i2').tobytes()
    outp = OUT / f'{name}.mp3'
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1',
         '-i', '-', '-af', 'aresample=44100',
         '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', str(outp)],
        input=raw, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode()[-300:])
    return outp.stat().st_size


def speech_process(name: str) -> dict:
    x = pcm(RAW / f'{name}.wav')
    win = int(SR * 0.02)
    n = len(x) // win
    rms = np.sqrt(np.mean(x[:n * win].reshape(n, win) ** 2, axis=1) + EPS)
    idx = np.where(rms >= 0.008)[0]
    if len(idx) == 0:
        return {'name': name, 'error': 'all silence'}
    a, b = int(idx[0]), int(idx[-1]) + 1
    spoken = (b - a) * 0.02
    head = max(0, a - 6)
    tail = min(n, b + 11)
    seg = normalize(x[head * win:tail * win], -1.5)
    size = write_mp3(name, seg)
    out_s = len(seg) / SR
    kept = 100 * min(1.0, out_s / (spoken + 0.34))
    flag = '' if kept >= 97 else '  <-- AUDIT: speech clipped?'
    return {'name': name, 'spoken_s': round(spoken, 2), 'out_s': round(out_s, 2),
            'kept_pct': round(kept, 1), 'bytes': size, 'flag': flag}


def main() -> None:
    wavs = sorted(RAW.glob('*.wav'))
    rows = []
    for w in wavs:
        if w.stem.startswith('_'):
            continue  # voice test scratch files
        rows.append(speech_process(w.stem))
    bad = [r for r in rows if r.get('error') or r.get('flag')]
    for r in rows:
        print(f"  {r['name']:<16} spoken {r.get('spoken_s','-')}s  out {r.get('out_s','-')}s  "
              f"kept {r.get('kept_pct','-')}%  {r.get('bytes', 0) // 1024}KB{r.get('flag','')}")
    if bad:
        print(f'WARNING: {len(bad)} line(s) need attention')
    print(f"processed {len(rows)} voice lines -> {OUT}")


if __name__ == '__main__':
    sys.exit(main())
