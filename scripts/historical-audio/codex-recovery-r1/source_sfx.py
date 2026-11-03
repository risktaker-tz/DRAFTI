#!/usr/bin/env python3
"""DRAFTI sourced SFX — cut the authentic meme effects and process them like
the voice bank (mono 22050, trim, normalize -1.5 dBFS, mp3 56k).

Sources (verbatim identifications, no guesswork):
  badboy    "You Are A Bad Boy - Naija Comedy Sound Effect" - Topinfo_ng
            (youtube.com/watch?v=PGLg01Lcw10; mp3 mirror: realmoneystudios.com)
            Three clean repetitions: 0-2.25 / 3.28-4.94 / 5.57-7.18.
  tellyou   "Let Me Tell You Something - Meme Sound Effect" - YTSFX
            (youtube.com/watch?v=NkOeRRj-04k). Speech 1.23-5.91; first double
            phrase 1.23-3.11 is the punchy one.
  short     "popular meme sound effects" - Mondal Screen
            (youtube.com/shorts/N1BOQ_9laWs). On-screen cards name each
            segment: 01 OOF, 02 AHH SCARY, 03 ANIME WOW, 04 A FEW MOMENTS
            LATER, 06 OH MY GOD, 08 2 HOURS LATER, 10 GOD.
"""
import pathlib
import subprocess

import numpy as np

YT = pathlib.Path('/tmp/yt')
OUT = pathlib.Path('/home/z/my-project/download/DRAFTI/src/audio')
SR = 22050
EPS = 1e-9

# name -> (source file, start, end)
CUTS = {
    'oof':           ('N1BOQ_9laWs.mp3', 0.40, 0.79),
    'ahhscary':      ('N1BOQ_9laWs.mp3', 1.36, 3.12),
    'animewow':      ('N1BOQ_9laWs.mp3', 3.50, 6.82),
    'later_moments': ('N1BOQ_9laWs.mp3', 7.62, 10.39),
    'omg':           ('N1BOQ_9laWs.mp3', 10.59, 12.92),
    'later_hours':   ('N1BOQ_9laWs.mp3', 13.42, 15.14),
    'god':           ('N1BOQ_9laWs.mp3', 15.51, 18.08),
    'badboy':        ('badboy.mp3', 5.57, 7.17),   # repetition 3: clean gaps both sides
    'badboy2':       ('badboy.mp3', 0.00, 2.24),   # repetition 1 (variant)
    'tellyou':       ('NkOeRRj-04k.mp3', 1.20, 3.13),
}


def pcm(path: pathlib.Path) -> np.ndarray:
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR),
         '-f', 'f32le', '-'],
        capture_output=True, check=True)
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
    for name, (src, a, b) in CUTS.items():
        if src not in cache:
            cache[src] = pcm(YT / src)
        x = cache[src][int(a * SR):int(b * SR)]
        # trim leading/trailing near-silence but keep a little breath
        win = int(SR * 0.02)
        n = len(x) // win
        if n < 2:
            raise SystemExit(f'{name}: cut too short')
        rms = np.sqrt(np.mean(x[:n * win].reshape(n, win) ** 2, axis=1) + EPS)
        idx = np.where(rms >= 0.006)[0]
        if len(idx) == 0:
            raise SystemExit(f'{name}: all silence')
        head = max(0, int(idx[0]) - 4)
        tail = min(n, int(idx[-1]) + 7)
        seg = x[head * win:tail * win]
        peak = np.max(np.abs(seg)) + EPS
        seg = seg * (10 ** (-1.5 / 20)) / peak
        size = write_mp3(name, seg)
        print(f'  {name:<14} {len(seg)/SR:5.2f}s  peak {20*np.log10(peak):6.1f} dBFS  {size//1024}KB')


if __name__ == '__main__':
    main()
