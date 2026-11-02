#!/usr/bin/env python3
"""Install the two authorized shrimp slots from the same verified original take.

Supply the mono 16 kHz WAV from the requested mvUVrweNvsQ source. The source
contains one question, not two takes. Existing recreations are backed up before
installation; only these two explicitly requested replacements are written.
"""
import argparse, hashlib, json, pathlib, shutil, subprocess, tempfile
from voice_proc import process, ffmpeg_path

ROOT = pathlib.Path(__file__).resolve().parents[1]
CUTS = {'shrimp1': (11.105, 12.570), 'shrimp2': (11.105, 13.150)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=pathlib.Path)
    parser.add_argument('--ffmpeg')
    args = parser.parse_args()
    source_hash = hashlib.sha256(args.source.read_bytes()).hexdigest()
    if source_hash != 'e4e81189738e74655c30462b80aac7234f6f4fa05f180bda3c39a453b9a9fc83':
        raise ValueError('Source WAV does not match the exact recording used for the transcription evidence')
    executable = ffmpeg_path(args.ffmpeg)
    report = {'source': 'https://youtube.com/shorts/mvUVrweNvsQ',
              'sourceWavSha256': source_hash,
              'takeCount': 1, 'note': 'Two framings of the same original question; no fabricated second take.',
              'cuts': {}}
    with tempfile.TemporaryDirectory() as staging:
        for name, (start, end) in CUTS.items():
            raw, output = pathlib.Path(staging) / (name + '.wav'), pathlib.Path(staging) / (name + '.mp3')
            subprocess.run([executable, '-v', 'error', '-y', '-i', str(args.source), '-ss', str(start),
                            '-t', str(end-start), '-ac', '1', '-ar', '22050', str(raw)], check=True)
            result = process(raw, output, executable, maximum=3.5, keep_duration=True)
            destination = ROOT / 'src/audio' / (name + '.mp3')
            backup = ROOT / 'sfx_swap/backups' / destination.name
            if destination.exists() and not backup.exists():
                shutil.copy2(destination, backup)
            shutil.copy2(output, destination)
            report['cuts'][name] = {'sourceStart': start, 'sourceEnd': end, **result,
                                    'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}
    (ROOT/'docs/shrimp-original-cuts.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf8')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
