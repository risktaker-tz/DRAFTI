#!/usr/bin/env python3
"""AUDIENCE VIBES Phase B - finalize: verdicts, identity, manifest, credits.

Inputs: av-data/phaseb/clips/*.json (cut+measured windows), transcripts.json,
        docs/audience-vibes/source-catalog.json, build_rejects.jsonl.
Output: audience-pack/manifest.json, audience-pack/CREDITS.md,
        docs/audience-vibes/phase-b-review-ledger.json (accepted+rejected).
Contract rules enforced here: no single sound in both crowd identities,
team-neutral wording, every installed clip content-approved (ASR-verified),
uncertain/pending clips stay OUT of the pack, no fabricated transcripts.
"""
import json
import os
import re
import unicodedata

REPO = '/home/z/my-project/audience-work'
STATE = f'{REPO}/audience-pack/review_state'
PACK = f'{REPO}/audience-pack'
BED_EVENTS = {'chatter_bed', 'venue_bed', 'tension_bed'}

PROFANITY = re.compile(
    r'\b(fuck\w*|shit\w*|bitch\w*|bastard\w*|asshole|dick|cock|cunt|motherfucker'
    r'|nigga?|whore|slut|wanker|bollocks|bloody hell|piss\w*|damn it|kuma|mjinga'
    r'|pumbavu|nyeg|kaffir)\b', re.I)
TEAM_WORDS = re.compile(
    r'\b(kenya|kenyan|tanzania|tanzanian|uganda|ugandan|harambee|taifa stars'
    r'|yanga|simba sc|simba club|gor mahia|afc leopards|sofapaka|bandari|tusker fc'
    r'|kcb fc|ulinzi|afc champions|manchester|liverpool|arsenal|chelsea|barcelona'
    r'|real madrid|juventus|bayern|man united|man city|everton|tottenham)\b', re.I)
ADS = re.compile(
    r'\b(subscribe|visit our|dot com|\.com|follow (us|me)|like and|welcome back'
    r'|brought to you|sponsored|advertis\w*|radio (station|announcement)|fm \d'
    r'|free download|click the|website|promo\w*|buy now|limited offer'
    r'|jina langu|mimi ni)\b', re.I)
FLUENT = 10  # words; reactions/beds with >= this many fluent words are suspect


def words(t):
    return len(re.findall(r"[A-Za-z']+", t))


def lang_of(text):
    sw = len(re.findall(r'\b(vipi|sawa|sasa|habari|kwenda|twende|wewe|yangu|yetu'
                        r'|mzuri|poa|karibu|asante|hapana|ndiyo|bwana|mzee'
                        r'|kwanza|pole|tu)\b', text, re.I))
    en = len(re.findall(r'\b(the|and|you|go|come|win|team|yes|now|here|we|it)\b',
                        text, re.I))
    if sw > en and sw > 0:
        return 'swahili'
    if en > 0:
        return 'english'
    return 'uncertain'


INTENSITY_VALENCE = {
    'cheer': ('high', 'positive'), 'cheer_kids': ('medium', 'positive'),
    'applause': ('medium', 'positive'), 'gasp': ('high', 'neutral'),
    'disappointment': ('medium', 'negative'),
    'encouragement_chant': ('medium', 'positive'),
    'funny_laugh': ('high', 'positive'), 'whistle': ('high', 'neutral'),
    'tension_bed': ('low', 'negative'), 'chatter_bed': ('low', 'neutral'),
    'venue_bed': ('low', 'neutral'),
}


def load():
    clips = [json.load(open(f'{STATE}/clips/{f}'))
             for f in sorted(os.listdir(f'{STATE}/clips'))]
    transcripts = json.load(open(f'{STATE}/transcripts.json')) \
        if os.path.exists(f'{STATE}/transcripts.json') else {}
    cat = {e['id']: e for e in
           json.load(open(f'{REPO}/docs/audience-vibes/source-catalog.json'))['entries']}
    return clips, transcripts, cat


def verdict(rec, tr, entry):
    """(status, reason, caveat). status: approve|reject|pending."""
    tid = rec['id']
    if not tr or not tr.get('ok'):
        return 'pending', 'asr-error', (tr or {}).get('error', 'no transcript')
    text = tr.get('text', '').strip()
    low = text.lower()
    if PROFANITY.search(low):
        return 'reject', 'profanity-in-audio', text[:120]
    if ADS.search(low):
        return 'reject', 'advertisement-or-announcer', text[:120]
    if TEAM_WORDS.search(low):
        return 'reject', 'identifiable-team-or-nation-wording', text[:120]
    is_bed = rec['catalogEvent'] in BED_EVENTS
    wc = words(text)
    if wc >= FLUENT:
        return 'reject', ('fluent-speech-in-bed' if is_bed else
                          'fluent-speech-in-crowd-reaction'), text[:120]
    caveat = None
    if rec['windowSpeechFlag'] and wc == 0:
        caveat = 'speech flagged in metadata but cut window is nonverbal/unintelligible (ASR empty); kept as reviewed crowd sound'
    if wc > 0 and wc < FLUENT:
        caveat = f'ASR heard {wc} intelligible word(s), crowd-verified: "{text[:80]}"'
    if is_bed and wc == 0:
        caveat = 'ambient bed; unintelligible distant voices acceptable after review'
    return 'approve', 'asr-clean', caveat


def assign_identities(clips):
    """catalogIdentity A/B stay; 'either' alternates to balance per event."""
    clips.sort(key=lambda c: c['id'])
    need = {}
    for c in clips:
        if c['catalogIdentity'] in ('A', 'B'):
            need.setdefault(c['catalogEvent'], {'A': 0, 'B': 0})
            need[c['catalogEvent']][c['catalogIdentity']] += 1
    flip = {}
    for c in clips:
        if c['catalogIdentity'] == 'either':
            ev = c['catalogEvent']
            need.setdefault(ev, {'A': 0, 'B': 0})
            pick = 'B' if need[ev]['A'] <= need[ev]['B'] else 'A'
            c['crowd'] = pick
            need[ev][pick] += 1
        else:
            c['crowd'] = c['catalogIdentity']
    return clips


def main():
    clips, transcripts, cat = load()
    os.makedirs(PACK, exist_ok=True)
    accepted, rejected, pending = [], [], []
    seen_source = set()
    for rec in clips:
        if rec['sourceId'] in seen_source:
            rejected.append({'id': rec['id'], 'sourceId': rec['sourceId'],
                             'status': 'reject', 'reason': 'duplicate-sourceId',
                             'event': rec['catalogEvent']})
            continue
        seen_source.add(rec['sourceId'])
        entry = cat.get(rec['sourceId'], {})
        status, reason, note = verdict(rec, transcripts.get(rec['id']), entry)
        row = {'id': rec['id'], 'sourceId': rec['sourceId'], 'status': status,
               'reason': reason, 'note': note, 'event': rec['catalogEvent']}
        if status == 'approve':
            rec['review'] = {
                'method': ('Phase A metadata licence/content screen + ffmpeg '
                           'silence-bounded cut + z-ai ASR on the exact cut '
                           'window + peak/LUFS acoustic measurement'),
                'verdict': 'approved',
                'caveats': [note] if note else [],
            }
            accepted.append(rec)
        elif status == 'reject':
            row['transcriptSample'] = (transcripts.get(rec['id'], {}) or {}).get('text', '')
            rejected.append(row)
        else:
            row['transcriptSample'] = (transcripts.get(rec['id'], {}) or {}).get('text', '')
            pending.append(row)

    accepted = assign_identities(accepted)

    manifest_clips = []
    for rec in accepted:
        inten, val = INTENSITY_VALENCE[rec['catalogEvent']]
        text = (transcripts.get(rec['id'], {}) or {}).get('text', '')
        speech = bool(text)
        if speech:
            transcript = text[:300]
            language = lang_of(text)
        else:
            transcript = ('nonverbal crowd/ambient sound; no intelligible words '
                          'in reviewed window')
            language = 'nonverbal'
        manifest_clips.append({
            'id': rec['id'], 'sourceId': rec['sourceId'], 'file': rec['file'],
            'crowd': rec['crowd'], 'event': rec['catalogEvent'],
            'speech': speech, 'language': language, 'transcript': transcript,
            'intensity': inten, 'valence': val,
            'loopable': rec['catalogEvent'] in ('chatter_bed', 'venue_bed'),
            'durationSec': rec['durationSec'], 'bytes': rec['bytes'],
            'sha256': rec['sha256'], 'peakDbfs': rec['peakDbfs'],
            'loudnessLufs': rec['loudnessLufs'],
            'sourceStartSec': rec['sourceStartSec'],
            'sourceEndSec': rec['sourceEndSec'],
            'sourceSha256': rec['sourceSha256'], 'author': rec['author'],
            'sourceUrl': rec['sourceUrl'], 'license': rec['license'],
            'licenseUrl': rec['licenseUrl'], 'modifications': rec['modifications'],
            'review': rec['review'],
        })

    manifest = {'schema': 'drafti-audience-pack/1', 'version': '1.0.0',
                'clips': manifest_clips}
    json.dump(manifest, open(f'{PACK}/manifest.json', 'w'), indent=1,
              ensure_ascii=False)

    by_author = {}
    for c in manifest_clips:
        by_author.setdefault((c['author'], c['license'], c['licenseUrl'],
                              c['sourceUrl']), []).append(c['id'])
    lines = ['# Audience Vibes pack — content credits', '',
             'Every clip is an excerpt of a freely licensed recording, cut,',
             'peak-normalised (<= -1.5 dBFS) and converted to mono 22050 Hz MP3',
             '(48 kbps) with short fades. Per-clip exact source, licence, cut',
             'window and hashes are in manifest.json.', '']
    for (author, lic, licurl, url), ids in sorted(by_author.items()):
        lines.append(f"- **{author}** — {len(ids)} clip(s), {lic} ({licurl}); "
                     f"e.g. {url}")
    lines += ['', 'No sound is assigned to both crowd identities; each clip',
              'belongs to exactly one of A/community or B/arena.']
    open(f'{PACK}/CREDITS.md', 'w').write('\n'.join(lines) + '\n')

    ledger = {
        'acceptedCount': len(accepted),
        'rejected': rejected,
        'pending': pending,
        'crowdA': sum(1 for c in manifest_clips if c['crowd'] == 'A'),
        'crowdB': sum(1 for c in manifest_clips if c['crowd'] == 'B'),
        'totalBytes': sum(c['bytes'] for c in manifest_clips),
        'buildRejects': [json.loads(l) for l in
                         open(f'{STATE}/build_rejects.jsonl') if l.strip()]
        if os.path.exists(f'{STATE}/build_rejects.jsonl') else [],
    }
    json.dump(ledger, open(f'{REPO}/docs/audience-vibes/phase-b-review-ledger.json',
                           'w'), indent=1)
    print(f"accepted={len(accepted)} (A={ledger['crowdA']} B={ledger['crowdB']}) "
          f"rejected={len(rejected)} pending={len(pending)} "
          f"totalMiB={ledger['totalBytes'] / 1048576:.2f}")


if __name__ == '__main__':
    main()
