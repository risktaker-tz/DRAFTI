#!/usr/bin/env python3
"""One-shot: shorten Funny sentences whose measured takes exceeded 6 s
(kazi delivers some lines at 0.7-0.9 s/word). Keeps ids, roles, predicates;
only the verbatim text changes. Also clears the stale over-length raw takes
and marks those sentences failed so the retry loop regenerates them."""
import json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SENT = HERE / 'sentences.py'
RAW = ROOT / 'scripts' / 'research_media' / 'streamer_raw'

REWRITE = {
    'sj2_004': "A piece plans an early retirement!",
    'sj2_005': "Fresh bout — legal jumps, zero refunds!",
    'sj2_007': "The pieces practiced all night... allegedly.",
    'sj2_008': "The board said no pressure. It lied!",
    'sj2_011': "New opponent — unknown style, maximum chaos!",
    'sj2_016': "No winner last time — sequel time!",
    'sj2_018': "Season rollover — same beautiful chaos!",
    'sj2_019': "New season — last season's scoreboard sighs!",
    'sj2_020': "Dreams are free — kings are earned!",
    'sj2_022': "Quarter-finals — hearts racing, board unbothered!",
    'sj2_024': "Semi-finals — one step from glory!",
    'sj2_025': "Drama included at no extra cost!",
    'sj2_027': "Grand final — popcorn time!",
    'sj2_028': "The crown is here — finders keepers!",
    'sj2_035': "The move is elegant — not me!",
    'sj2_036': "The sneaky ones are the best!",
    'sj2_037': "One piece off — board lost weight!",
    'sj2_040': "One capture — clean, polite, civilized!",
    'sj2_041': "No farewell party for that piece!",
    'sj2_043': "Double capture — two pieces, zero apologies!",
    'sj2_044': "Off they go like late buses!",
    'sj2_046': "Somebody skipped breakfast for this!",
    'sj2_057': "The others pretend not to be jealous!",
    'sj2_059': "Deep breath, then magic!",
    'sj2_062': "Material down, humor intact!",
    'sj2_063': "The report flipped like pancakes!",
    'sj2_064': "From behind to superb bounce-back!",
    'sj2_069': "That piece is a souvenir now!",
    'sj2_070': "Even I saw that trap coming!",
    'sj2_074': "That spirit pays the bills!",
}

src = SENT.read_text(encoding='utf8')
changed = 0
for sid, text in REWRITE.items():
    pat = re.compile(r"(\('" + sid + r"', [^,]+, )\"(?:[^\"]*)\"")
    new_src, n = pat.subn(lambda m: m.group(1) + '"' + text + '"', src, count=1)
    if n != 1:
        print(f'PATTERN MISS for {sid}')
        sys.exit(1)
    src = new_src
    changed += 1
SENT.write_text(src, encoding='utf8')
print(f'rewrote {changed} sentences')

# clear stale takes + state so the retry loop regenerates with new text
st_path = HERE / 'state.json'
st = json.loads(st_path.read_text(encoding='utf8'))
for sid in REWRITE:
    raw = RAW / f'{sid}.wav'
    if raw.exists():
        raw.unlink()
    raw.with_suffix('.fade.wav').unlink(missing_ok=True)
    c = st['clips'].get(sid)
    if c and c.get('status') == 'accepted':
        print(f'{sid} was accepted - leaving untouched')
    else:
        st['clips'][sid] = {'status': 'failed', 'takes': st['clips'].get(sid, {}).get('takes', 0),
                            'error': 'retake: text recalibrated for 6s limit'}
st_path.write_text(json.dumps(st, indent=1), encoding='utf8')
print('stale takes cleared, states marked for retake')
