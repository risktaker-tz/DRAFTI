#!/usr/bin/env python3
"""AUDIENCE VIBES Phase A - audio verification stage.

For each sound with a whitelisted license (from sound_pages.json): download the
HQ preview mp3 to /tmp/av_audio (kept OUT of git), verify HTTP 200 + real audio
via ffprobe, record exact duration/bytes/sha256, dedupe by sha256, and for
long sources (>40s) propose distinct excerpt windows from ffmpeg silence
detection (real boundaries from actual content).

Output: av-data/audio_evidence.json  {sound_id: record}
Resumable; raw audio stays in /tmp only (git never receives recordings).
"""
import hashlib
import json
import os
import re
import subprocess
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0'}
DATA = '/home/z/my-project/av-data'
TMP = '/tmp/av_audio'
OUT = f'{DATA}/audio_evidence.json'
WORKERS = 8
LOCK = threading.Lock()

LICENSE_WHITELIST = (
    'creativecommons.org/publicdomain/zero/1.0/',
    'creativecommons.org/licenses/by/4.0/',
    'creativecommons.org/licenses/by/3.0/',
    'creativecommons.org/licenses/by/2.0/',
    'creativecommons.org/licenses/by/2.5/',
    'creativecommons.org/licenses/by/1.0/',
)


def http_get(url, dest, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=90) as r:
                ctype = r.headers.get('Content-Type', '')
                data = r.read()
            if r.status != 200 or len(data) < 4096:
                return None, r.status, ctype, len(data)
            with open(dest, 'wb') as f:
                f.write(data)
            return data, r.status, ctype, len(data)
        except Exception:  # noqa: BLE001
            if attempt == retries - 1:
                return None, 0, '', 0
            time.sleep(1.5 * (attempt + 1))
    return None, 0, '', 0


def ffprobe(path):
    try:
        out = subprocess.run(
            ['ffprobe', '-v', 'error', '-print_format', 'json',
             '-show_format', '-show_streams', path],
            capture_output=True, text=True, timeout=60).stdout
        j = json.loads(out)
        fmt = j.get('format', {})
        streams = j.get('streams', [])
        if not streams or not fmt.get('duration'):
            return None
        return {
            'duration_sec': round(float(fmt['duration']), 3),
            'codec': streams[0].get('codec_name'),
            'sample_rate': streams[0].get('sample_rate'),
            'channels': streams[0].get('channels'),
            'bit_rate': fmt.get('bit_rate'),
        }
    except Exception:  # noqa: BLE001
        return None


def excerpt_windows(path, duration):
    """Up to 3 distinct windows from silence-segmented real content."""
    if duration <= 40:
        return []
    try:
        out = subprocess.run(
            ['ffmpeg', '-i', path, '-af', 'silencedetect=noise=-32dB:d=1.2',
             '-f', 'null', '-'], capture_output=True, text=True, timeout=120).stderr
    except Exception:  # noqa: BLE001
        return []
    ends = [float(m) for m in re.findall(r'silence_end: ([\d.]+)', out)]
    starts = [float(m) for m in re.findall(r'silence_start: ([\d.]+)', out)]
    bounds = [0.0]
    for s, e in zip(starts, [x for x in ends]):
        bounds += [s, e]
    bounds.append(duration)
    segs = [(bounds[i], bounds[i + 1]) for i in range(0, len(bounds) - 1, 2)]
    good = [(a, b) for a, b in segs if b - a >= 5.0]
    good.sort(key=lambda x: x[0])
    picks = []
    if good:
        idxs = [0]
        if len(good) >= 3:
            idxs += [len(good) // 2, len(good) - 1]
        elif len(good) == 2:
            idxs.append(1)
        for i in dict.fromkeys(idxs):
            a, b = good[i]
            picks.append({'start': round(a, 2), 'end': round(min(b, a + 20.0), 2),
                          'basis': 'ffmpeg silencedetect -32dB, real segment bounds'})
    return picks[:3]


def job(args):
    sid, hq_url = args
    dest = f'{TMP}/{sid}.mp3'
    data, status, ctype, nbytes = http_get(hq_url, dest)
    rec = {'audio_url': hq_url, 'http_status': status, 'content_type': ctype,
           'bytes': nbytes, 'sha256': None, 'ffprobe': None, 'excerpts': [],
           'ok': False, 'error': None}
    if data is None:
        rec['error'] = f'download failed status={status} bytes={nbytes}'
    else:
        fp = ffprobe(dest)
        rec['ffprobe'] = fp
        if not fp or fp['duration_sec'] < 0.8:
            rec['error'] = 'not valid audio or too short'
        else:
            rec['sha256'] = hashlib.sha256(data).hexdigest()
            rec['excerpts'] = excerpt_windows(dest, fp['duration_sec'])
            rec['ok'] = True
    if os.path.exists(dest) and not rec['ok']:
        os.remove(dest)
    with LOCK:
        allr = json.load(open(OUT))
        allr[sid] = rec
        json.dump(allr, open(OUT, 'w'))
    return sid, rec['ok']


def main():
    os.makedirs(TMP, exist_ok=True)
    pages = json.load(open(f'{DATA}/sound_pages.json'))
    hits = json.load(open(f'{DATA}/search_hits.json'))['hits']
    evid = json.load(open(OUT)) if os.path.exists(OUT) else {}
    todo = []
    for sid, p in pages.items():
        if sid in evid or not p.get('deed_url'):
            continue
        if not any(w in p['deed_url'] for w in LICENSE_WHITELIST):
            evid[sid] = {'ok': False, 'error': f"license not whitelisted: {p['deed_url']}"}
            continue
        todo.append((sid, hits[sid]['hq_url']))
    json.dump(evid, open(OUT, 'w'))
    print(f'{len(todo)} audio files to download/verify', flush=True)
    ok = bad = 0
    with ThreadPoolExecutor(WORKERS) as ex:
        for sid, good in ex.map(job, todo):
            ok += good
            bad += not good
            if (ok + bad) % 100 == 0:
                print(f'  {ok+bad}/{len(todo)} ok={ok} bad={bad}', flush=True)
    print(f'DONE ok={ok} bad={bad}', flush=True)


if __name__ == '__main__':
    main()
