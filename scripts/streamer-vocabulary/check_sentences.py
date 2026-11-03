#!/usr/bin/env python3
"""Static sanity checks over sentences.py before any synthesis."""
import re, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from sentences import records, GROUPS

REQUIRED_GROUPS = set(GROUPS)  # every voice must cover every documented situation

BANNED = [
    r'i\s+knew', r'i\s+told\s+you', r'what\s+i\s+was\s+thinking', r'as\s+i\s+predicted',
    r'predicted', r'donation', r'\d+\s*viewers', r'viewers?\s+(are|watching)', r'we\s+have\s+\d+',
    r'first\s+blood', r'\bhe\s+|\bshe\s+', r'\bhis\s+piece|\bher\s+piece', r'my\s+strategy',
    r'chat\s+(says|wrote)', r'i\s+see\s+(a|the)\s+comment', r'just\s+(joined|subscribed)',
    r'stream\s+is\s+ending', r'wrapping\s+up\s+the\s+stream', r'\d+\s*[-–]\s*\d+',
    r'subscribe',
]

def norm(t):
    return re.sub(r'[^a-z0-9 ]', '', t.lower()).strip()

all_recs = list(records())
by_voice = {}
for r in all_recs:
    by_voice.setdefault(r['voice'], []).append(r)

ok = True
for voice, recs in by_voice.items():
    texts = [norm(r['text']) for r in recs]
    dup = len(texts) - len(set(texts))
    ids = [r['id'] for r in recs]
    groups = {r['role'] for r in recs}
    missing = REQUIRED_GROUPS - groups
    print(f'{voice}: {len(recs)} sentences, {dup} duplicate texts, '
          f'{len(set(ids))} unique ids, missing groups: {sorted(missing) or "none"}')
    if len(recs) != 100 or dup or len(set(ids)) != 100 or missing:
        ok = False

cross = sum(1 for i, a in enumerate(all_recs) for b in all_recs[i+1:]
            if norm(a['text']) == norm(b['text']))
print('cross-voice duplicate texts:', cross)
ok = ok and cross == 0

for r in all_recs:
    low = ' ' + norm(r['text']) + ' '
    for pat in BANNED:
        if re.search(pat, low):
            print(f'BANNED PATTERN {pat!r} in {r["id"]}: {r["text"]}')
            ok = False
    words = len(r['text'].split())
    if words > 16:
        print(f'LONG ({words} words) {r["id"]}: {r["text"]}')
        ok = False
print('ALL OK' if ok else 'PROBLEMS FOUND')
sys.exit(0 if ok else 1)
