#!/usr/bin/env python3
"""DRAFTI batch-6 sourced SFX — cut & process the animal/meme takes.

Freesound CC0 sources (picked from the sfx6_audit.py report):
  chicken   MBPL "sound2" (multiple brood clucks, 4.1s)
  panic     Mastersoundboy2005 "sound0" (alarmed squawk 1.57s)
  duck      OwennewO "sound0" (quick double quack 1.25s)
  meow      tuberatanka "sound0" (single cute meow 1.54s)
  purr      Buskieboy "sound1" (rhythmic purr 5.6s)
  vineboom  modusmogulus (the Vine boom, 3.6s)
  bruh      ivar.nohre "sound0" (Bruh #2, 1.3s)
  dundundun Sean-TE0 "sound0" (dun dun duuun, 1.6s)
  sadviolin szegvari "sound0" (sad violin theme 11.1s)
  cricket   Breviceps "sound1" (chirp loop 7.2s)
Pipeline: mono 22050 -> trim -> normalize -1.5 dBFS -> optional fades -> mp3 56k.
"""
import pathlib
import subprocess

import numpy as np

RAW = pathlib.Path('/home/z/my-project/scripts/fs_raw')
OUT = pathlib.Path('/home/z/my-project/download/DRAFTI/src/audio')
SR = 22050
EPS = 1e-9

# name -> (source, start, end, fade_out_s)
CUTS = {
    'chicken':   ('chicken_cluck_2_MBPL.mp3', 0.00, 2.90, 0.0),
    'panic':     ('chicken_squawk_1_Mastersoundboy.mp3', 0.00, 1.60, 0.0),
    'duck':      ('duck_quack_1_OwennewO.mp3', 0.00, 1.28, 0.0),
    'meow':      ('cat_meow_1_tuberatanka.mp3', 0.00, 1.56, 0.0),
    'purr':      ('cat_purr_2_Buskieboy.mp3', 0.30, 3.10, 0.25),
    'vineboom':  ('vine_boom_1_modusmogulus.mp3', 0.00, 2.55, 0.20),
    'bruh':      ('bruh_1_ivar.nohre.mp3', 0.00, 1.34, 0.0),
    'dundundun': ('dun_dun_duuun_1_Sean-TE0.mp3', 0.00, 1.58, 0.0),
    'sadviolin': ('sad_violin_1_szegvari.mp3', 0.00, 3.60, 0.45),
    'cricket':   ('cricket_chirp_2_Breviceps.mp3', 0.20, 3.00, 0.30),
}


def pcm(path: pathlib.Path) -> np.ndarray:
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR),
         '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def write_mp3(name: str, x: np.ndarray, kbps: int = 56) -> int:
    x = np.clip(x, -1, 1)
    raw = (x * 32767).astype('<i2').tobytes()
    outp = OUT / f'{name}.mp3'
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1',
         '-i', '-', '-af', 'aresample=44100',
         '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', str(outp)],
        input=raw, capture_output=True, check=True)
    return outp.stat().st_size


def main() -> None:
    cache = {}
    for name, (src, a, b, fade) in CUTS.items():
        if src not in cache:
            cache[src] = pcm(RAW / src)
        x = cache[src][int(a * SR):int(b * SR)]
        win = int(SR * 0.02)
        n = len(x) // win
        rms = np.sqrt(np.mean(x[:n * win].reshape(n, win) ** 2, axis=1) + EPS)
        idx = np.where(rms >= 0.006)[0]
        if len(idx) == 0:
            raise SystemExit(f'{name}: all silence')
        head = max(0, int(idx[0]) - 4)
        tail = min(n, int(idx[-1]) + 7)
        seg = x[head * win:tail * win].copy()
        if fade > 0:
            nf = int(fade * SR)
            seg[-nf:] *= np.linspace(1, 0, nf)
        peak = np.max(np.abs(seg)) + EPS
        seg = seg * (10 ** (-1.5 / 20)) / peak
        size = write_mp3(name, seg)
        print(f'  {name:<10} {len(seg)/SR:5.2f}s  peak {20*np.log10(peak):6.1f} dBFS  {size//1024}KB')


if __name__ == '__main__':
    main()
