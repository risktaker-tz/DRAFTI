#!/usr/bin/env python3
"""AUDIENCE VIBES Phase A - validator.

Machine-checks docs/audience-vibes/source-catalog.json against every Phase-A
requirement. Prints an honest PASS/FAIL report; exits nonzero on any FAIL.
Run from repo root: python3 scripts/audience-vibes/validate_catalog.py
"""
import json
import re
import sys
from collections import Counter
from urllib.parse import urlparse

REQUIRED_FIELDS = [
    'id', 'title', 'author', 'author_page', 'source_page', 'audio_url',
    'audio_url_type', 'license', 'license_evidence_url', 'duration_sec', 'bytes',
    'sha256', 'crowd_identity_suggestion', 'identity_basis', 'event',
    'side_affinity', 'valence', 'intensity', 'phase', 'loopable', 'speech',
    'speech_language', 'speech_content', 'cooldown_sec', 'max_per_minute',
    'excerpt_windows', 'verified', 'review_status', 'source_description', 'tags',
]
LICENSE_OK = {'CC0 1.0 Universal', 'CC BY 4.0', 'CC BY 3.0', 'CC BY 2.5',
              'CC BY 2.0', 'CC BY 1.0'}
EVENTS_OK = {'cheer', 'cheer_kids', 'applause', 'gasp', 'disappointment',
             'encouragement_chant', 'funny_laugh', 'whistle', 'tension_bed',
             'chatter_bed', 'venue_bed'}


def fail(msg, errs):
    errs.append(msg)


def main():
    base = 'docs/audience-vibes'
    cat = json.load(open(f'{base}/source-catalog.json'))
    man = json.load(open(f'{base}/download-manifest.json'))
    vlog = json.load(open(f'{base}/evidence/verification-log.json'))
    ledger = json.load(open(f'{base}/search-ledger.json'))
    entries = cat['entries']
    errs = []

    n = len(entries)
    print(f'verified entries: {n}')
    if n < 501:
        fail(f'need >=501 verified entries, have {n}', errs)

    ids, shas, ut = set(), set(), set()
    for e in entries:
        for f in REQUIRED_FIELDS:
            if f not in e:
                fail(f'{e.get("id","?")}: missing field {f}', errs)
        if e['id'] in ids:
            fail(f'duplicate id {e["id"]}', errs)
        ids.add(e['id'])
        if not re.fullmatch(r'av-fs-\d+', e['id']):
            fail(f'{e["id"]}: id not in stable av-fs-<soundid> form', errs)
        if e['sha256'] in shas:
            fail(f'{e["id"]}: duplicate sha256 (identical audio twice)', errs)
        shas.add(e['sha256'])
        key = (e['author'].lower(), re.sub(r'\s+', ' ', e['title'].lower()).strip())
        if key in ut:
            fail(f'{e["id"]}: duplicate author+title', errs)
        ut.add(key)
        if e['license'] not in LICENSE_OK:
            fail(f'{e["id"]}: license {e["license"]} not in whitelist', errs)
        deed = e['license_evidence_url']
        if 'creativecommons.org' not in urlparse(deed).netloc:
            fail(f'{e["id"]}: license evidence not a CC deed URL', errs)
        if 'creativecommons.org/publicdomain/zero' not in deed.lower() and \
           '/licenses/by/' not in deed.lower():
            fail(f'{e["id"]}: deed is not CC0/CC-BY', errs)
        sp, au = e['source_page'], e['audio_url']
        if not sp.startswith('https://freesound.org/people/') or '/sounds/' not in sp:
            fail(f'{e["id"]}: source_page not a freesound sound page', errs)
        sid_from_page = re.search(r'/sounds/(\d+)/', sp).group(1)
        if e['id'] != f'av-fs-{sid_from_page}':
            fail(f'{e["id"]}: id/source_page mismatch', errs)
        if not au.startswith('https://cdn.freesound.org/previews/'):
            fail(f'{e["id"]}: audio_url not a freesound CDN preview', errs)
        if sid_from_page not in au:
            fail(f'{e["id"]}: audio_url does not embed the sound id', errs)
        if e['duration_sec'] < 1.0:
            fail(f'{e["id"]}: duration < 1s', errs)
        for w in e['excerpt_windows']:
            if not (0 <= w['start'] < w['end'] <= e['duration_sec'] + 0.05):
                fail(f'{e["id"]}: bad excerpt window {w}', errs)
            if (w['end'] - w['start'] < 3.0
                    and 'whole short clip' not in w['basis']):
                fail(f'{e["id"]}: derived excerpt window <3s {w}', errs)
        if e['event'] not in EVENTS_OK:
            fail(f'{e["id"]}: unknown event {e["event"]}', errs)
        if e['valence'] not in {'positive', 'negative', 'neutral'}:
            fail(f'{e["id"]}: bad valence', errs)
        if e['intensity'] not in {'low', 'medium', 'high'}:
            fail(f'{e["id"]}: bad intensity', errs)
        if e['crowd_identity_suggestion'] not in {'A', 'B', 'either'}:
            fail(f'{e["id"]}: bad identity', errs)
        if not e['review_status'].startswith('auto-verified'):
            fail(f'{e["id"]}: review_status must be honest auto-verified marker', errs)
        if e['speech'] and e['speech_content'].strip() == '':
            fail(f'{e["id"]}: speech=True without words/description', errs)
        v = vlog['entries'].get(e['id'])
        if not v or v['sha256'] != e['sha256'] or v['bytes'] != e['bytes'] \
                or v['http_status'] != 200:
            fail(f'{e["id"]}: verification-log mismatch', errs)

    man_ids = {i['id'] for i in man['items']}
    if man_ids != ids:
        fail(f'manifest/catalog id mismatch (manifest {len(man_ids)})', errs)
    led_verified = {s for s, r in ledger['ledger'].items() if r['status'] == 'verified'}
    if led_verified != {i[6:] for i in ids}:
        fail('ledger verified set != catalog ids', errs)

    ident = Counter(e['crowd_identity_suggestion'] for e in entries)
    events = Counter(e['event'] for e in entries)
    lic = Counter(e['license'] for e in entries)
    speech = Counter(e['speech'] for e in entries)
    langs = Counter(e['speech_language'].split(' ')[0] for e in entries)
    inten = Counter(e['intensity'] for e in entries)
    beds = sum(events[k] for k in ('chatter_bed', 'venue_bed'))
    print('identity:', dict(ident))
    print('events:', dict(events))
    print('licenses:', dict(lic))
    print('speech:', dict(speech))
    print('language-first-token:', dict(langs))
    print('intensity:', dict(inten))
    print(f'loop beds: {beds}')
    if ident.get('A', 0) + ident.get('either', 0) < 100 or \
       ident.get('B', 0) + ident.get('either', 0) < 100:
        fail('identity coverage too thin: need A/B banks (either counts for both)', errs)
    for needed in ('cheer', 'applause', 'gasp', 'disappointment',
                   'encouragement_chant', 'funny_laugh', 'chatter_bed', 'venue_bed'):
        if events.get(needed, 0) < 10:
            fail(f'event coverage thin: {needed}={events.get(needed, 0)} (<10)', errs)
    if speech.get(True, 0) < 20:
        fail('need >=20 speech-flagged clips for voices/encouragement', errs)
    if beds < 30:
        fail('need >=30 loopable chatter/venue beds', errs)

    print()
    if errs:
        print(f'FAIL ({len(errs)} problems):')
        for m in errs[:40]:
            print(' -', m)
        sys.exit(1)
    print('PASS: all Phase-A validation checks OK '
          f'({n} verified distinct recordings, honest ledger of {ledger["raw_search_hits"]} raw hits)')


if __name__ == '__main__':
    main()
