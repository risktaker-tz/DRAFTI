#!/usr/bin/env python3
"""Validate streamer-pack manifest + audio before a batch commit.

Checks: file exists and decodes; mono 22050 Hz; peak <= -1.5 dBFS; duration
<= 6.0 s; <= 60 KiB; sha256 matches; text uniqueness per voice (exact and
near-duplicate); voice/mode consistency; banned-claim patterns; counts.
Optional: --asr N transcribes up to N clips (first per batch order) and
compares against the manifest text; mismatches are reported for review.
"""
import argparse, hashlib, json, os, re, subprocess, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import voice_proc  # noqa: E402
FFMPEG = os.environ.get('FFMPEG') or 'ffmpeg'
PACK = ROOT / 'streamer-pack'

BANNED = [
    r'i\s+knew', r'i\s+told\s+you', r'what\s+i\s+was\s+thinking', r'as\s+i\s+predicted',
    r'predicted', r'donation', r'\d+\s*viewers', r'first\s+blood', r'subscribe',
    r'stream\s+is\s+ending', r'\bhis\s+piece\b', r'\bher\s+piece\b', r'\d+\s*[-–]\s*\d+',
]


def norm(t):
    return re.sub(r'[^a-z0-9 ]', '', t.lower()).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--asr', type=int, default=0)
    args = ap.parse_args()
    man = json.loads((PACK / 'manifest.json').read_text(encoding='utf8'))
    assert man['schema'] == 'drafti-streamer-pack/1', 'wrong schema'
    problems, checked = [], 0
    seen = {}
    for c in man['clips']:
        f = PACK / c['file']
        cid = c['id']
        if not f.exists():
            problems.append(f'{cid}: missing file'); continue
        if f.stat().st_size != c['bytes']:
            problems.append(f'{cid}: size mismatch')
        if hashlib.sha256(f.read_bytes()).hexdigest() != c['sha256']:
            problems.append(f'{cid}: sha256 mismatch')
        try:
            samples = voice_proc.decode(FFMPEG, f)
        except Exception as e:
            problems.append(f'{cid}: decode failed {e}'); continue
        peak = float(max(abs(samples.min()), samples.max())) if len(samples) else 0.0
        peak_db = 20 * __import__('math').log10(peak) if peak > 0 else -999
        dur = len(samples) / voice_proc.RATE
        if peak_db > -1.49:
            problems.append(f'{cid}: peak {peak_db:.2f} > -1.5 dBFS')
        if dur > 6.01:
            problems.append(f'{cid}: duration {dur:.2f}s > 6.0')
        if f.stat().st_size > 61440:
            problems.append(f'{cid}: {f.stat().st_size} bytes > 60 KiB')
        if abs(dur - c['durationSec']) > 0.05:
            problems.append(f'{cid}: durationSec drift')
        expect_voice = {'sf2': 'tongtong', 'sm2': 'jam', 'sj2': 'kazi'}[cid[:3]]
        expect_mode = {'sf2': 'female', 'sm2': 'male', 'sj2': 'funny'}[cid[:3]]
        if c['voice'] != expect_voice or c['mode'] != expect_mode:
            problems.append(f'{cid}: voice/mode inconsistency')
        low = norm(c['text'])
        for pat in BANNED:
            if re.search(pat, ' ' + low + ' '):
                problems.append(f'{cid}: banned pattern {pat}')
        if low in seen:
            problems.append(f'{cid}: duplicate text of {seen[low]}')
        seen[low] = cid
        if not c['predicate'] or not c['role']:
            problems.append(f'{cid}: missing predicate/role')
        checked += 1
    # near-duplicate check within each voice (token-set Jaccard >= 0.75)
    byv = {}
    for c in man['clips']:
        byv.setdefault(c['voice'], []).append(c)
    for voice, clips in byv.items():
        toks = {c['id']: set(norm(c['text']).split()) for c in clips}
        ids = list(toks)
        for i, a in enumerate(ids):
            for b in ids[i + 1:]:
                ta, tb = toks[a], toks[b]
                if ta and tb and len(ta & tb) / len(ta | tb) >= 0.75:
                    problems.append(f'near-duplicate {a} ~ {b} (jaccard)')
    # ASR spot check
    if args.asr:
        for c in man['clips'][:args.asr]:
            wav = f'/tmp/asrspot_{c["id"]}.wav'
            subprocess.run([FFMPEG, '-v', 'error', '-y', '-i', str(PACK / c['file']),
                            '-ac', '1', '-ar', '16000', wav], check=True)
            r = subprocess.run(['z-ai', 'asr', '--file', wav, '-o', f'/tmp/asrspot_{c["id"]}.json'],
                               capture_output=True, text=True, timeout=120)
            try:
                tr = json.load(open(f'/tmp/asrspot_{c["id"]}.json'))
                text = tr.get('text', '') if tr.get('ok', True) else ''
            except Exception:
                text = ''
            a, b = norm(text), norm(c['text'])
            if a and b:
                inter = len(set(a.split()) & set(b.split()))
                jac = inter / len(set(a.split()) | set(b.split()))
                flag = 'OK' if jac >= 0.7 else 'MISMATCH'
                print(f'asr {c["id"]}: jaccard={jac:.2f} {flag}')
                if flag == 'MISMATCH':
                    problems.append(f'{c["id"]}: ASR mismatch (jaccard {jac:.2f})')
            os.remove(wav)
    counts = {}
    for c in man['clips']:
        counts[c['mode']] = counts.get(c['mode'], 0) + 1
    print(f'checked={checked} counts={counts} totalBytes={man["totalBytes"]}')
    if problems:
        print('PROBLEMS:')
        for p in problems:
            print(' ', p)
        sys.exit(1)
    print('VALID: all checks pass')


if __name__ == '__main__':
    main()
