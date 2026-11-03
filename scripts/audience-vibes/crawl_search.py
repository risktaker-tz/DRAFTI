#!/usr/bin/env python3
"""AUDIENCE VIBES Phase A - search-phase crawler.

Crawls freesound.org search result pages (license-filtered) and collects raw
search hits: sound id, uploader, title, preview URLs, duration, matching
queries and category. Output is a raw snapshot (search hits only - NOT the
verified catalog). Resumable: already-fetched (query,license,page) tuples are
skipped, results are merged into the snapshot.
"""
import html as htmllib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0'}
OUT = '/home/z/my-project/av-data/search_hits.json'
LICENSES = {'CC0': 'Creative Commons 0', 'CC-BY': 'Attribution'}

# category -> queries
QUERIES = {
    'cheer': ['crowd cheer', 'crowd cheering goal', 'crowd roar', 'crowd celebration'],
    'applause': ['audience applause', 'crowd applause', 'crowd clapping', 'theater applause'],
    'gasp': ['crowd gasp', 'audience gasp', 'crowd ooh', 'crowd wow'],
    'disappointment': ['crowd boo', 'crowd aww', 'crowd disappointment', 'crowd oh no'],
    'chant': ['crowd chant', 'crowd come on', 'fans chanting', 'crowd go team'],
    'chatter': ['crowd chatter', 'crowd murmur', 'crowd walla', 'crowd talking',
                'crowd ambient', 'cafe crowd ambience'],
    'children': ['children cheering', 'kids cheer', 'crowd giggle', 'children excited'],
    'laugh': ['audience laugh', 'crowd laugh'],
    'whistle': ['crowd whistle', 'stadium whistle'],
    'tension': ['crowd tense', 'crowd suspense', 'crowd anticipation', 'crowd sigh'],
    'venue_b': ['stadium crowd ambience', 'arena crowd', 'auditorium ambience'],
    'venue_a': ['market crowd', 'street crowd', 'village crowd'],
    'misc': ['crowd screaming excited', 'crowd excited', 'crowd yay'],
}
MAX_PAGES = 4


def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            if attempt == retries - 1:
                print(f'  FAIL {url[:90]} {e}', flush=True)
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def parse_search(html):
    hits = []
    # each result block starts at a bw-player div
    for m in re.finditer(r'data-sound-id="(\d+)"', html):
        sid = m.group(1)
        seg = html[m.start():m.start() + 4000]
        um = re.search(r'data-username="([^"]+)"', seg)
        mm = re.search(r'data-mp3="([^"]+)"', seg)
        dm = re.search(r'data-duration="([\d.]+)"', seg)
        tm = re.search(r'aria-label="Sound ([^"]+) by', html[max(0, m.start() - 600):m.start() + 500])
        if not (um and mm):
            continue
        lq = mm.group(1)
        hits.append({
            'sound_id': sid,
            'user': um.group(1),
            'title': htmllib.unescape(tm.group(1)) if tm else '',
            'lq_url': lq,
            'hq_url': lq.replace('-lq.mp3', '-hq.mp3'),
            'duration_search': float(dm.group(1)) if dm else None,
        })
    return hits


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    snap = {'fetched': [], 'hits': {}}
    if os.path.exists(OUT):
        snap = json.load(open(OUT))
    done = set(map(tuple, snap['fetched']))

    for cat, queries in QUERIES.items():
        for query in queries:
            for lic_key, lic_name in LICENSES.items():
                for page in range(1, MAX_PAGES + 1):
                    key = [query, lic_key, page]
                    if tuple(key) in done:
                        continue
                    f = (f'license:"{urllib.parse.quote(lic_name)}"'
                         if lic_key else '')
                    url = (f'https://freesound.org/search/?q={urllib.parse.quote(query)}'
                           f'&f={f}&p={page}')
                    html = fetch(url)
                    if html is None:
                        continue
                    hits = parse_search(html)
                    ids = {h['sound_id'] for h in hits}
                    new_to_page = len(ids - {h['sound_id'] for h in
                                             snap['hits'].values()
                                             if any(k[0] == query for k in h['queries'])})
                    for h in hits:
                        rec = snap['hits'].setdefault(h['sound_id'], {**h, 'queries': [],
                                                                      'categories': []})
                        rec['duration_search'] = rec.get('duration_search') or h['duration_search']
                        qtag = f'{query}|{lic_key}|{cat}'
                        if qtag not in rec['queries']:
                            rec['queries'].append(qtag)
                        if cat not in rec['categories']:
                            rec['categories'].append(cat)
                    snap['fetched'].append(key)
                    print(f'[{query}|{lic_key}|p{page}] {len(hits)} hits '
                          f'({new_to_page} new-to-query) total={len(snap["hits"])}', flush=True)
                    if page == 1 and not hits:
                        break  # query empty, no deeper pages
                    if len(hits) < 15:
                        break  # last page
                    time.sleep(0.25)
                    json.dump(snap, open(OUT, 'w'))
    json.dump(snap, open(OUT, 'w'))
    print('DONE unique hits:', len(snap['hits']), flush=True)


if __name__ == '__main__':
    main()
