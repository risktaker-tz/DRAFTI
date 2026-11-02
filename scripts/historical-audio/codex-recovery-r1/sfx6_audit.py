#!/usr/bin/env python3
"""Audit the fs_raw candidates for DRAFTI batch-6 SFX slots: duration, peak,
RMS shape — then recommend which take to cut per slot."""
import pathlib
import subprocess

import numpy as np

RAW = pathlib.Path('/home/z/my-project/scripts/fs_raw')
SR = 22050
EPS = 1e-9

SLOTS = {
    'chicken':       'chicken_cluck_',
    'chicken_panic': 'chicken_squawk_',
    'duck':          'duck_quack_',
    'meow':          'cat_meow_',
    'purr':          'cat_purr_',
    'vineboom':      'vine_boom_',
    'bruh':          'bruh_',
    'dundundun':     'dun_dun_duuun_',
    'sadviolin':     'sad_violin_',
    'cricket':       'cricket_chirp_',
}


def pcm(path: pathlib.Path) -> np.ndarray:
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR),
         '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def stats(x: np.ndarray) -> dict:
    win = int(SR * 0.05)
    n = len(x) // win
    rms = np.sqrt(np.mean(x[:n * win].reshape(n, win) ** 2, axis=1) + EPS)
    act = np.where(rms >= 0.008)[0]
    spoken = (act[-1] - act[0]) * 0.05 if len(act) else 0
    return {'dur': len(x) / SR, 'peak_db': 20 * np.log10(np.max(np.abs(x)) + EPS),
            'active_s': round(float(spoken), 2),
            'bursts': int(np.sum((rms[:-1] < 0.008) & (rms[1:] >= 0.008)) + (1 if rms[0] >= 0.008 else 0))}


def main() -> None:
    for slot, prefix in SLOTS.items():
        files = sorted(RAW.glob(prefix + '*'))
        print(f'== {slot}')
        for f in files:
            try:
                s = stats(pcm(f))
                print(f'   {f.name:<44} {s["dur"]:6.2f}s  act {s["active_s"]:5.2f}s  '
                      f'peak {s["peak_db"]:6.1f} dBFS  bursts {s["bursts"]}')
            except Exception as e:
                print(f'   {f.name}: ERR {e}')


if __name__ == '__main__':
    main()
