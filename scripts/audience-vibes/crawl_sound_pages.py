#!/usr/bin/env python3
"""AUDIENCE VIBES Phase A - sound-page metadata crawler.

For every unique sound id in the search snapshot, fetches the freesound.org
sound page and extracts: license deed URL, description, tags, exact duration,
title. Resumable via av-data/sound_pages.json. Politeness: small thread pool
with jittered delays.
"""
import html as htmllib
import json
import os
import random
import re
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0'}
DATA = '/home/z/my-project/av-data'
HITS = f'{DATA}/search_hits.json'
OUT = f'{DATA}/sound_pages.json'
WORKERS = 6

DEED_RE = re.compile(r'href="(https?://creativecommons\.org/[^"]+)"[^>]*title="Go to the full license text"')
DESC_RE = re.compile(r'DescriptionSection">\s*<p>(.*?)</p>', re.S)
TAGS_RE = re.compile(r'href="/browse/tags/([^/"]+)/"')
DUR_RE = re.compile(r'data-duration="([\d.]+)"')
TITLE_RE = re.compile(r'property="og:title" content="([^"]+)"')
LOCK = threading.Lock()


def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            if attempt == retries - 1:
                return None
            time.sleep(1.2 * (attempt + 1))
    return None


def strip_html(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    s = htmllib.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()


def page_job(args):
    sid, user = args
    url = f'https://freesound.org/people/{user}/sounds/{sid}/'
    html = fetch(url)
    rec = {'page_url': url, 'http_status': 200 if html else 0}
    if html:
        deed = DEED_RE.search(html)
        desc = DESC_RE.search(html)
        dur = DUR_RE.search(html)
        ttl = TITLE_RE.search(html)
        rec.update({
            'deed_url': deed.group(1) if deed else None,
            'description': strip_html(desc.group(1))[:600] if desc else '',
            'tags': sorted({htmllib.unescape(t).lower() for t in TAGS_RE.findall(html)}),
            'duration_page': float(dur.group(1)) if dur else None,
            'title_page': htmllib.unescape(ttl.group(1)) if ttl else None,
        })
    with LOCK:
        pages = json.load(open(OUT))
        pages[sid] = rec
        json.dump(pages, open(OUT, 'w'))
    time.sleep(0.15 + random.random() * 0.25)
    return sid


def main():
    hits = json.load(open(HITS))
    pages = json.load(open(OUT)) if os.path.exists(OUT) else {}
    todo = [(sid, h['user']) for sid, h in hits['hits'].items() if sid not in pages]
    print(f'{len(pages)} already done, {len(todo)} to fetch', flush=True)
    done = 0
    with ThreadPoolExecutor(WORKERS) as ex:
        for _ in ex.map(page_job, todo):
            done += 1
            if done % 100 == 0:
                print(f'  {done}/{len(todo)}', flush=True)
    print('DONE sound pages:', done, flush=True)


if __name__ == '__main__':
    main()
