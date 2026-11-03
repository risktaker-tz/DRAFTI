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

STATE = '/home/z/my-project/audience-work/audience-pack/review_state'
RAW = '/home/z/my-project/audience-work/scripts/research_media/audience_raw'
OUT = f'{STATE}/transcripts.json'
WORKERS = 1  # ASR quota resets only after minutes of quiet; 1 caller, >=12 s gaps
BED_EVENTS = {'chatter_bed', 'venue_bed', 'tension_bed'}
NONVERBAL_SAMPLE_EVERY = 7  # spot-check 1-in-7 metadata-nonverbal reactions
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
    time.sleep(max(20.0, min(gap, 8)))
    return q['id'], rec.get('ok', False) if rec else False


def main():
    global TRANSCRIPTS
    TRANSCRIPTS = json.load(open(OUT)) if os.path.exists(OUT) else {}
    queue = [json.loads(l) for l in open(f'{STATE}/asr_queue.jsonl') if l.strip()]
    clips = {f[:-5]: json.load(open(f'{STATE}/clips/{f}'))
             for f in os.listdir(f'{STATE}/clips')}
    todo = [q for q in queue if q['id'] not in TRANSCRIPTS]
    # Priority within the rate-limit budget: metadata-speech windows first
    # ("ASR all possible speech"), then beds (ad/announcer risk), then a 1-in-7
    # spot-check sample of metadata-nonverbal reactions; the rest are reviewed
    # by metadata screen + acoustic measurement only (recorded in the ledger).
    speech = [q for q in todo if clips.get(q['sid'], {}).get('windowSpeechFlag')]
    beds = [q for q in todo if not clips.get(q['sid'], {}).get('windowSpeechFlag')
            and clips.get(q['sid'], {}).get('catalogEvent') in BED_EVENTS]
    nonverbal = [q for q in todo if q not in speech and q not in beds]
    sample = nonverbal[::NONVERBAL_SAMPLE_EVERY]
    skipped = len(nonverbal) - len(sample)
    ordered = speech + beds + sample
    json.dump({'speechFlagged': len(speech), 'beds': len(beds),
               'nonverbalSampled': len(sample),
               'nonverbalSkippedBySampling': skipped,
               'sampleEvery': NONVERBAL_SAMPLE_EVERY},
              open(f'{STATE}/asr_sample_plan.json', 'w'), indent=1)
    print(f'{len(TRANSCRIPTS)} already done; priority queue: '
          f'speech={len(speech)} beds={len(beds)} sample={len(sample)} '
          f'nonverbal-skipped={skipped}', flush=True)
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
