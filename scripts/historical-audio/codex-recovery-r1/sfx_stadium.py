#!/usr/bin/env python3
"""12 crowd-pleaser stings for live-streamed games — synthesized, no source, CC0.
Crowd gasps and roars, applause, airhorn, drumroll, riser, coin cascade, tada,
heartbeat, whistle, disappointed ooh. Same rendering pipeline as the think
stings: 44.1k mono, mp3 56k."""
import numpy as np, subprocess, pathlib

SR = 44100
OUT = pathlib.Path('/home/z/my-project/download/DRAFTI/src/audio')
TMP = pathlib.Path('/tmp/stadium'); TMP.mkdir(exist_ok=True)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def env(n, a=0.005, d=0.25, curve=3.0):
    t = np.linspace(0, 1, n)
    at = np.clip(t / max(a, 1e-4), 0, 1)
    de = np.exp(-curve * t / max(d, 1e-4))
    return at * de

def bandnoise(n, lo, hi):
    """white noise band-limited by a simple cascaded moving-average/resonant mix"""
    x = np.random.randn(n)
    # crude band-pass: low-pass at hi via MA window, then subtract low-pass at lo
    wl = max(2, int(SR / hi))
    wh = max(2, int(SR / max(lo, 1)))
    lp_hi = np.convolve(x, np.ones(wl) / wl, mode='same')
    lp_lo = np.convolve(x, np.ones(wh) / wh, mode='same')
    return lp_hi - lp_lo

def tone(f, dur, harm=(1.0,), sr=SR, detune=0.0):
    n = int(dur * sr)
    t = np.arange(n) / sr
    y = np.zeros(n)
    for i, h in enumerate(harm, 1):
        y += h * np.sin(2 * np.pi * f * i * t + (detune * i))
    return y

def bell(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = (np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*f*2.756*t) +
         0.2*np.sin(2*np.pi*f*5.404*t) + 0.1*np.sin(2*np.pi*f*8.933*t))
    return y * env(n, 0.002, dur*0.9, 4.5)

def place(segments, total=None):
    total = total or int(sum(len(y) + g for y, g in segments) + SR * 0.15)
    out = np.zeros(total)
    ix = 0
    for y, g in segments:
        if ix + len(y) > total:
            out = np.concatenate([out, np.zeros(ix + len(y) - total)])
            total = len(out)
        out[ix:ix+len(y)] += y
        ix += len(y) + g
    return out

def overlap(segments, step, total=None):
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
    return x / m * peak

rng = np.random.default_rng(4242)
STINGS = {}

# ---- crowd gasp: a band-limited "ah" swell that rises then cuts ----
for i, (f0, f1, dur) in enumerate([(420, 780, 0.9), (380, 900, 1.05)], start=1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    src = bandnoise(n, f0, 1800)
    # vowel-ish resonance sweeping up
    sweep = np.sin(2 * np.pi * (f0 + (f1 - f0) * np.clip(t / dur * 1.4, 0, 1)) * t)
    y = (src * 0.8 + 0.25 * src * sweep)
    shape = np.concatenate([env(int(n*0.45), 0.5, 0.3, 1.2), np.exp(-6 * t[:n - int(n*0.45)])])
    y = y * shape[:n]
    STINGS[f'st_gasp{i}'] = norm(trim(y), 0.6)

# ---- applause: hundreds of tiny claps, dense then thinning ----
for i, (dur, dens) in enumerate([(1.9, 90), (2.4, 70)], start=1):
    n = int(dur * SR)
    y = np.zeros(n)
    nclaps = int(dur * dens * 3)
    cl = int(0.012 * SR)
    clap = bandnoise(cl, 1200, 5200) * env(cl, 0.001, 0.008, 6)
    for _ in range(nclaps):
        # density ramps up fast, decays slowly to the end
        at = rng.beta(1.6, 2.2) * (dur - 0.05)
        m = int(at * SR)
        amp = 0.25 + 0.75 * np.exp(-3 * at / dur)
        y[m:m+cl] += clap * amp * rng.uniform(0.4, 1.0)
    STINGS[f'st_appl{i}'] = norm(trim(y), 0.62)

# ---- airhorn: three sawtooth blasts, the universal hype button ----
n3 = int(1.15 * SR)
y = np.zeros(n3)
for k, at in enumerate([0.0, 0.34, 0.68]):
    dur = 0.26 if k < 2 else 0.42
    m = int(at * SR)
    seg = tone(415, dur, harm=(1, .6, .35, .2), detune=0.02)
    seg += 0.5 * tone(415 * 1.01, dur, harm=(1, .5))
    seg *= env(int(dur * SR), 0.004, dur, 2.2)
    y[m:m+len(seg)] += seg[:max(0, min(len(seg), n3 - m))]
STINGS['st_air1'] = norm(trim(y), 0.62)

# ---- drumroll into a hit: snare rolls crescendo, one final stroke ----
dur = 1.7
n = int(dur * SR)
y = np.zeros(n)
t = np.arange(n) / SR
rate = 14 + 10 * t / dur          # accelerating
ph = np.cumsum(rate) / SR
on = np.floor(ph * 2) % 2 == 0
edges = np.nonzero(np.diff(on.astype(int)) == 1)[0]
for m in edges:
    L = min(int(0.05 * SR), n - m)
    if L <= 0:
        continue
    seg = bandnoise(L, 900, 4800) * env(L, 0.001, 0.03, 6)
    amp = 0.3 + 0.7 * t[m] / dur
    y[m:m+L] += seg * amp
L = min(int(0.5 * SR), n - int(1.52 * SR))
hit = bandnoise(L, 300, 3000) * env(L, 0.001, 0.28, 5)
y[int(1.52*SR):int(1.52*SR)+L] += hit * 1.2
STINGS['st_drum1'] = norm(trim(y), 0.6)

# ---- riser: rising filtered noise + tone sweep, for the last tick before a bout
dur = 1.25
n = int(dur * SR)
t = np.arange(n) / SR
f = 180 * 2 ** (t / dur * 2.3)
y = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6
y += 0.7 * bandnoise(n, 700, 4000) * env(n, 0.7, 0.9, 1.4)
y *= env(n, 0.75, 1.0, 1.1)
STINGS['st_riser1'] = norm(trim(y), 0.55)

# ---- coin cascade: bright little bells tumbling down a pentatonic slope ----
steps = [88, 93, 95, 100, 93, 88, 83, 88]
segs = [(bell(midi(nm), 0.5), int(0.06 * SR)) for nm in steps]
STINGS['st_coin1'] = norm(trim(overlap(segs, int(0.055 * SR))), 0.58)

# ---- tada: quick major flourish held on a shiny chord ----
segs = [(bell(midi(72), 0.8), 0), (bell(midi(76), 0.8), int(0.09*SR)),
        (bell(midi(79), 0.9), int(0.18*SR)), (bell(midi(84), 1.3), int(0.27*SR))]
y = overlap(segs, 0)
y += 0.3 * np.roll(y, int(0.012 * SR))
STINGS['st_tada1'] = norm(trim(y), 0.6)

# ---- heartbeat: two lub-dub pairs, low and close ----
dur = 2.1
n = int(dur * SR)
y = np.zeros(n)
for k, at in enumerate([0.0, 0.28, 1.0, 1.28]):
    m = int(at * SR)
    L = int(0.16 * SR)
    th = np.sin(2 * np.pi * 58 * np.arange(L) / SR) * env(L, 0.004, 0.09, 5)
    y[m:m+L] += th * (0.9 if k % 2 == 0 else 0.65)
STINGS['st_heart1'] = norm(trim(y), 0.6)

# ---- referee whistle: warbling square, the "not allowed" tweet ----
dur = 0.55
n = int(dur * SR)
t = np.arange(n) / SR
wob = 1 + 0.02 * np.sin(2 * np.pi * 22 * t)
y = np.sign(np.sin(2 * np.pi * 2350 * wob * t)) * env(n, 0.01, 0.5, 3)
y = np.convolve(y, np.ones(4)/4, mode='same')
STINGS['st_whis1'] = norm(trim(y), 0.45)

# ---- disappointed ooh: the crowd watching a piece walk into a trap ----
for i, (f0, f1, dur) in enumerate([(520, 240, 1.1), (480, 210, 1.3)], start=1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    src = bandnoise(n, f0, 1400)
    sweep = np.sin(2 * np.pi * (f0 + (f1 - f0) * t / dur) * t)
    y = src * 0.8 + 0.25 * src * sweep
    y *= env(n, 0.25, dur, 2.2)
    STINGS[f'st_ooh{i}'] = norm(trim(y), 0.55)

# ---- crowd roar: long distant swell for a crown change ----
dur = 2.6
n = int(dur * SR)
t = np.arange(n) / SR
y = bandnoise(n, 300, 1600) * env(n, 0.9, 2.2, 1.2)
y += 0.4 * bandnoise(n, 900, 3000) * env(n, 0.7, 1.8, 1.5)
lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 1.7 * t)
STINGS['st_crowd1'] = norm(trim(y * lfo), 0.55)

for name, y in STINGS.items():
    y = trim(y)
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16)
    raw = TMP / f'{name}.raw'
    raw.write_bytes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1',
                    '-i', str(raw), '-codec:a', 'libmp3lame', '-b:a', '56k',
                    str(OUT / f'{name}.mp3')], check=True)
    print(name, (OUT / f'{name}.mp3').stat().st_size)
print('stadium stings done:', len(STINGS))
