#!/usr/bin/env python3
"""20 small original 'thinking' stings — synthesized, no source, CC0.
Music-box arpeggios, woodblock taps, harp glisses, soft pops, clock chimes:
the sounds a quiet room makes while someone thinks. Rendered to mp3 56k mono,
matching the rest of the bank."""
import numpy as np, subprocess, pathlib

SR = 44100
OUT = pathlib.Path('/home/z/my-project/download/DRAFTI/src/audio')
OUT.mkdir(exist_ok=True)
TMP = pathlib.Path('/tmp/think_stings'); TMP.mkdir(exist_ok=True)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def env(n, a=0.005, d=0.25, curve=3.0):
    t = np.linspace(0, 1, n)
    at = np.clip(t / max(a, 1e-4), 0, 1)
    de = np.exp(-curve * t / max(d, 1e-4))
    return at * de

def tone(f, dur, harm=(1.0,), sr=SR):
    n = int(dur * sr)
    t = np.arange(n) / sr
    y = np.zeros(n)
    for i, h in enumerate(harm, 1):
        y += h * np.sin(2 * np.pi * f * i * t)
    return y

def bell(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = (np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*f*2.756*t) +
         0.2*np.sin(2*np.pi*f*5.404*t) + 0.1*np.sin(2*np.pi*f*8.933*t))
    return y * env(n, 0.002, dur*0.9, 4.5)

def woodblock(f, dur=0.09):
    n = int(dur * SR)
    y = np.sign(np.sin(2*np.pi*f*np.arange(n)/SR)) * env(n, 0.001, 0.05, 7)
    y = y + 0.5*np.random.randn(n)*env(n, 0.0005, 0.02, 9)
    return y

def pop(f0, f1, dur=0.12):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 + (f1 - f0) * t / dur
    return np.sin(2*np.pi*np.cumsum(f)/SR) * env(n, 0.002, dur*0.8, 5)

def harp(f, dur=1.4):
    return tone(f, dur, harm=(1.0, 0.28, 0.12, 0.05)) * env(int(dur*SR), 0.003, dur, 2.6)

def seq(notes, gap, gen_fn, dur_each, **kw):
    parts = []
    for n in notes:
        y = gen_fn(midi(n) if isinstance(n, int) else n, dur_each, **kw)
        parts.append((y, int(gap * SR)))
    total = sum(len(y) for y, _ in parts)
    out = np.zeros(total)
    ix = 0
    for y, g in parts:
        out[ix:ix+len(y)] += y; ix += len(y) + g - len(y) + g
    # fix: step by len+gap properly
    return None

def place(segments, total=None):
    total = total or int(sum(len(y) + g for y, g in segments) + SR * 0.15)
    out = np.zeros(total)
    ix = 0
    for y, g in segments:
        out[ix:ix+len(y)] += y
        ix += len(y) + g
    return out

def overlap(segments, step, total=None):
    """Notes ring over each other: each starts `step` samples after the last."""
    total = total or int(len(segments) * step + max(len(y) for y, _ in segments) + SR * 0.2)
    out = np.zeros(total)
    for i, (y, _) in enumerate(segments):
        out[i*step:i*step+len(y)] += y
    return out

def trim(x, floor=1e-4):
    nz = np.nonzero(np.abs(x) > floor)[0]
    return x[:nz[-1] + int(SR * 0.25)] if len(nz) else x

def norm(x, peak=0.72):
    m = np.max(np.abs(x)) or 1.0
    return (x / m * peak)

rng = np.random.default_rng(77)

STINGS = {}

# music-box arpeggios (soft bell triples/quads on gentle intervals)
for i, (ns, g) in enumerate([
    ([76, 81, 88], .16), ([74, 78, 85], .17), ([79, 83, 86], .15),
    ([72, 76, 79, 84], .19), ([77, 81, 84, 89], .17), ([71, 78, 80, 87], .18),
], start=1):
    segs = [(bell(midi(n), 1.1), int(g*SR)) for n in ns]
    y = place(segs)
    # gentle stereo-less shimmer
    y += 0.12 * np.roll(y, int(0.011*SR))
    STINGS[f'th_m{i}'] = norm(y)

# woodblock thinking taps (the pen on the table)
for i, pat in enumerate([
    [0, .22, .40], [0, .18, .30, .44], [0, .26, .34], [0, .15, .28, .41, .50],
    [0, .20, .46], [0, .19, .31, .55],
], start=1):
    segs = [(woodblock(midi(69 + (i % 3) * 2)), int((p - (0 if k == 0 else pat[k-1])) * SR))
            for k, p in enumerate(pat)]
    y = place(segs)
    STINGS[f'th_t{i}'] = norm(y, 0.6)

# harp glisses and dreamy two-note pairs
gl = [b for b in np.linspace(79, 96, 14)]
segs = [(harp(midi(n), 0.5), 0) for n in gl]
STINGS['th_g1'] = norm(trim(overlap(segs, int(0.028*SR))), 0.55)
gl = [b for b in np.linspace(84, 91, 9)]
segs = [(harp(midi(n), 0.6), 0) for n in gl]
STINGS['th_g2'] = norm(trim(overlap(segs, int(0.045*SR))), 0.55)
for i, (a, b) in enumerate([(64, 76), (69, 81), (66, 78)], start=1):
    y = place([(harp(midi(a), 1.2), int(0.28*SR)), (harp(midi(b), 1.5), 0)])
    STINGS[f'th_p{i}'] = norm(trim(y), 0.5)

# soft pops (curious little bubbles)
for i, (f0, f1) in enumerate([(300, 700), (350, 850), (280, 620), (420, 980)], start=1):
    y = place([(pop(f0, f1), int(0.14*SR)), (pop(f1, f0*0.9), 0)])
    STINGS[f'th_o{i}'] = norm(y, 0.5)

# clock + page + pencil room noises
n = int(1.6 * SR); t = np.arange(n) / SR
tick = np.zeros(n)
for k, at in enumerate([0.0, 0.55, 1.1]):
    m = int(at * SR)
    tick[m:m+2200] += woodblock(midi(80 + k), 0.05)[:min(2200, n - m)] * (0.8 + 0.1*k)
STINGS['th_c1'] = norm(tick, 0.5)
# page flip: filtered noise swoosh
n = int(0.5 * SR)
noise = np.random.randn(n) * env(n, 0.08, 0.35, 4)
low = np.convolve(noise, np.ones(24)/24, mode='same')
STINGS['th_f1'] = norm(low, 0.5)
# pencil scribble: rhythmically gated noise
n = int(1.1 * SR)
gate = (np.sin(2*np.pi*7*np.arange(n)/SR) > 0.1).astype(float)
scrib = np.random.randn(n) * gate * env(n, 0.02, 1.0, 1.6)
STINGS['th_s1'] = norm(np.convolve(scrib, np.ones(6)/6, mode='same'), 0.42)

for name, y in STINGS.items():
    y = trim(y)
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16)
    raw = TMP / f'{name}.raw'
    raw.write_bytes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1',
                    '-i', str(raw), '-codec:a', 'libmp3lame', '-b:a', '56k',
                    str(OUT / f'{name}.mp3')], check=True)
    print(name, (OUT / f'{name}.mp3').stat().st_size)
print('stings done:', len(STINGS))
