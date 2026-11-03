#!/usr/bin/env python3
"""AUDIENCE VIBES Phase A - catalog builder.

Consumes av-data/{search_hits,sound_pages,audio_evidence}.json and emits into
the repo working tree (docs/audience-vibes/):
  - source-catalog.json      verified, usable, distinct entries with full
                             metadata + game mapping suggestions
  - download-manifest.json   machine-readable download list for Phase B
  - search-ledger.json       EVERY raw search hit with status/reason
                             (verified vs rejected vs inaccessible)
  - evidence/verification-log.json  per-entry link/license/audio evidence

Screening: license whitelist (deed URL), natural-crowd domain, profanity and
music/synth blacklist, download+ffprobe validity, sha256 dedupe.
Mapping: event, valence, intensity, phase, crowd identity suggestion,
side-affinity, speech flag/language/content, cooldown/quota policy.
"""
import datetime
import hashlib
import json
import os
import re

DATA = '/home/z/my-project/av-data'
REPO = '/home/z/my-project/audience-work'
OUTDIR = f'{REPO}/docs/audience-vibes'

LICENSE_MAP = {
    'creativecommons.org/publicdomain/zero/1.0': 'CC0 1.0 Universal',
    'creativecommons.org/licenses/by/4.0': 'CC BY 4.0',
    'creativecommons.org/licenses/by/3.0': 'CC BY 3.0',
    'creativecommons.org/licenses/by/2.5': 'CC BY 2.5',
    'creativecommons.org/licenses/by/2.0': 'CC BY 2.0',
    'creativecommons.org/licenses/by/1.0': 'CC BY 1.0',
}

MUSIC_RE = re.compile(
    r'\b(music|song|melody|melodic|instrumental|guitar|piano|'
    r'synth|synthesi[sz]er|8-?bit|chiptune|robot|robotic|electronic|glitch|'
    r'ringtone|vgm|anthem|jingle|rap|beat\b|drum\b|drums\b|drumline|soundtrack|'
    r'cartoon|sci-?fi|alien|zombie|monster|demon|laser|reversed?|reverse\b|'
    r'slow-?mo|distorted|pitch(ed)?[- ]?(up|down)|announcer|commentator|'
    r'narrat|radio advert|commercial|advertis|podcast|interview|'
    r'sound ?effect loop)\w*', re.I)
PROFANITY_RE = re.compile(
    r'\b(fuck\w*|shit\w*|bitch\w*|bastard\w*|asshole|cunt\w*|nigg\w*|faggot\w*|'
    r'whore\w*|slut\w*|dick\b|cocks?\b|tits\b|goddamn\w*|damn it)\b', re.I)
SPEECH_CUES_RE = re.compile(
    r'\b(chant|chanting|shout\w*|yell\w*|scream\w*|voices?\b|talking|speech|'
    r'say\w*|words|singing|singing chant|vocal|whoa|wooo|ole|olé|yay|hooray|'
    r'goal|bravo|encourag\w*|swahili|kiswahili|english)\b', re.I)
SWAHILI_HINT_RE = re.compile(r'\b(swahili|kiswahili|kenya|kenyan|tanzania|tanzanian|'
                             r'habari|asante|twende|team\w* ya)\b', re.I)
ENGLISH_HINT_RE = re.compile(r'\b(english|american|british|australian)\b', re.I)
QUOTE_RE = re.compile(r'[\'"]([^\'"]{3,60})[\'"]')

HIGH_RE = re.compile(r'\b(big|huge|massive|stadium|arena|wild|roar|epic|large)\b', re.I)
LOW_RE = re.compile(r'\b(small|light|soft|gentle|quiet|few|distant)\b', re.I)
VENUE_B_RE = re.compile(r'\b(stadium|arena|auditorium|theater|theatre|grandstand|'
                        r'bleachers|hall|concert)\b', re.I)
VENUE_A_RE = re.compile(r'\b(market|street|village|township|school|children|kids|'
                        r'family|garden|park|cafe|restaurant|bar|neighborhood|neighbourhood)\b', re.I)

EVENT_POLICY = {
    'cheer':               {'cooldown_sec': 25, 'max_per_minute': 6, 'valence': 'positive', 'phase': 'any', 'loop': False},
    'cheer_kids':          {'cooldown_sec': 60, 'max_per_minute': 2, 'valence': 'positive', 'phase': 'any', 'loop': False},
    'applause':            {'cooldown_sec': 30, 'max_per_minute': 6, 'valence': 'positive', 'phase': 'any', 'loop': False},
    'gasp':                {'cooldown_sec': 45, 'max_per_minute': 3, 'valence': 'negative', 'phase': 'mid_late', 'loop': False},
    'disappointment':      {'cooldown_sec': 60, 'max_per_minute': 2, 'valence': 'negative', 'phase': 'any', 'loop': False},
    'encouragement_chant': {'cooldown_sec': 45, 'max_per_minute': 3, 'valence': 'positive', 'phase': 'mid', 'loop': False},
    'funny_laugh':         {'cooldown_sec': 90, 'max_per_minute': 2, 'valence': 'positive', 'phase': 'any', 'loop': False},
    'whistle':             {'cooldown_sec': 40, 'max_per_minute': 3, 'valence': 'neutral', 'phase': 'any', 'loop': False},
    'tension_bed':         {'cooldown_sec': 60, 'max_per_minute': 2, 'valence': 'neutral', 'phase': 'late_endgame', 'loop': False},
    'chatter_bed':         {'cooldown_sec': 0, 'max_per_minute': 0, 'valence': 'neutral', 'phase': 'early_mid', 'loop': True},
    'venue_bed':           {'cooldown_sec': 0, 'max_per_minute': 0, 'valence': 'neutral', 'phase': 'any', 'loop': True},
}
CAT_PRIORITY = ['cheer', 'applause', 'gasp', 'disappointment', 'chant', 'laugh',
                'whistle', 'tension', 'children', 'chatter', 'venue_b', 'venue_a', 'misc']
CAT_EVENT = {'cheer': 'cheer', 'applause': 'applause', 'gasp': 'gasp',
             'disappointment': 'disappointment', 'chant': 'encouragement_chant',
             'laugh': 'funny_laugh', 'whistle': 'whistle', 'tension': 'tension_bed',
             'chatter': 'chatter_bed', 'venue_b': 'venue_bed', 'venue_a': 'venue_bed',
             'misc': 'cheer'}


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def license_name(deed):
    d = deed.lower().rstrip('/')
    for frag, name in LICENSE_MAP.items():
        if frag in d:
            return name
    return None


def pick_category(cats, title):
    for c in CAT_PRIORITY:
        if c in cats:
            return c
    return 'misc'


def event_for(cat, title, tags):
    if cat == 'children':
        if re.search(r'\b(laugh|giggle)\b', title + ' ' + ' '.join(tags), re.I):
            return 'funny_laugh'
        return 'cheer_kids'
    return CAT_EVENT.get(cat, 'cheer')


def intensity_for(title, desc):
    t = title + ' ' + desc
    if HIGH_RE.search(t):
        return 'high'
    if LOW_RE.search(t):
        return 'low'
    return 'medium'


def identity_for(cat, title, tags, desc):
    t = title + ' ' + ' '.join(tags) + ' ' + desc
    if VENUE_B_RE.search(t):
        return 'B', 'venue terms indicate arena/stadium crowd'
    if VENUE_A_RE.search(t):
        return 'A', 'venue terms indicate close community/community-space crowd'
    if cat in ('venue_b',):
        return 'B', 'queried under stadium/arena/auditorium ambience'
    if cat in ('venue_a', 'children'):
        return 'A', 'queried under community/children crowd'
    return 'either', 'no venue signal in title/tags/description'


def speech_for(desc, tags):
    t = desc + ' ' + ' '.join(tags)
    cues = SPEECH_CUES_RE.search(t)
    quotes = QUOTE_RE.findall(desc)
    speech = bool(cues or quotes)
    if SWAHILI_HINT_RE.search(t):
        lang = 'swahili (probable, from source metadata)'
    elif ENGLISH_HINT_RE.search(t):
        lang = 'english (probable, from source metadata)'
    elif quotes:
        lang = 'uncertain - words quoted in source description'
    elif speech:
        lang = 'uncertain - speech cues in metadata, not yet transcribed'
    else:
        lang = 'nonverbal per source metadata'
    content = ' / '.join(q.strip() for q in quotes[:3]) if quotes else (
        'crowd vocalisations (chants/shouts/cheers) - ASR pending Phase B' if speech
        else 'no words per source metadata')
    return speech, lang, content


def main():
    hits = json.load(open(f'{DATA}/search_hits.json'))['hits']
    pages = json.load(open(f'{DATA}/sound_pages.json'))
    evid = json.load(open(f'{DATA}/audio_evidence.json'))

    ledger = {}
    entries = []
    seen_sha = {}
    seen_user_title = set()
    stats = {'raw_hits': len(hits), 'no_page': 0, 'no_license': 0, 'bad_license': 0,
             'screen_rejected': 0, 'download_failed': 0, 'not_audio': 0,
             'dup_sha': 0, 'dup_user_title': 0, 'too_short': 0, 'verified': 0}

    for sid, h in sorted(hits.items(), key=lambda kv: int(kv[0])):
        pg = pages.get(sid)
        ev = evid.get(sid)
        rec = {'source_page': pg['page_url'] if pg else
               f"https://freesound.org/people/{h['user']}/sounds/{sid}/",
               'status': 'rejected', 'reason': None}
        if pg is None:
            rec['reason'] = 'sound page not fetched/inaccessible'
            stats['no_page'] += 1
            ledger[sid] = rec
            continue
        deed = pg.get('deed_url')
        lic = license_name(deed) if deed else None
        if not deed or not lic:
            rec['reason'] = f'license not verifiable on page (deed={deed})'
            stats['no_license'] += 1
            ledger[sid] = rec
            continue
        if ev and not ev.get('ok') and ev.get('error', '').startswith('license not whitelisted'):
            rec['reason'] = ev['error']
            stats['bad_license'] += 1
            ledger[sid] = rec
            continue
        title = pg.get('title_page') or h['title']
        desc = pg.get('description', '')
        tags = pg.get('tags', [])
        blob = ' | '.join([title, desc, ' '.join(tags)])
        if PROFANITY_RE.search(blob):
            rec['reason'] = 'profanity/adult wording in metadata'
            stats['screen_rejected'] += 1
            ledger[sid] = rec
            continue
        if MUSIC_RE.search(blob):
            rec['reason'] = 'music/synthetic/processed cues in metadata'
            stats['screen_rejected'] += 1
            ledger[sid] = rec
            continue
        if not ev or not ev.get('ok'):
            rec['reason'] = (ev or {}).get('error') or 'audio not verified'
            if rec['reason'] and ('not valid audio' in rec['reason']):
                stats['not_audio'] += 1
            else:
                stats['download_failed'] += 1
            ledger[sid] = rec
            continue
        dur = ev['ffprobe']['duration_sec']
        if dur < 1.0:
            rec['reason'] = f'too short ({dur}s)'
            stats['too_short'] += 1
            ledger[sid] = rec
            continue
        if ev['sha256'] in seen_sha:
            rec['reason'] = f'duplicate audio content (sha256 == {seen_sha[ev["sha256"]]})'
            stats['dup_sha'] += 1
            ledger[sid] = rec
            continue
        ut = (h['user'].lower(), re.sub(r'\s+', ' ', title.lower()).strip())
        if ut in seen_user_title:
            rec['reason'] = 'duplicate uploader+title'
            stats['dup_user_title'] += 1
            ledger[sid] = rec
            continue

        cat = pick_category(h['categories'], title)
        event = event_for(cat, title, tags)
        pol = EVENT_POLICY[event]
        ident, ibasis = identity_for(cat, title, tags, desc)
        speech, lang, scontent = speech_for(desc, tags)
        inten = intensity_for(title, desc)
        excerpts = ev.get('excerpts') or [
            {'start': 0.0, 'end': round(min(dur, 20.0), 2), 'basis': 'whole short clip'}]
        aid = f'av-fs-{sid}'
        entry = {
            'id': aid,
            'title': title,
            'author': h['user'],
            'author_page': f"https://freesound.org/people/{h['user']}/",
            'source_page': pg['page_url'],
            'audio_url': ev['audio_url'],
            'audio_url_type': 'freesound.org public HQ preview (mp3), stable CDN URL',
            'license': lic,
            'license_evidence_url': deed,
            'duration_sec': dur,
            'bytes': ev['bytes'],
            'sha256': ev['sha256'],
            'search_categories': h['categories'],
            'tags': tags,
            'source_description': desc,
            'crowd_identity_suggestion': ident,
            'identity_basis': ibasis,
            'event': event,
            'side_affinity': 'either',
            'side_affinity_note': 'runtime director picks winning/supporting side; clip itself is team-neutral',
            'valence': pol['valence'],
            'intensity': inten,
            'phase': pol['phase'],
            'loopable': pol['loop'],
            'speech': speech,
            'speech_language': lang,
            'speech_content': scontent,
            'cooldown_sec': pol['cooldown_sec'],
            'max_per_minute': pol['max_per_minute'],
            'excerpt_windows': excerpts,
            'verified': {
                'link_status': ev['http_status'],
                'http_content_type': ev.get('content_type', ''),
                'ffprobe': ev['ffprobe'],
                'sha256_unique': True,
                'license_whitelisted': True,
                'metadata_screen': 'passed',
                'verified_at': now(),
                'tools': 'python3 urllib + ffmpeg/ffprobe; schema av-pa-1',
            },
            'review_status': 'auto-verified; content listen/ASR + pack timing pending Phase B',
        }
        entries.append(entry)
        seen_sha[ev['sha256']] = aid
        seen_user_title.add(ut)
        rec['status'] = 'verified'
        rec['reason'] = None
        rec['catalog_id'] = aid
        stats['verified'] += 1
        ledger[sid] = rec

    os.makedirs(f'{OUTDIR}/evidence', exist_ok=True)
    catalog = {
        'schema': 'audience-vibes/source-catalog/phase-a/1',
        'generated_at': now(),
        'phase': 'A (source research & verification; raw audio SHA-pinning happens in Phase B)',
        'vision': 'Two distinct devoted crowd identities, natural background chatter, '
                  'situationally correct reactions, optional offline installed pack.',
        'verified_count': len(entries),
        'stats': stats,
        'identity_key': {
            'A': 'Community crowd - close, warm, market/street/children/local-fans energy',
            'B': 'Arena crowd - stadium/arena/auditorium big-crowd energy',
            'either': 'fits either identity bank; runtime decides',
        },
        'policy_note': 'cooldown/quota are Phase-A suggestions for the audio director; '
                       'Codex owns final runtime integration.',
        'entries': entries,
    }
    manifest = {
        'schema': 'audience-vibes/download-manifest/phase-a/1',
        'generated_at': now(),
        'note': 'Direct download URLs for every verified entry. Freesound HQ previews are '
                'publicly accessible without auth. Phase B must re-download and SHA-pin, '
                'and may fetch original WAVs with a Freesound account instead.',
        'count': len(entries),
        'items': [{'id': e['id'], 'audio_url': e['audio_url'], 'license': e['license'],
                   'sha256_preview_bytes': e['sha256'], 'bytes': e['bytes'],
                   'duration_sec': e['duration_sec'], 'source_page': e['source_page']}
                  for e in entries],
    }
    vlog = {'schema': 'audience-vibes/verification-log/phase-a/1', 'generated_at': now(),
            'entries': {e['id']: {'source_page': e['source_page'],
                                  'license_evidence_url': e['license_evidence_url'],
                                  'http_status': e['verified']['link_status'],
                                  'content_type': e['verified']['http_content_type'],
                                  'bytes': e['bytes'], 'sha256': e['sha256'],
                                  'ffprobe': e['verified']['ffprobe'],
                                  'verified_at': e['verified']['verified_at']}
                        for e in entries}}
    json.dump(catalog, open(f'{OUTDIR}/source-catalog.json', 'w'), indent=1, ensure_ascii=False)
    json.dump(manifest, open(f'{OUTDIR}/download-manifest.json', 'w'), indent=1, ensure_ascii=False)
    json.dump(vlog, open(f'{OUTDIR}/evidence/verification-log.json', 'w'), indent=1, ensure_ascii=False)
    json.dump({'schema': 'audience-vibes/search-ledger/phase-a/1', 'generated_at': now(),
               'raw_search_hits': stats['raw_hits'], 'ledger': ledger},
              open(f'{OUTDIR}/search-ledger.json', 'w'), indent=1, ensure_ascii=False)
    print('VERIFIED:', len(entries))
    print('STATS:', json.dumps(stats, indent=1))
    from collections import Counter
    print('EVENTS:', dict(Counter(e['event'] for e in entries)))
    print('IDENTITY:', dict(Counter(e['crowd_identity_suggestion'] for e in entries)))
    print('LICENSES:', dict(Counter(e['license'] for e in entries)))
    print('SPEECH:', dict(Counter(e['speech'] for e in entries)))
    print('INTENSITY:', dict(Counter(e['intensity'] for e in entries)))
    print('DURATION: min', min(e['duration_sec'] for e in entries),
          'max', max(e['duration_sec'] for e in entries),
          'sum_min', round(sum(e['duration_sec'] for e in entries) / 60, 1))


if __name__ == '__main__':
    main()
