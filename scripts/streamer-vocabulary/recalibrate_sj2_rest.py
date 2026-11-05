#!/usr/bin/env python3
"""One-shot: recalibrate remaining Funny texts (sj2_079..sj2_100) to <=4 words
for kazi's word-pause delivery rate. Run once; check_sentences verifies after."""
import pathlib, re, json

BASE = pathlib.Path('/home/z/my-project/audience-work')
p = BASE / 'scripts/streamer-vocabulary/sentences.py'
s = p.read_text(encoding='utf8')
REWRITE = {
    'sj2_079': "The pieces bow!",
    'sj2_080': "Both sides blink!",
    'sj2_081': "Scoreboard diplomacy!",
    'sj2_082': "Scoreboard takes a nap!",
    'sj2_083': "Not jinxing anything!",
    'sj2_084': "Pieces are thinking!",
    'sj2_085': "Early birds salute!",
    'sj2_086': "Staying ready anyway!",
    'sj2_087': "Geometry of chaos!",
    'sj2_088': "Brave answers below!",
    'sj2_089': "First try, promise!",
    'sj2_090': "Bragging rights await!",
    'sj2_091': "The board listens. Probably!",
    'sj2_092': "Tap like, gently!",
    'sj2_093': "Friends deserve checkers!",
    'sj2_094': "Follow. Board happy!",
    'sj2_095': "Pick your adventure!",
    'sj2_096': "Like button takes compliments!",
    'sj2_097': "Jury is out!",
    'sj2_098': "Follow warms up!",
    'sj2_099': "Snacks ready, hearts steady!",
    'sj2_100': "The jokes continue!",
}
for sid, text in REWRITE.items():
    s, n = re.subn(r"(\('" + sid + r"', [^,]+, )\"[^\"]*\"",
                   lambda m, t=text: m.group(1) + '"' + t + '"', s, count=1)
    assert n == 1, f'pattern miss {sid}'
p.write_text(s, encoding='utf8')

st = json.load(open(BASE / 'scripts/streamer-vocabulary/state.json'))
for sid in REWRITE:
    raw = BASE / f'scripts/research_media/streamer_raw/{sid}.wav'
    raw.unlink(missing_ok=True)
    raw.with_suffix('.fade.wav').unlink(missing_ok=True)
    if st['clips'].setdefault(sid, {}).get('status') == 'failed':
        st['clips'][sid] = {'status': 'failed', 'takes': st['clips'][sid].get('takes', 0),
                            'error': 'retake: kazi word-pause recalibration'}
json.dump(st, open(BASE / 'scripts/streamer-vocabulary/state.json', 'w'), indent=1)
print(f'{len(REWRITE)} Funny texts recalibrated')
