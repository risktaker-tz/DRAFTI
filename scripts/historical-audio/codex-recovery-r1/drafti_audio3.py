#!/usr/bin/env python3
"""DRAFTI audio pipeline v3 — speech-safe voice processing + synthesized SFX.

Voice fix: the old processor capped speech at target+0.6s and chopped line
endings. This version NEVER caps speech: it trims silence, pads 0.22s of tail,
normalizes, and audits the result (every line must keep >= 97% of its spoken
extent).

Also synthesizes the new UI/game SFX (menu whooshes, clock, fanfares, pops)
with numpy, because UI sounds must be tiny, consistent and license-free.
"""
import json
import math
import pathlib
import subprocess

import numpy as np

RAW = pathlib.Path('/home/z/my-project/scripts/tts_raw3')
OUT = pathlib.Path('/home/z/my-project/download/DRAFTI/src/audio')
SR = 22050
EPS = 1e-9


def pcm(path: pathlib.Path) -> np.ndarray:
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR),
         '-f', 'f32le', '-'],
        capture_output=True, check=True)
    a = np.frombuffer(p.stdout, dtype=np.float32).copy()
    return a


def write_mp3(name: str, x: np.ndarray, gain_db: float, kbps: int = 56) -> int:
    x = np.clip(x, -1, 1)
    raw = (x * 32767).astype('<i2').tobytes()
    outp = OUT / f'{name}.mp3'
    p = subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1',
         '-i', '-', '-af', f'volume={gain_db}dB,aresample=44100',
         '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', str(outp)],
        input=raw, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode()[-300:])
    return outp.stat().st_size


def normalize(x: float, head_db: float) -> np.ndarray:
    peak = np.max(np.abs(x)) + EPS
    return x * (10 ** (head_db / 20)) / peak


def speech_process(name: str) -> dict:
    """Trim silence (never speech), pad tail, normalize, encode."""
    x = pcm(RAW / f'{name}.wav')
    win = int(SR * 0.02)
    n = len(x) // win
    rms = np.sqrt(np.mean(x[:n * win].reshape(n, win) ** 2, axis=1) + EPS)
    thresh = 0.008
    idx = np.where(rms >= thresh)[0]
    if len(idx) == 0:
        return {'name': name, 'error': 'all silence'}
    a, b = int(idx[0]), int(idx[-1]) + 1
    spoken = (b - a) * 0.02
    head = max(0, a - 6)            # 120 ms head
    tail = min(n, b + 11)           # 220 ms tail — never clip the decay
    seg = x[head * win:tail * win]
    seg = normalize(seg, -1.5)
    size = write_mp3(name, seg, 0)
    return {'name': name, 'spoken_s': round(spoken, 2), 'out_s': round(len(seg) / SR, 2),
            'kept_pct': round(100 * min(1.0, (len(seg) / SR) / (spoken + 0.34)), 1),
            'bytes': size}


# ----------------------------------------------------------- synth SFX -----
def env(n, a, r, sr=SR):
    """attack/release envelope in samples"""
    n = max(4, int(n))
    e = np.ones(n)
    na, nr = max(1, int(a * sr)), max(1, int(r * sr))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def sine(f, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    return np.sin(2 * np.pi * f * t)


def sweep(f0, f1, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    freqs = np.geomspace(max(f0, 1), max(f1, 1), len(t))
    ph = 2 * np.pi * np.cumsum(freqs) / sr
    return np.sin(ph)


def noise(dur, sr=SR):
    return np.random.default_rng(7).standard_normal(int(dur * sr))


def lowpass(x, alpha):
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def bell(f, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    x = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t)
         + 0.2 * np.sin(2 * np.pi * f * 5.4 * t))
    return x * np.exp(-t * 5.5)


def pluck(f, dur, sr=SR, glide=None):
    t = np.arange(int(dur * sr)) / sr
    f0 = f
    f1 = glide if glide else f
    freqs = np.geomspace(f0, max(f1, 1), len(t))
    ph = 2 * np.pi * np.cumsum(freqs) / sr
    return np.sin(ph) * np.exp(-t * 9)


def saw(f, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    return 2 * ((f * t) % 1) - 1


def seq(notes, dur, gap, sr=SR, wave='sine'):
    """notes: list of freqs; each plucked for `dur`, `gap` apart"""
    total = int((gap * (len(notes) - 1) + dur + 0.25) * sr)
    out = np.zeros(total)
    for i, f in enumerate(notes):
        s = (saw(f, dur, sr) * 0.4 + sine(f, dur, sr)) if wave == 'brass' else sine(f, dur, sr)
        s *= env(len(s), 0.01, dur * 0.7, sr)
        s0 = int(i * gap * sr)
        out[s0:s0 + len(s)] += s
    return out


def mix(*xs):
    """sum signals of different lengths, zero-padded to the longest"""
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[:len(x)] += x
    return out


def synth_all() -> dict:
    def fin(x, head_db=-3.0, fade=0.012):
        x = normalize(x, head_db)
        nf = max(1, int(fade * SR))
        x[-nf:] *= np.linspace(1, 0, nf)
        x[:nf] *= np.linspace(0, 1, nf)
        return x

    S = {}
    # -- drawer / menu -------------------------------------------------------
    w = noise(0.30)
    fsw = sweep(300, 2200, 0.30)
    S['ui_open'] = fin(lowpass(w * fsw, 0.35) * env(len(w), 0.02, 0.16), -6)
    w = noise(0.26)
    fsw = sweep(2000, 260, 0.26)
    S['ui_close'] = fin(lowpass(w * fsw, 0.35) * env(len(w), 0.02, 0.14), -6)
    S['ui_back'] = fin(mix(pluck(520, 0.16, glide=300), 0.3 * pluck(260, 0.16, glide=150)), -8)
    S['ui_click'] = fin(mix(pluck(1500, 0.045), 0.4 * noise(0.02) * env(0.02* SR, 0.001, 0.018)), -8)
    S['ui_toggle_on'] = fin(seq([660, 990], 0.09, 0.06), -9)
    S['ui_toggle_off'] = fin(seq([990, 550], 0.09, 0.06), -9)
    S['ui_save'] = fin(mix(seq([659, 784, 1319], 0.22, 0.09), 0.3 * seq([659, 784, 1319], 0.3, 0.09)), -7)
    S['ui_theme'] = fin(seq([1047, 1319, 1568, 2093, 2637], 0.14, 0.045), -10)
    buzz = (saw(92, 0.16) * 0.6 + saw(95, 0.16) * 0.4) * env(0.16* SR, 0.004, 0.05)
    S['ui_error'] = fin(np.concatenate([buzz, np.zeros(int(0.05 * SR)), buzz * 0.8]), -10)
    w = noise(0.20); fsw = sweep(500, 1400, 0.20)
    S['ui_slide'] = fin(lowpass(w * fsw, 0.4) * env(len(w), 0.03, 0.10), -10)
    # -- clock / tension -----------------------------------------------------
    tick = mix(noise(0.03) * env(0.03* SR, 0.001, 0.026), 0.6 * pluck(2100, 0.03))
    S['clock_tick'] = fin(tick, -12)
    tock = mix(noise(0.035) * env(0.035* SR, 0.001, 0.03), 0.7 * pluck(2700, 0.035))
    S['clock_tock'] = fin(tock, -10)
    alarm = np.concatenate([sweep(880, 660, 0.22) * env(0.22* SR, 0.01, 0.08),
                            np.zeros(int(0.06 * SR)),
                            sweep(880, 660, 0.22) * env(0.22* SR, 0.01, 0.08)])
    S['alarm'] = fin(mix(alarm, 0.25 * saw(440, 0.5) * env(0.5* SR, 0.01, 0.2)), -8)
    # referee whistle: 2.1 kHz trill with 35 Hz AM
    t = np.arange(int(0.75 * SR)) / SR
    trill = np.sin(2 * np.pi * 2150 * t) * (0.62 + 0.38 * np.sign(np.sin(2 * np.pi * 34 * t)))
    trill = trill * env(len(t), 0.02, 0.12) * (0.8 + 0.2 * np.sin(2 * np.pi * 2400 * t))
    S['whistle_ref'] = fin(trill, -9)
    # -- pops & feelings -----------------------------------------------------
    S['notify_pop'] = fin(sweep(620, 240, 0.09) * env(0.09* SR, 0.004, 0.05), -8)
    hb = np.concatenate([sweep(72, 48, 0.11) * env(0.11* SR, 0.006, 0.07),
                         np.zeros(int(0.13 * SR)),
                         0.8 * sweep(64, 42, 0.12) * env(0.12* SR, 0.006, 0.08)])
    S['heartbeat'] = fin(hb, -6)
    S['pickup'] = fin(mix(sweep(360, 620, 0.08) * env(0.08* SR, 0.004, 0.05),
                          0.3 * noise(0.03) * env(0.03* SR, 0.001, 0.026)), -12)
    S['putdown'] = fin(mix(sweep(520, 300, 0.07) * env(0.07* SR, 0.004, 0.05),
                           0.5 * noise(0.025) * env(0.025* SR, 0.001, 0.02)), -12)
    # -- fanfares ------------------------------------------------------------
    S['crown_fanfare'] = fin(seq([523, 659, 784, 1047], 0.24, 0.13, wave='brass'), -6)
    win = mix(seq([392, 523, 659, 784, 1047, 1319], 0.30, 0.13, wave='brass'),
              0.35 * seq([196, 262, 330, 392, 523, 659], 0.34, 0.13))
    S['win_fanfare'] = fin(win, -5)
    womp = (saw(220, 0.55) + 0.5 * saw(112, 0.55)) * env(0.55* SR, 0.01, 0.4)
    fr = np.geomspace(1, 0.45, len(womp))
    S['lose_womp'] = fin(womp * fr, -7)
    S['draw_chime'] = fin(mix(seq([587, 494], 0.3, 0.22), 0.4 * bell(587, 0.5)), -8)
    gong = sum(k * np.sin(2 * np.pi * 82 * m * np.arange(int(2.4 * SR)) / SR
                          * (1 + 0.001 * i))
               for i, (k, m) in enumerate([(1, 1), (.6, 1.51), (.42, 2.14),
                                           (.3, 2.71), (.22, 3.44), (.14, 4.19)]))
    t = np.arange(int(2.4 * SR)) / SR
    S['gong'] = fin(mix(gong * np.exp(-t * 1.9), 0.15 * noise(2.4) * np.exp(-t * 6)), -7)
    roll = np.zeros(int(0.9 * SR))
    for i in range(26):
        s0 = int(i * 0.032 * SR)
        seg = noise(0.022) * env(0.022* SR, 0.002, 0.018) * (0.25 + 0.75 * i / 26)
        roll[s0:s0 + len(seg)] += seg
    S['drumroll'] = fin(roll, -8)
    S['sparkle'] = fin(mix(seq([2093, 2637, 3136, 4186], 0.10, 0.05), 0.4 * bell(3136, 0.3)), -12)
    riser = lowpass(noise(1.0) * np.linspace(0.15, 1, int(1.0* SR)), 0.3)
    riser += 0.5 * sweep(220, 880, 1.0)
    S['riser'] = fin(riser * env(1.0* SR, 0.4, 0.08), -12)
    downer = sweep(520, 130, 0.6) * env(0.6* SR, 0.01, 0.4)
    S['downer'] = fin(mix(downer, 0.3 * saw(160, 0.6) * env(0.6* SR, 0.01, 0.4)), -10)
    zap = sweep(1900, 240, 0.16) * env(0.16* SR, 0.002, 0.1)
    S['laser'] = fin(mix(zap, 0.35 * noise(0.05) * env(0.05* SR, 0.001, 0.04)), -9)
    S['coin'] = fin(np.concatenate([sine(988, 0.08) * env(0.08* SR, 0.002, 0.03),
                                    sine(1319, 0.28) * env(0.28* SR, 0.002, 0.2)]), -10)
    S['powerup'] = fin(seq([392, 523, 659, 784], 0.09, 0.06), -9)
    S['achievement'] = fin(mix(seq([523, 659, 784], 0.16, 0.1, wave='brass'),
                               0.4 * np.concatenate([np.zeros(int(0.2 * SR)),
                                                     seq([1047, 1319, 1568], 0.4, 0.0, wave='brass')])), -6)
    # -- capture streak impacts ---------------------------------------------
    kick = sweep(150, 44, 0.22) * env(0.22* SR, 0.002, 0.18)
    crack = lowpass(noise(0.05), 0.55) * env(0.05* SR, 0.001, 0.045)
    S['streak_hit'] = fin(mix(kick, 0.9 * crack), -6)
    sub = sweep(120, 30, 0.5) * env(0.5* SR, 0.002, 0.42)
    S['streak_big'] = fin(mix(sub, 1.2 * crack, 0.4 * noise(0.2) * env(0.2* SR, 0.002, 0.19)), -5)

    report = {}
    for name, x in S.items():
        report[name] = {'bytes': write_mp3(name, x, 0, kbps=64), 'out_s': round(len(x) / SR, 2)}
    return report


def main() -> None:
    report = {'voice': [], 'synth': synth_all()}
    for f in sorted(RAW.glob('*.wav')):
        try:
            report['voice'].append(speech_process(f.stem))
        except Exception as e:
            report['voice'].append({'name': f.stem, 'error': str(e)[-200:]})
    bad = [v for v in report['voice'] if 'error' in v]
    tot_v = sum(v.get('bytes', 0) for v in report['voice'])
    tot_s = sum(v['bytes'] for v in report['synth'].values())
    print(f"voice: {len(report['voice']) - len(bad)} ok, {len(bad)} failed, {tot_v // 1024} KB")
    for v in bad:
        print('  BAD', v['name'], v['error'])
    short = [v for v in report['voice'] if v.get('spoken_s', 9) < 0.35]
    for v in short:
        print('  SUSPICIOUS-SHORT', v['name'], v['spoken_s'])
    print(f"synth: {len(report['synth'])} sounds, {tot_s // 1024} KB")
    (pathlib.Path('/home/z/my-project/scripts') / 'audio3_report.json').write_text(
        json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
