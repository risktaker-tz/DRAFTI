#!/usr/bin/env python3
"""Verify a freshly obtained original clip against the DRAFTI bank clip.

Works on any machine with Python 3 + ffmpeg (no z-ai CLI needed). READ-ONLY.

Usage:
  python codex_verify_cut.py <source_audio> <start_s> <end_s> <bank_clip.mp3>

Steps:
  1. decode both to mono 22050 Hz float PCM (ffmpeg)
  2. loudness-normalize each (remove gain differences)
  3. trim both to their overlap length
  4. print Pearson correlation of the samples + durations

Interpretation:
  corr > 0.90  -> same recording, the bank clip is derived from this source
  corr 0.5-0.9 -> related audio (same recording, different processing/edges)
  corr < 0.5   -> different audio (e.g. the bank clip is a recreation)
"""
import subprocess
import sys

import numpy as np

SR = 22050
EPS = 1e-9


def pcm(path: str, start: float = 0.0, dur: float = 0.0) -> np.ndarray:
    cmd = ['ffmpeg', '-v', 'error', '-i', path]
    if start > 0:
        cmd += ['-ss', f'{start:.3f}']
    if dur > 0:
        cmd += ['-t', f'{dur:.3f}']
    cmd += ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    r = subprocess.run(cmd, capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


def norm(x: np.ndarray) -> np.ndarray:
    return (x - x.mean()) / (np.std(x) + EPS)


def main() -> None:
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(2)
    src, start, end, bank = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
    a = pcm(src, start, end - start)
    b = pcm(bank)
    n = min(len(a), len(b))
    if n < SR // 4:
        print(f'FAIL: overlap too short ({n} samples)')
        sys.exit(1)
    a, b = norm(a[:n]), norm(b[:n])
    corr = float(np.dot(a, b) / n)
    print(f'source cut: {end - start:.3f}s ({len(a)} samples), bank: {len(pcm(bank)) / SR:.3f}s')
    print(f'normalized cross-correlation over overlap: {corr:.4f}')
    verdict = ('SAME RECORDING' if corr > 0.90 else
               'RELATED (check edges/processing)' if corr > 0.5 else 'DIFFERENT AUDIO')
    print('verdict:', verdict)


if __name__ == '__main__':
    main()
