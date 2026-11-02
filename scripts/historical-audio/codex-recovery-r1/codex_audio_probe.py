#!/usr/bin/env python3
"""READ-ONLY probe: verify provenance of later_moments / later_hours in the
DRAFTI bank (branch codex/blueprint-progress @ cec7e5d).

1. Parse src/audio.manifest.js for target ids -> decode data URIs to /tmp.
2. Hash-compare decoded bytes vs the committed src/audio/*.mp3 files.
3. ffprobe durations/bitrate of decoded clips.
4. Compare durations with the TTS lookalike lines in the raw TTS dirs
   (th_n01 "A few moments later..." etc.) to show they are different audio.
Prints a compact evidence table. Touches nothing in the repo.
"""
import base64
import hashlib
import json
import pathlib
import re
import subprocess
import sys

REPO = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/drafti-clone')
MAN = REPO / 'src' / 'audio.manifest.js'
SRCA = REPO / 'src' / 'audio'
OUTD = pathlib.Path('/tmp/drafti_probe')
OUTD.mkdir(exist_ok=True)

TARGETS = ['later_moments', 'later_hours', 'th_n01', 'shrimp1', 'shrimp2',
           'v_retire1', 'v_retire2']

text = MAN.read_text(encoding='utf-8')


def md5(p: pathlib.Path) -> str:
    return hashlib.md5(p.read_bytes()).hexdigest()


def probe(p: pathlib.Path) -> dict:
    r = subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json',
                        '-show_format', str(p)], capture_output=True)
    fmt = json.loads(r.stdout or b'{}').get('format', {})
    return {'seconds': round(float(fmt.get('duration', 0)), 3),
            'bit_rate': fmt.get('bit_rate'), 'size': fmt.get('size')}


rows = []
for tid in TARGETS:
    m = re.search(r'^  ' + tid + r': \{ c: \'(\w+)\', b: \'([^\']*)\', d: \'data:audio/mpeg;base64,([^\']*)\' \},?\s*$',
                  text, re.M)
    if not m:
        rows.append({'id': tid, 'found': False})
        continue
    cat, credit, b64 = m.group(1), m.group(2), m.group(3)
    raw = base64.b64decode(b64)
    out = OUTD / (tid + '.mp3')
    out.write_bytes(raw)
    info = {'id': tid, 'found': True, 'category': cat,
            'bytes': len(raw), 'md5_bank': md5(out), 'credit': credit[:60]}
    info.update(probe(out))
    committed = SRCA / (tid + '.mp3')
    if committed.exists():
        info['md5_src_audio'] = md5(committed)
        info['match_src_audio'] = md5(committed) == info['md5_bank']
        info['src_audio_bytes'] = committed.stat().st_size
    rows.append(info)

for r in rows:
    print(json.dumps(r, ensure_ascii=False))

# --- raw TTS lookalikes in the workspace -----------------------------------
print('--- raw TTS takes (workspace, unprocessed):')
for raw_dir in sorted(pathlib.Path('/home/z/my-project/scripts').glob('tts_raw*')):
    for cand in sorted(raw_dir.glob('*.wav')):
        if any(k in cand.name for k in ('th_n01', 'th_n02', 'shrimp', 'retire', 'v_re')):
            print(json.dumps({'raw': str(cand), **probe(cand)}))
