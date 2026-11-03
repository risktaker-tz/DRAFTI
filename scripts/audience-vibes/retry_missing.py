#!/usr/bin/env python3
"""Retry the few biggest pinned raw files that missed the 240 s deadline.
Same pins as download_raw.py, 900 s per-attempt wall clock, 2 workers."""
import hashlib
import json
import multiprocessing
import os
import signal
import socket
import time
import urllib.request

REPO = '/home/z/my-project/audience-work'
RAW = f'{REPO}/scripts/research_media/audience_raw'
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0'}


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
    sid = item['id'].replace('av-fs-', '')
    dest = f'{RAW}/{sid}.mp3'
    want_sha, want_bytes = item['sha256_preview_bytes'], item['bytes']
    if os.path.exists(dest) and os.path.getsize(dest) == want_bytes:
        return sid, 'reused'
    signal.signal(signal.SIGALRM, _alarm)
    for attempt in range(3):
        signal.alarm(900)
        try:
            socket.setdefaulttimeout(120)
            req = urllib.request.Request(item['audio_url'], headers=UA)
            with urllib.request.urlopen(req, timeout=120) as r:
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
            if hashlib.sha256(data).hexdigest() != want_sha:
                raise IOError('sha mismatch')
            with open(dest + '.part', 'wb') as f:
                f.write(data)
            os.replace(dest + '.part', dest)
            return sid, 'downloaded'
        except Exception as e:  # noqa: BLE001
            signal.alarm(0)
            if attempt == 2:
                return sid, f'FAILED: {str(e)[:150]}'
            time.sleep(5)


def main():
    multiprocessing.set_start_method('fork', force=True)
    items = [i for i in json.load(open(f'{REPO}/docs/audience-vibes/download-manifest.json'))['items']
             if not os.path.exists(f'{RAW}/{i["id"].replace("av-fs-", "")}.mp3')]
    print(f'{len(items)} missing raw files to retry (900 s deadline)', flush=True)
    with multiprocessing.Pool(2) as pool:
        for sid, status in pool.imap_unordered(download, items, chunksize=1):
            print(f'  {sid}: {status}', flush=True)


if __name__ == '__main__':
    main()
