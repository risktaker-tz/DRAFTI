#!/usr/bin/env python3
"""AUDIENCE VIBES Phase B - raw preview downloader v2 (stall-proof).

Same contract as v1: read docs/audience-vibes/download-manifest.json, fetch
every pinned raw preview into scripts/research_media/audience_raw/<sid>.mp3,
verify size + sha256, resumable. v2 adds: 90 s socket timeout, per-file
wall-clock alarm (240 s), progress logging every 25 files, 8 workers.
"""
import hashlib
import json
import multiprocessing
import os
import signal
import socket
import time
import urllib.request

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0'}
REPO = '/home/z/my-project/audience-work'
RAW = f'{REPO}/scripts/research_media/audience_raw'
MANIFEST = f'{REPO}/docs/audience-vibes/download-manifest.json'
PROGRESS = f'{REPO}/scripts/research_media/phaseb_state/download_progress.json'
WORKERS = 8
COUNT = {'done': 0, 'failed': 0, 'reused': 0, 'retries': 0}


class Deadline(Exception):
    pass


def _alarm(sig, frame):
    raise Deadline()


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def download(item):
    """Worker runs in its own process: signal.alarm is allowed here."""
    sid = item['id'].replace('av-fs-', '')
    dest = f'{RAW}/{sid}.mp3'
    want_sha, want_bytes = item['sha256_preview_bytes'], item['bytes']
    if os.path.exists(dest) and os.path.getsize(dest) == want_bytes:
        if sha256_file(dest) == want_sha:
            return sid, 'reused'
        os.remove(dest)
    signal.signal(signal.SIGALRM, _alarm)
    for attempt in range(3):
        signal.alarm(240)
        try:
            socket.setdefaulttimeout(90)
            req = urllib.request.Request(item['audio_url'], headers=UA)
            with urllib.request.urlopen(req, timeout=90) as r:
                chunks = []
                while True:
                    c = r.read(1 << 18)
                    if not c:
                        break
                    chunks.append(c)
            data = b''.join(chunks)
            signal.alarm(0)
            if len(data) != want_bytes:
                raise IOError(f'size {len(data)} != pinned {want_bytes}')
            got = hashlib.sha256(data).hexdigest()
            if got != want_sha:
                raise IOError(f'sha mismatch {got[:12]} != {want_sha[:12]}')
            tmp = dest + '.part'
            with open(tmp, 'wb') as f:
                f.write(data)
            os.replace(tmp, dest)
            return sid, 'downloaded'
        except Exception as e:  # noqa: BLE001
            signal.alarm(0)
            if attempt == 2:
                return sid, f'FAILED: {str(e)[:150]}'
            time.sleep(2 * (attempt + 1))


def main():
    multiprocessing.set_start_method('fork', force=True)
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(os.path.dirname(PROGRESS), exist_ok=True)
    items = sorted(json.load(open(MANIFEST))['items'],
                   key=lambda i: i['duration_sec'])
    t0 = time.time()
    print(f'{len(items)} pinned raw files -> {RAW}', flush=True)
    results = {}
    with multiprocessing.Pool(WORKERS) as pool:
        for sid, status in pool.imap_unordered(download, items, chunksize=1):
            results[sid] = status
            n = len(results)
            if n % 25 == 0:
                for k in COUNT:
                    COUNT[k] = sum(1 for v in results.values()
                                   if v == ('downloaded' if k == 'done' else
                                            'reused' if k == 'reused' else
                                            v.startswith('FAILED') if k == 'failed'
                                            else False))
                json.dump({'state': COUNT}, open(PROGRESS, 'w'))
                rate = n / max(1e-9, time.time() - t0) * 60
                print(f'  {n}/{len(items)} done={COUNT["done"]} '
                      f'reused={COUNT["reused"]} fail={COUNT["failed"]} '
                      f'({rate:.0f}/min)', flush=True)
    json.dump({'state': COUNT, 'results': results}, open(PROGRESS, 'w'))
    done = sum(1 for v in results.values() if v == 'downloaded')
    reused = sum(1 for v in results.values() if v == 'reused')
    failed = sum(1 for v in results.values() if v.startswith('FAILED'))
    print(f'DONE in {(time.time() - t0) / 60:.1f} min '
          f'downloaded={done} reused={reused} failed={failed}', flush=True)
    bad = {s: r for s, r in results.items() if r.startswith('FAILED')}
    if bad:
        print('FAILURES:', json.dumps(bad, indent=1), flush=True)


if __name__ == '__main__':
    main()
