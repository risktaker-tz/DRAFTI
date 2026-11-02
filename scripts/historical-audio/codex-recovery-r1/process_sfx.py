#!/usr/bin/env python3
"""Turn raw recordings + TTS lines into small, consistent, embedded-ready mp3s.

For every declared sound:
  1. decode the source to mono PCM,
  2. either keep the whole file minus silent edges ("full") or select the
     loudest window of the target length ("peak"; the window is placed so the
     energy maximum sits ~40% in — gestures get room to breathe),
  3. peak-normalize to -1.5 dBFS, add short fades, resample to 44.1k mono,
  4. encode mp3 @ 56 kbps into the DRAFTI repo's src/audio/ directory.

Sources live in /home/z/my-project/scripts/{sfx_raw,fs_raw,tts_raw}.
"""
import json
import math
import os
import pathlib
import subprocess

RAW = pathlib.Path('/home/z/my-project/scripts')
OUT = pathlib.Path('/home/z/my-project/download/DRAFTI/src/audio')
SR = 22050  # analysis rate

# name -> (source file, mode, target seconds)
PLAN = {
    # ---- majestic animals -------------------------------------------------
    'lion':        ('fs_raw/lion_roar_4_Manim8.mp3',      'full', 2.1),
    'lion_long':   ('fs_raw/lion_roar_1_Manim8.mp3',      'peak', 2.8),
    'eagle':       ('fs_raw/eagle_1_jjwallace.mp3',       'peak', 2.2),
    'elephant':    ('sfx_raw/rl_elephant.mp3',            'peak', 2.6),
    'bear':        ('sfx_raw/rl_bear.mp3',                'peak', 2.4),
    'wildroar':    ('sfx_raw/wb_wildroar.mp3',            'peak', 2.2),
    # ---- comedy / awkward --------------------------------------------------
    'trombone':    ('sfx_raw/hb_tromboing.mp3',           'full', 2.8),
    'wilhelm':     ('sfx_raw/wilhelm.mp3',                'full', 1.0),
    'whistle':     ('sfx_raw/wb_slidewhistle.mp3',        'peak', 1.7),
    'ahooga':      ('sfx_raw/rl_ahooga.mp3',              'peak', 1.8),
    'haha':        ('sfx_raw/wb_haha.mp3',                'peak', 2.2),
    'banana':      ('sfx_raw/wb_banana.mp3',              'peak', 2.4),
    'woops':       ('sfx_raw/wb_woops.mp3',               'full', 3.0),
    'klonk':       ('sfx_raw/wb_klonk.mp3',               'peak', 1.2),
    'rimshot':     ('sfx_raw/rimshot.mp3',                'full', 1.0),
    'wolfwhistle': ('sfx_raw/rl_wolfwhistle.mp3',         'peak', 1.5),
    'shloop':      ('sfx_raw/wb_shloop.mp3',              'full', 3.2),
    'zip':         ('sfx_raw/wb_zip.mp3',                 'full', 2.6),
    'gulp':        ('sfx_raw/wb_gulp.mp3',                'full', 2.4),
    'smarts':      ('sfx_raw/wb_smarts.mp3',              'full', 2.6),
    'fall':        ('sfx_raw/wb_fall.mp3',                'full', 3.0),
    'scramble':    ('sfx_raw/hb_scramble.mp3',            'full', 2.6),
    # ---- TTS voice lines ----------------------------------------------------
    'v_magnificent': ('tts_raw/magnificent.mp3', 'full', 2.2),
    'v_chess':       ('tts_raw/chess.mp3',       'full', 3.3),
    'v_legendary':   ('tts_raw/legendary.mp3',   'full', 2.5),
    'v_onejob':      ('tts_raw/onejob.mp3',      'full', 1.4),
    'v_ohno':        ('tts_raw/ohno.mp3',        'full', 3.2),
    'v_wow':         ('tts_raw/wow.mp3',         'full', 2.3),
    'v_king':        ('tts_raw/king.mp3',        'full', 2.0),
    'v_win':         ('tts_raw/win.mp3',         'full', 4.1),
    'v_lose':        ('tts_raw/lose.mp3',        'full', 2.6),
    'v_draw':        ('tts_raw/draw.mp3',        'full', 2.9),
    'v_awkward':     ('tts_raw/awkward.mp3',     'full', 2.4),
    # ---- batch 2: the judge (accurate / mistake / trick) --------------------
    'v_nice':        ('tts_raw2/nice.wav',       'full', 1.2),
    'v_sharp':       ('tts_raw2/sharp.wav',      'full', 1.2),
    'v_clean':       ('tts_raw2/clean.wav',      'full', 1.6),
    'v_why':         ('tts_raw2/why.wav',        'full', 1.3),
    'v_sure':        ('tts_raw2/sure.wav',       'full', 1.4),
    'v_curious':     ('tts_raw2/curious.wav',    'full', 1.5),
    'v_hmm':         ('tts_raw2/hmm.wav',        'full', 1.8),
    'v_cost':        ('tts_raw2/cost.wav',       'full', 1.2),
    'v_trick':       ('tts_raw2/trick.wav',      'full', 2.2),
    'v_trap':        ('tts_raw2/trap.wav',       'full', 1.1),
    'v_crafty':      ('tts_raw2/crafty.wav',     'full', 1.9),
    'v_only':        ('tts_raw2/only.wav',       'full', 2.4),
}


def pcm(path: pathlib.Path) -> bytes:
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR),
         '-f', 's16le', '-'],
        capture_output=True, check=True)
    return p.stdout


def rms_windows(data: bytes, win_ms: float = 20) -> list:
    n = len(data) // 2
    w = max(1, int(SR * win_ms / 1000))
    vals = []
    for i in range(0, n - w, w):
        acc = 0
        for j in range(i, i + w, 4):  # subsample for speed
            v = int.from_bytes(data[j * 2:j * 2 + 2], 'little', signed=True)
            acc += v * v
        vals.append(math.sqrt(acc / (w / 4)) / 32768)
    return vals


def best_window(rms: list, target_s: float) -> float:
    """Start time (s) of the loudest window with the peak ~40% in."""
    w = int(SR * target_s / (20 * SR / 1000))  # windows per target
    w = max(1, int(target_s / 0.02))
    if len(rms) <= w:
        return 0.0
    peak_i = max(range(len(rms)), key=lambda i: rms[i])
    lo = max(0, peak_i - int(w * 0.4))
    hi = min(len(rms) - w, lo + w) if lo + w <= len(rms) - 1 else len(rms) - w
    lo = max(0, min(lo, hi))
    best_i, best_e = lo, -1
    for i in range(lo, hi + 1):
        e = sum(rms[i:i + w])
        if e > best_e:
            best_e, best_i = e, i
    return best_i * 0.02


def silent_edges(rms: list, thresh: float = 0.012) -> tuple:
    first, last = 0, len(rms) - 1
    while first < len(rms) and rms[first] < thresh:
        first += 1
    while last > first and rms[last] < thresh:
        last -= 1
    return first * 0.02, min((last + 1) * 0.02, len(rms) * 0.02)


def process(name: str, src: str, mode: str, target: float) -> dict:
    srcp = RAW / src
    data = pcm(srcp)
    total = len(data) / 2 / SR
    if mode == 'peak':
        start = best_window(rms_windows(data), target)
        dur = min(target, max(0.4, total - start))
    else:
        rms = rms_windows(data)
        a, b = silent_edges(rms)
        dur = min(target + 0.6, b - a) if b > a else min(target, total)
        start = max(0, a - 0.05)
        if dur > target + 0.6:
            dur = best_window(rms_windows(data), target + 0.6)
            dur2 = target + 0.6
            # recompute a peak window for overlong speech (rare)
            seg = best_window(rms, dur2)
            start, dur = seg, dur2
        dur = min(dur, total - start)
    outp = OUT / (name + '.mp3')
    outp.parent.mkdir(parents=True, exist_ok=True)
    # pass 1: max volume of the segment
    det = subprocess.run(
        ['ffmpeg', '-v', 'info', '-ss', f'{start:.2f}', '-t', f'{dur:.2f}',
         '-i', str(srcp), '-af', 'volumedetect', '-f', 'null', '-'],
        capture_output=True, text=True).stderr
    mx = 0.0
    for line in det.splitlines():
        if 'max_volume' in line:
            mx = float(line.split('max_volume:')[1].split('dB')[0].strip())
    gain = -1.5 - mx
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-ss', f'{start:.2f}', '-t', f'{dur:.2f}',
         '-i', str(srcp), '-af',
         f'volume={gain:.1f}dB,afade=t=in:d=0.015,afade=t=out:st={max(0.0, dur - 0.06):.2f}:d=0.06,'
         f'aresample=44100,highpass=f=45',
         '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '56k', '-ar', '44100',
         str(outp)], capture_output=True, text=True)
    if p.returncode != 0:
        return {'name': name, 'error': p.stderr[-300:]}
    size = outp.stat().st_size
    return {'name': name, 'src': src, 'start': round(start, 2),
            'dur': round(dur, 2), 'gain_db': round(gain, 1), 'bytes': size}


def main() -> None:
    report = []
    for name, (src, mode, target) in PLAN.items():
        r = process(name, src, mode, target)
        report.append(r)
        if 'error' in r:
            print(f'ERR {name}: {r["error"]}')
        else:
            print(f'ok  {name:14} {r["dur"]:>5}s  start={r["start"]:>6}  '
                  f'gain={r["gain_db"]:>6} dB  {r["bytes"]//1024:>4} KB')
    (RAW / 'sfx_report.json').write_text(json.dumps(report, indent=1))
    tot = sum(r.get('bytes', 0) for r in report)
    print(f'total: {tot//1024} KB across {len(report)} sounds')


if __name__ == '__main__':
    main()
