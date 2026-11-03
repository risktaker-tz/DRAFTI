#!/usr/bin/env python3
"""AUDIENCE VIBES Phase B - pack builder, stage A: windows + encode + measure.

For every raw source present in scripts/research_media/audience_raw/:
  1. pick a real cut window from actual audio (ffmpeg silencedetect):
     reactions 1-6 s (beds 8-15 s), small head/tail padding, no mid-word cuts;
  2. extract mono 22050 Hz window, gently peak-normalise (final peak <= -1.5
     dBFS, target -2.0, no limiter/crushing), 30 ms fades, encode MP3 <= 56 kbps;
  3. measure duration / bytes / sha256 / peak dBFS / integrated LUFS;
  4. queue the window for ASR content review.

State: av-data/phaseb/clips/<sid>.json (resumable), av-data/phaseb/asr_queue.jsonl.
Verdicts + manifest happen in finalize_pack.py after asr_batch.py runs.
"""
import hashlib
import json
import os
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor

REPO = '/home/z/my-project/audience-work'
RAW = f'{REPO}/scripts/research_media/audience_raw'
CATALOG = f'{REPO}/docs/audience-vibes/source-catalog.json'
# Git-tracked (committed per wave): recycles wipe untracked dirs, never the repo.
STATE = f'{REPO}/audience-pack/review_state'
AUDIO = f'{REPO}/audience-pack/audio'
WORKERS = 6
BED_EVENTS = {'chatter_bed', 'venue_bed', 'tension_bed'}
REACT_MAX = 6.0
BED_MIN, BED_MAX = 8.0, 15.0
PAD = 0.15
FADE = 0.03
TARGET_PEAK = -2.0
MAX_PEAK = -1.5
BITRATE = '48k'

os.makedirs(STATE, exist_ok=True)


def run(cmd, timeout=300):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def silences(path):
    """Sound regions from silence detection (start, end); None if wall-of-sound."""
    out = run(['ffmpeg', '-i', path, '-af', 'silencedetect=noise=-30dB:d=0.9',
               '-f', 'null', '-'], timeout=600).stderr
    ends = [float(m) for m in re.findall(r'silence_end: ([\d.]+)', out)]
    starts = [float(m) for m in re.findall(r'silence_start: ([\d.]+)', out)]
    bounds = [0.0]
    for s, e in zip(starts, ends):
        bounds += [s, e]
    bounds.append(1e9)
    return [(bounds[i], bounds[i + 1]) for i in range(0, len(bounds) - 1, 2)]


def pick_window(path, dur, is_bed):
    """Return (start, end) inside dur. Real boundaries from silence where possible."""
    need_min = BED_MIN if is_bed else 1.2
    need_max = BED_MAX if is_bed else REACT_MAX
    segs = silences(path) if dur > 12 else [(0.0, 1e9)]
    segs = [(a, min(b, dur)) for a, b in segs if min(b, dur) - a >= need_min - 2 * PAD]
    if segs:
        if is_bed:
            good = [(a, b) for a, b in segs if BED_MIN <= b - a + 2 * PAD]
            if good:
                a, b = max(good, key=lambda s: s[1] - s[0])
                length = min(BED_MAX, max(BED_MIN, b - a - 2 * PAD))
                mid = (a + b) / 2
                start = max(a, mid - length / 2)
                return round(start, 2), round(min(b, start + length), 2)
        else:
            a, b = max(segs, key=lambda s: s[1] - s[0])
            length = min(REACT_MAX, b - a - 2 * PAD)
            start = a + PAD
            return round(start, 2), round(min(b - PAD, start + max(1.2, length)), 2)
    # wall-of-sound: take from the middle
    if is_bed:
        if dur < BED_MIN:
            return None
        length = BED_MIN if dur < BED_MAX + 2 else BED_MAX
    else:
        if dur < 1.2:
            return None
        length = min(REACT_MAX, dur)
    start = max(0.0, (dur - length) / 2)
    return round(start, 2), round(start + length, 2)


def ffprobe(path):
    out = run(['ffprobe', '-v', 'error', '-print_format', 'json',
               '-show_format', path]).stdout
    return float(json.loads(out)['format']['duration'])


def measure(path):
    """(peak_dbfs, loudness_lufs) from the final file."""
    vd = run(['ffmpeg', '-i', path, '-af', 'volumedetect', '-f', 'null', '-']).stderr
    pm = re.search(r'max_volume: (-?[\d.]+) dB', vd)
    peak = float(pm.group(1)) if pm else 0.0
    eb = run(['ffmpeg', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
             timeout=120).stderr
    lm = re.findall(r'I:\s+(-?[\d.]+) LUFS', eb)
    lufs = float(lm[-1]) if lm else None
    return peak, lufs


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def job(args):
    sid, entry = args
    src = f'{RAW}/{sid}.mp3'
    out_mp3 = f'{AUDIO}/avpb-{sid}.mp3'
    if os.path.exists(out_mp3) and os.path.exists(f'{STATE}/clips/{sid}.json'):
        return sid, 'cached'
    if not os.path.exists(src):
        return sid, 'missing-raw'
    try:
        dur = ffprobe(src)
        is_bed = entry['event'] in BED_EVENTS
        win = pick_window(src, dur, is_bed)
        if win is None:
            return sid, ('reject-window: bed shorter than 8s minimum'
                         if is_bed else f'reject-window: clip shorter than 1.2s ({dur:.1f}s)')
        a, b = win
        win_wav = f'/tmp/avpb_wav/{sid}.wav'
        os.makedirs('/tmp/avpb_wav', exist_ok=True)
        r = run(['ffmpeg', '-y', '-ss', str(a), '-t', str(b - a), '-i', src,
                 '-ac', '1', '-ar', '22050', '-c:a', 'pcm_s16le', win_wav])
        if r.returncode != 0:
            return sid, 'reject-extract-failed'
        vd = run(['ffmpeg', '-i', win_wav, '-af', 'volumedetect', '-f', 'null', '-']).stderr
        pm = re.search(r'max_volume: (-?[\d.]+) dB', vd)
        peak = float(pm.group(1)) if pm else 0.0
        gain = 0.0
        if peak > TARGET_PEAK or peak < -30:
            gain = round(TARGET_PEAK - peak, 2)  # gentle gain; never above MAX_PEAK
        gain = min(gain, MAX_PEAK - peak + 0.01)
        gain = max(min(gain, 24.0), -24.0)
        os.makedirs(AUDIO, exist_ok=True)
        r = run(['ffmpeg', '-y', '-i', win_wav, '-af',
                 f'volume={gain}dB,afade=t=in:d={FADE},'
                 f'afade=t=out:st={b - a - FADE:.3f}:d={FADE}',
                 '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', BITRATE,
                 out_mp3])
        if r.returncode != 0 or not os.path.exists(out_mp3):
            return sid, 'reject-encode-failed'
        peak_f, lufs = measure(out_mp3)
        rec = {
            'id': f'avpb-{sid}',
            'sourceId': f'av-fs-{sid}',
            'file': f'audio/avpb-{sid}.mp3',
            'title': entry['title'],
            'author': entry['author'],
            'sourceUrl': entry['source_page'],
            'license': entry['license'],
            'licenseUrl': entry['license_evidence_url'],
            'catalogEvent': entry['event'],
            'catalogIdentity': entry['crowd_identity_suggestion'],
            'sourceDurationSec': entry['duration_sec'],
            'sourceSha256': entry['sha256'],
            'sourceStartSec': a,
            'sourceEndSec': b,
            'windowSpeechFlag': entry['speech'],
            'sourceDescription': entry['source_description'],
            'sourceTags': entry['tags'],
            'durationSec': round(b - a, 3),
            'bytes': os.path.getsize(out_mp3),
            'sha256': sha256_file(out_mp3),
            'peakDbfs': peak_f,
            'loudnessLufs': lufs,
            'modifications': (f'cut {a:.2f}-{b:.2f}s window; mono 22050 Hz; MP3 48 kbps; '
                              f'peak gain {gain:+.2f} dB (peak {peak_f:.2f} dBFS); '
                              f'{int(FADE * 1000)} ms fades'),
        }
        json.dump(rec, open(f'{STATE}/clips/{sid}.json', 'w'))
        os.remove(win_wav)
        return sid, 'built'
    except Exception as e:  # noqa: BLE001
        return sid, f'reject-error: {str(e)[:120]}'


def main():
    cat = {e['id'].replace('av-fs-', ''): e for e in
           json.load(open(CATALOG))['entries']}
    os.makedirs(f'{STATE}/clips', exist_ok=True)
    todo = [(sid, e) for sid, e in cat.items()
            if not os.path.exists(f'{STATE}/clips/{sid}.json')]
    print(f'{len(todo)} sources to process', flush=True)
    n = 0
    with ThreadPoolExecutor(WORKERS) as ex:
        for sid, status in ex.map(job, todo):
            n += 1
            if status.startswith('reject') or status == 'missing-raw':
                with open(f'{STATE}/build_rejects.jsonl', 'a') as f:
                    f.write(json.dumps({'sid': sid, 'reason': status}) + '\n')
            if n % 50 == 0:
                print(f'  {n}/{len(todo)} ({status})', flush=True)
    built = [json.load(open(f'{STATE}/clips/{f}')) for f in os.listdir(f'{STATE}/clips')]
    with open(f'{STATE}/asr_queue.jsonl', 'w') as q:
        for rec in built:
            q.write(json.dumps({'id': rec['id'],
                                'sid': rec['sourceId'].replace('av-fs-', ''),
                                'start': rec['sourceStartSec'],
                                'dur': rec['durationSec']}) + '\n')
    print(f'BUILT {len(built)} clips', flush=True)


if __name__ == '__main__':
    main()
