#!/usr/bin/env python3
"""AUDIENCE VIBES Phase B - ASR batch runner (z-ai CLI, rate-limit aware).

Reads av-data/phaseb/asr_queue.jsonl ({id, sid, start, dur}), extracts each
window as 16 kHz mono WAV, calls `z-ai asr` with adaptive backoff
(429/rate failures trigger exponentially growing quiet gaps), writes
av-data/phaseb/transcripts.json {id: {ok, text|error}}. Resumable.
"""
import json
import os
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor

STATE = '/home/z/my-project/av-data/phaseb'
RAW = '/home/z/my-project/audience-work/scripts/research_media/audience_raw'
OUT = f'{STATE}/transcripts.json'
WORKERS = 2
LOCK = threading.Lock()
TRANSCRIPTS = {}
BACKOFF = {'gap': 1.0}


def job(q):
    raw = f'{RAW}/{q["sid"]}.mp3'
    wav = f'/tmp/avpb_asr/{q["id"]}.wav'
    res_json = f'/tmp/avpb_asr/{q["id"]}.json'
    rec = None
    for attempt in range(6):
        try:
            os.makedirs('/tmp/avpb_asr', exist_ok=True)
            r = subprocess.run(['ffmpeg', '-y', '-ss', str(q['start']), '-t', str(q['dur']),
                                '-i', raw, '-ac', '1', '-ar', '16000',
                                '-c:a', 'pcm_s16le', wav],
                               capture_output=True, timeout=120)
            if r.returncode != 0:
                raise IOError('extract failed')
            r = subprocess.run(['z-ai', 'asr', '--file', wav, '-o', res_json],
                               capture_output=True, text=True, timeout=180)
            if r.returncode != 0 or not os.path.exists(res_json):
                blob = (r.stderr or r.stdout or '')
                raise IOError(f'asr failed: {blob[-150:]}')
            data = json.load(open(res_json))
            text = (data.get('text') or data.get('result') or
                    (data if isinstance(data, str) else '')) or ''
            rec = {'ok': True, 'text': str(text).strip()[:600]}
            break
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            rec = {'ok': False, 'error': msg[:200]}
            if attempt == 5:
                break
            with LOCK:
                if '429' in msg or 'rate' in msg.lower() or 'quota' in msg.lower():
                    BACKOFF['gap'] = min(BACKOFF['gap'] * 1.6 + 2, 60)
                else:
                    BACKOFF['gap'] = max(BACKOFF['gap'] * 0.7, 1)
                gap = BACKOFF['gap']
            time.sleep(gap)
    for p in (wav, res_json):
        if os.path.exists(p):
            os.remove(p)
    with LOCK:
        TRANSCRIPTS[q['id']] = rec
        ok_gap = 1.0 if rec.get('ok') else BACKOFF['gap']
        BACKOFF['gap'] = max(ok_gap, BACKOFF['gap'] * 0.9)
        gap = max(BACKOFF['gap'], 0.5)
    time.sleep(min(gap, 8))
    return q['id'], rec.get('ok', False) if rec else False


def main():
    global TRANSCRIPTS
    TRANSCRIPTS = json.load(open(OUT)) if os.path.exists(OUT) else {}
    queue = [json.loads(l) for l in open(f'{STATE}/asr_queue.jsonl') if l.strip()]
    todo = [q for q in queue if q['id'] not in TRANSCRIPTS]
    print(f'{len(TRANSCRIPTS)} already done, {len(todo)} to ASR', flush=True)
    ok = bad = 0
    with ThreadPoolExecutor(WORKERS) as ex:
        for i, (qid, good) in enumerate(ex.map(job, todo), 1):
            ok += good
            bad += not good
            if i % 25 == 0:
                json.dump(TRANSCRIPTS, open(OUT, 'w'))
                print(f'  {i}/{len(todo)} ok={ok} bad={bad} gap={BACKOFF["gap"]:.1f}',
                      flush=True)
    json.dump(TRANSCRIPTS, open(OUT, 'w'))
    print(f'ASR DONE ok={ok} bad={bad} total={len(TRANSCRIPTS)}', flush=True)


if __name__ == '__main__':
    main()
