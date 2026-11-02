#!/usr/bin/env python3
"""Install the curated owner-audio cuts from the 2026-11-02 handoff.

Reproducible and source-pinned: every mono 16 kHz analysis WAV is verified by
SHA-256 before any cut is taken, every window comes from measured energy /
transcript boundaries recorded in docs/owner-audio-cuts.json, and processing
goes through voice_proc.process (speech guards preserved: nothing above the
peak*0.001 threshold is trimmed, decoded peak <= -1.5 dBFS, mono 22050 Hz,
<= 56 kbps MP3, <= 60 KiB, no clip longer than 3.5 s).

The scripts/research_media/ directory (git-ignored) holds the handoff WAVs:
    mvUVrweNvsQ.wav  kW2NDCIpnW0.wav  AKozkV3MeWE.wav  fkRNoM2f9GM.wav  g0cRfVqV04Q.wav

Additive only: refuses to overwrite an existing clip, refuses to alter any
catalog entry that already exists, and refuses to run if any catalog ID it
wants to add is already present. Raw full recordings are never committed.
"""
import argparse
import hashlib
import json
import pathlib
import subprocess
import tempfile

from voice_proc import process, ffmpeg_path

ROOT = pathlib.Path(__file__).resolve().parents[1]

LICENSE = ("Short sourced excerpt for meme/commentary use; original rights "
           "retained by the source creator. The uploader's 'no copyright' "
           "title is treated as UNVERIFIED; this is not CC0. "
           "See ATTRIBUTIONS.md.")

SOURCES = {
    'mvUVrweNvsQ': {
        'url': 'https://youtube.com/shorts/mvUVrweNvsQ',
        'title': 'Is this the shrimp one?? #horse #shorts #equestrian #takis #pony #horsehumor #funnyanimals',
        'wavSha256': 'e4e81189738e74655c30462b80aac7234f6f4fa05f180bda3c39a453b9a9fc83',
    },
    'kW2NDCIpnW0': {
        'url': 'https://www.youtube.com/shorts/kW2NDCIpnW0',
        'title': 'baby laughing meme sound effect',
        'uploader': 'BreakTheGame',
        'wavSha256': 'd318104c7e1d9eb0356a5aa4794c8733d86cbfb9d6c01d6c53db2df790834b9a',
    },
    'AKozkV3MeWE': {
        'url': 'https://www.youtube.com/shorts/AKozkV3MeWE',
        'title': '5 + Suspense Sound Effects No Copyright (Free To Use For Video Editing)',
        'uploader': 'Sound Effects Treasure',
        'wavSha256': '759cd45ebf1279391028218645397425100cadfa4391487f09506744540d4eab',
    },
    'fkRNoM2f9GM': {
        'url': 'https://www.youtube.com/shorts/fkRNoM2f9GM',
        'title': 'Top 5 Nigerian funny sounds #Nigerianfunnysounds',
        'uploader': 'Mondal Screen',
        'wavSha256': 'a98eab74561593b551ea23463a244d6beac9ebd64460103616bba35cbc8e7644',
    },
    'g0cRfVqV04Q': {
        'url': 'https://youtu.be/g0cRfVqV04Q',
        'title': 'NIGERIAN POPULAR COMEDY SOUND EFFECTS',
        'uploader': 'OG Smitth Comedian',
        'wavSha256': '810ab5c8696a58b2c33cdf810bbff06715a5c57e041ed33fe2b8c1529da8e1d2',
    },
}

# id: (source, start, end, label, extraction-note)
CUTS = {
    'munch_mmm':        ('mvUVrweNvsQ', 0.205, 0.525,
                         'Mouth hum "Mmm" (transcribed, energy-bounded)',
                         'complete effect'),
    'laugh_baby_short': ('kW2NDCIpnW0', 0.415, 1.925,
                         'First baby-giggle burst', 'complete burst'),
    'laugh_baby_full':  ('kW2NDCIpnW0', 2.905, 6.325,
                         'Full baby laugh', 'complete burst'),
    'susp_hit_boom':    ('AKozkV3MeWE', 0.465, 0.975,
                         'Suspense pack: low boom/hit (attack 31 ms)', 'complete effect'),
    'susp_drone_deep':  ('AKozkV3MeWE', 2.075, 4.745,
                         'Suspense pack: deep ominous drone (95% low band)', 'complete effect'),
    'susp_sting_mid':   ('AKozkV3MeWE', 5.565, 6.315,
                         'Suspense pack: mid metallic sting', 'complete effect'),
    'susp_drone_creep': ('AKozkV3MeWE', 7.595, 8.805,
                         'Suspense pack: creeping low drone (slow 738 ms attack)', 'complete effect'),
    'susp_burst':       ('AKozkV3MeWE', 9.775, 10.885,
                         'Suspense pack: sudden mid burst', 'complete effect'),
    'susp_build':       ('AKozkV3MeWE', 11.685, 14.335,
                         'Suspense pack: rising tension build', 'complete effect'),
    'ah_scream':        ('fkRNoM2f9GM', 0.035, 0.355,
                         'Comic "AHH!" scream (transcribed)', 'complete effect'),
    'comic_hit':        ('fkRNoM2f9GM', 1.115, 1.675,
                         'Bright percussive comedy hit', 'complete effect'),
    'mwah_kisses':      ('fkRNoM2f9GM', 6.385, 9.800,
                         'Repeated comic mouth-kiss "mwah" sounds (medium-model transcription)',
                         'excerpt of the 6.385-10.515 repeated pattern, cut at an energy dip'),
    'sorry_dontcry':    ('g0cRfVqV04Q', 7.520, 10.200,
                         'Voice: "Oh, sorry, sorry, sorry, don\'t cry." (word timestamps 7.58-10.14)',
                         'phrase window incl. natural onset/tail'),
    'dont_cry':         ('g0cRfVqV04Q', 21.000, 21.780,
                         'Voice: "Don\'t cry." (word timestamps 21.04-21.72)',
                         'phrase window incl. natural onset/tail'),
    'g0_bass_sting':    ('g0cRfVqV04Q', 26.500, 29.900,
                         'Sustained comedic ominous bass sting (centroid 380 Hz)',
                         'excerpt of the 26.145-32.105 sustained sting'),
    'comic_hit_bright': ('g0cRfVqV04Q', 32.945, 33.655,
                         'Bright comedy hit (distinct recording from comic_hit, corr 0.06)',
                         'complete effect'),
    'pregnant_shock':   ('g0cRfVqV04Q', 48.425, 49.585,
                         'Comic exclamation "PREGNANT?!" (stable across whisper small+medium)',
                         'phrase window incl. natural onset/tail'),
    'g0_deep_wah':      ('g0cRfVqV04Q', 53.615, 56.145,
                         'Deep comedic sting (centroid 173 Hz, distinct from g0_bass_sting, corr -0.006)',
                         'complete effect'),
}

MAX_SECONDS = 3.5


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=pathlib.Path, default=ROOT / 'scripts/research_media')
    parser.add_argument('--ffmpeg')
    args = parser.parse_args()
    executable = ffmpeg_path(args.ffmpeg)
    catalog_path = ROOT / 'scripts/audio_catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf8'))
    clash = sorted(set(CUTS) & set(catalog))
    if clash:
        raise ValueError('Catalog already contains these IDs; refusing to touch them: ' + str(clash))

    hashes = {}
    for sid, meta in SOURCES.items():
        wav = args.source_dir / f'{sid}.wav'
        h = hashlib.sha256(wav.read_bytes()).hexdigest()
        if h != meta['wavSha256']:
            raise ValueError(f'{wav} does not match the verified handoff copy ({h})')
        hashes[sid] = h

    report = {'date': '2026-11-02', 'maxSeconds': MAX_SECONDS,
              'sources': {}, 'cuts': {}}
    for sid, meta in SOURCES.items():
        report['sources'][sid] = {**{k: v for k, v in meta.items()},
                                  'wavSha256': hashes[sid], 'license': LICENSE}
    with tempfile.TemporaryDirectory() as staging:
        for name, (sid, start, end, label, note) in CUTS.items():
            window = pathlib.Path(staging) / f'{name}.wav'
            subprocess.run([executable, '-v', 'error', '-y', '-i',
                            str(args.source_dir / f'{sid}.wav'), '-ss', str(start),
                            '-to', str(end), '-ac', '1', '-ar', '22050', str(window)], check=True)
            out = ROOT / 'src/audio' / f'{name}.mp3'
            if out.exists():
                raise FileExistsError(f'{out} already exists; additive-only run stops')
            result = process(window, out, executable, maximum=MAX_SECONDS, keep_duration=True)
            mp3 = out.read_bytes()
            report['cuts'][name] = {
                'label': label, 'source': SOURCES[sid]['url'], 'sourceId': sid,
                'sourceStart': start, 'sourceEnd': end, 'extraction': note,
                'seconds': result['seconds'], 'peakDbFS': result['peakDbFS'],
                'bytes': result['bytes'], 'sha256': hashlib.sha256(mp3).hexdigest(),
            }
            print(f"{name:18s} {start:7.3f}-{end:7.3f} -> {result['seconds']:.3f}s "
                  f"{result['peakDbFS']:.2f}dBFS {result['bytes']:6d}B")

    for name, (sid, start, end, label, note) in CUTS.items():
        r = report['cuts'][name]
        family = {'mvUVrweNvsQ': 'shrimp-original', 'kW2NDCIpnW0': 'baby-laugh',
                  'AKozkV3MeWE': 'suspense-pack', 'fkRNoM2f9GM': 'nigerian-comedy',
                  'g0cRfVqV04Q': 'nigerian-compilation'}[sid]
        mood = {'munch_mmm': 'savouring', 'laugh_baby_short': 'amused', 'laugh_baby_full': 'hilarious',
                'susp_hit_boom': 'omen', 'susp_drone_deep': 'dread', 'susp_sting_mid': 'alert',
                'susp_drone_creep': 'creeping', 'susp_burst': 'spike', 'susp_build': 'rising',
                'ah_scream': 'shocked', 'comic_hit': 'punchline', 'mwah_kisses': 'cloying',
                'sorry_dontcry': 'consoling', 'dont_cry': 'consoling', 'g0_bass_sting': 'ominous',
                'comic_hit_bright': 'punchline', 'pregnant_shock': 'astounded',
                'g0_deep_wah': 'ominous'}[name]
        category = 'drama' if name.startswith('susp_') or name in ('g0_bass_sting', 'g0_deep_wah') else \
                   'voice' if name in ('sorry_dontcry', 'dont_cry') else 'comedy'
        catalog[name] = {
            'c': category,
            'b': f"Original cut {start:.3f}-{end:.3f}s of {SOURCES[sid]['url']} ({label})",
            'durationSec': r['seconds'], 'voice': 'original', 'mood': mood, 'family': family,
            'source': SOURCES[sid]['url'], 'license': LICENSE,
            'use': r['label'],
        }
    catalog_path.write_text(json.dumps(catalog, indent=1, ensure_ascii=False) + '\n', encoding='utf8')
    docs = ROOT / 'docs/owner-audio-cuts.json'
    docs.write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print(f'catalog extended to {len(catalog)} entries; report at {docs}')


if __name__ == '__main__':
    main()
