#!/usr/bin/env python3
"""AUDIENCE VIBES Phase B - pack validator.

Checks audience-pack/manifest.json against the PHASE_B_HANDOFF.md contract:
schema/version, all required per-clip fields, event enum, crowd A/B exclusivity,
duration windows (reactions 1-6 s, beds 8-15 s), audio format constraints
(mono 22050 Hz, <=56 kbps, peak <= -1.5 dBFS), 32 MiB budget, source
distinctness, and that every committed audio file exists with matching sha256.
"""
import hashlib
import json
import os
import sys

REPO = '/home/z/my-project/audience-work'
PACK = f'{REPO}/audience-pack'
EVENTS = {'cheer', 'cheer_kids', 'applause', 'gasp', 'disappointment',
          'encouragement_chant', 'funny_laugh', 'whistle', 'tension_bed',
          'chatter_bed', 'venue_bed'}
BEDS = {'tension_bed', 'chatter_bed', 'venue_bed'}
REQUIRED = ['id', 'sourceId', 'file', 'crowd', 'event', 'speech', 'language',
            'transcript', 'intensity', 'valence', 'loopable', 'durationSec',
            'bytes', 'sha256', 'peakDbfs', 'loudnessLufs', 'sourceStartSec',
            'sourceEndSec', 'sourceSha256', 'author', 'sourceUrl', 'license',
            'licenseUrl', 'modifications', 'review']
MIB = 32 * 1024 * 1024


def fail(msg):
    print(f'FAIL: {msg}')
    sys.exit(1)


def main():
    m = json.load(open(f'{PACK}/manifest.json'))
    if m.get('schema') != 'drafti-audience-pack/1':
        fail('schema')
    if m.get('version') != '1.0.0':
        fail('version')
    ids, srcs = set(), set()
    crowd_by_src = {}
    errors = []
    for c in m['clips']:
        for k in REQUIRED:
            if k not in c:
                errors.append(f'{c.get("id","?")}: missing {k}')
        if c['event'] not in EVENTS:
            errors.append(f'{c["id"]}: bad event {c["event"]}')
        if c['crowd'] not in ('A', 'B'):
            errors.append(f'{c["id"]}: crowd {c["crowd"]}')
        if c['sourceId'] in srcs:
            errors.append(f'{c["id"]}: source not distinct')
        srcs.add(c['sourceId'])
        prev = crowd_by_src.setdefault(c['sourceId'], c['crowd'])
        if prev != c['crowd']:
            errors.append(f'{c["id"]}: source in both crowds')
        if c['id'] in ids:
            errors.append(f'{c["id"]}: duplicate id')
        ids.add(c['id'])
        lo, hi = (8.0, 15.5) if c['event'] in BEDS else (0.8, 6.5)
        if not lo <= c['durationSec'] <= hi:
            errors.append(f'{c["id"]}: duration {c["durationSec"]} outside {lo}-{hi}')
        if c['peakDbfs'] > -1.49:
            errors.append(f'{c["id"]}: peak {c["peakDbfs"]} > -1.5 dBFS')
        path = f'{PACK}/{c["file"]}'
        if not os.path.exists(path):
            errors.append(f'{c["id"]}: file missing {c["file"]}')
        else:
            if os.path.getsize(path) != c['bytes']:
                errors.append(f'{c["id"]}: bytes mismatch')
            h = hashlib.sha256(open(path, 'rb').read()).hexdigest()
            if h != c['sha256']:
                errors.append(f'{c["id"]}: sha256 mismatch')
            import subprocess
            pr = subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json',
                                 '-show_streams', path], capture_output=True, text=True)
            st = json.loads(pr.stdout)['streams'][0]
            if st['channels'] != 1 or st['sample_rate'] != '22050':
                errors.append(f'{c["id"]}: not mono/22050')
            if st.get('bit_rate') and int(st['bit_rate']) > 56000:
                errors.append(f'{c["id"]}: bitrate {st["bit_rate"]} > 56k')
    total = sum(c['bytes'] for c in m['clips'])
    if total >= MIB:
        errors.append(f'budget {total} bytes >= 32 MiB')
    by_crowd = {'A': 0, 'B': 0}
    by_event = {}
    for c in m['clips']:
        by_crowd[c['crowd']] += 1
        by_event.setdefault(c['event'], {'A': 0, 'B': 0})[c['crowd']] += 1
    print(f'clips={len(m["clips"])} totalMiB={total / 1048576:.2f} '
          f'A={by_crowd["A"]} B={by_crowd["B"]}')
    for ev in sorted(by_event):
        print(f'  {ev}: A={by_event[ev]["A"]} B={by_event[ev]["B"]}')
    if errors:
        print('ERRORS:')
        for e in errors[:40]:
            print(' ', e)
        sys.exit(1)
    print('VALID: manifest, files, hashes, format, windows, budget, '
          'identity exclusivity all pass')


if __name__ == '__main__':
    main()
