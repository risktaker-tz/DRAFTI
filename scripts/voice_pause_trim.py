#!/usr/bin/env python3
"""Inspect or shorten only near-silent internal pauses; never speed up speech.

Dry-run by default. An output must be a separate file. Originals are untouched.
Cuts leave 140 ms of the detected pause on each side of every splice, and every
removed sample must be below -60 dBFS. The output keeps the source head and tail.
"""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile

import numpy as np
from voice_proc import RATE, decode, ffmpeg_path, process


def pause_plan(samples, rate=RATE):
    if rate < 1 or not len(samples) or not np.isfinite(samples).all():
        raise ValueError('Finite, non-empty audio and a positive rate required')
    threshold = 10 ** (-60 / 20)
    quiet = np.abs(samples) <= threshold
    edges = np.diff(np.r_[False, quiet, False].astype(np.int8))
    starts, ends = np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)
    minimum, guard = round(.4 * rate), round(.14 * rate)
    cuts = []
    for start, end in zip(starts, ends):
        # Leave the recording's head/tail alone, including intentional timing.
        if start == 0 or end == len(samples) or end - start < minimum:
            continue
        first, last = int(start + guard), int(end - guard)
        if first < last:
            removed = samples[first:last]
            cuts.append({'first': first, 'last': last,
                         'pauseStart': int(start), 'pauseEnd': int(end),
                         'removedPeakDbFS': float(20 * np.log10(max(1e-12, np.max(np.abs(removed)))))})
    return cuts


def apply_plan(samples, cuts):
    pieces, cursor = [], 0
    for cut in cuts:
        start, end = cut['first'], cut['last']
        if not cursor <= start < end <= len(samples):
            raise ValueError('Unordered or out-of-bounds cut')
        if np.max(np.abs(samples[start:end])) > .001:
            raise ValueError('Refusing to delete non-silent samples')
        pieces.append(samples[cursor:start])
        cursor = end
    pieces.append(samples[cursor:])
    return np.concatenate(pieces)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--ffmpeg')
    args = parser.parse_args()
    executable = ffmpeg_path(args.ffmpeg)
    samples = decode(executable, args.source)
    cuts = pause_plan(samples)
    result = apply_plan(samples, cuts)
    report = {'source': str(args.source),
              'sourceSha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
              'sourceSeconds': len(samples) / RATE, 'resultSeconds': len(result) / RATE,
              'removedSeconds': (len(samples) - len(result)) / RATE,
              'cuts': cuts, 'rate': RATE, 'speechRateChanged': False,
              'scope': 'Only <=-60dBFS internal samples removed, 140ms guards retained on both sides. '
                       'Listening/transcription verification still required before bank integration.'}
    if args.output:
        if args.source.resolve() == args.output.resolve():
            raise ValueError('Source must remain untouched')
        if len(result) / RATE > 6:
            raise ValueError('Cannot meet six seconds with safe silence-only edits; no output written')
        # Reuse the proven peak/encoding processor. The intermediate is lossless.
        import subprocess
        with tempfile.TemporaryDirectory() as directory:
            wav = Path(directory) / 'pause-trim.wav'
            subprocess.run([executable, '-v', 'error', '-f', 'f32le', '-ar', str(RATE),
                            '-ac', '1', '-i', 'pipe:0', str(wav)],
                           input=result.astype('<f4').tobytes(), check=True)
            report['encoded'] = process(wav, args.output, executable, keep_duration=True)
        report['outputSha256'] = hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
