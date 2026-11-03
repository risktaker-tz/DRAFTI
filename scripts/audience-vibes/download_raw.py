#!/usr/bin/env python3
"""AUDIENCE VIBES Phase B - raw preview downloader.

Reads the committed checksum-pinned docs/audience-vibes/download-manifest.json
and downloads every raw HQ preview into git-ignored durable storage
scripts/research_media/audience_raw/<soundid>.mp3. Resumable: files whose
sha256/size already match the manifest pins are skipped. Shortest files first
so reaction clips become reviewable while long beds download.
"""
import hashlib
import json
import os
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0'}
REPO = '/home/z/my-project/audience-work'
RAW = f'{REPO}/scripts/research_media/audience_raw'
MANIFEST = f'{REPO}/docs/audience-vibes/download-manifest.json'
PROGRESS = '/home/z/my-project/av-data/phaseb_download_progress.json'
WORKERS = 6
LOCK = threading.Lock()
STATE = {'done': 0, 'failed': 0, 'reused': 0}


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def download(item):
    sid = item['id'].replace('av-fs-', '')
    dest = f'{RAW}/{sid}.mp3'
    want_sha, want_bytes = item['sha256_preview_bytes'], item['bytes']
    if os.path.exists(dest) and os.path.getsize(dest) == want_bytes:
        if sha256_file(dest) == want_sha:
            with LOCK:
                STATE['reused'] += 1
            return sid, 'reused'
        os.remove(dest)
    for attempt in range(4):
        try:
            req = urllib.request.Request(item['audio_url'], headers=UA)
            with urllib.request.urlopen(req, timeout=300) as r:
                data = r.read()
            if len(data) != want_bytes:
                raise IOError(f'size {len(data)} != pinned {want_bytes}')
            got = hashlib.sha256(data).hexdigest()
            if got != want_sha:
                raise IOError(f'sha mismatch {got[:12]} != {want_sha[:12]}')
            tmp = dest + '.part'
            with open(tmp, 'wb') as f:
                f.write(data)
            os.replace(tmp, dest)
            with LOCK:
                STATE['done'] += 1
            return sid, 'downloaded'
        except Exception as e:  # noqa: BLE001
            if attempt == 3:
                with LOCK:
                    STATE['failed'] += 1
                return sid, f'FAILED: {e}'
            time.sleep(2 * (attempt + 1))


def main():
    os.makedirs(RAW, exist_ok=True)
    items = sorted(json.load(open(MANIFEST))['items'],
                   key=lambda i: i['duration_sec'])
    print(f'{len(items)} pinned raw files, target {RAW}', flush=True)
    results = {}
    with ThreadPoolExecutor(WORKERS) as ex:
        for sid, status in ex.map(download, items):
            results[sid] = status
            n = STATE['done'] + STATE['reused'] + STATE['failed']
            if n % 50 == 0:
                json.dump({'state': STATE, 'results': results}, open(PROGRESS, 'w'))
                print(f'  {n}/{len(items)} done={STATE["done"]} '
                      f'reused={STATE["reused"]} failed={STATE["failed"]}', flush=True)
    json.dump({'state': STATE, 'results': results}, open(PROGRESS, 'w'))
    print(f'DONE done={STATE["done"]} reused={STATE["reused"]} '
          f'failed={STATE["failed"]}', flush=True)
    bad = {s: r for s, r in results.items() if r.startswith('FAILED')}
    if bad:
        print('FAILURES:', json.dumps(bad, indent=1), flush=True)


if __name__ == '__main__':
    main()
