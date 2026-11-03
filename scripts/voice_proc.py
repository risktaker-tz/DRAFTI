#!/usr/bin/env python3
"""Process a new voice/effect without truncating speech or replacing files by default."""
import argparse, math, os, pathlib, shutil, subprocess, tempfile
import numpy as np
RATE = 22050
TARGET = 10 ** (-1.5 / 20)

def ffmpeg_path(value=None):
    bundled = pathlib.Path(__file__).parent / 'tooling/node_modules/ffmpeg-static/ffmpeg.exe'
    return value or os.environ.get('FFMPEG') or shutil.which('ffmpeg') or (str(bundled) if bundled.exists() else 'ffmpeg')

def decode(executable, source):
    result = subprocess.run([executable, '-v', 'error', '-i', str(source), '-ac', '1', '-ar', str(RATE), '-f', 'f32le', 'pipe:1'], check=True, capture_output=True)
    return np.frombuffer(result.stdout, dtype='<f4').copy()

def process(source, destination, executable, maximum=6.0, overwrite=False, bitrate=56, keep_duration=False):
    if bitrate not in (16, 24, 32, 40, 48, 56):
        raise ValueError('Bitrate must be a supported mono MP3 rate at or below 56 kbps')
    source, destination = pathlib.Path(source), pathlib.Path(destination)
    if source.resolve() == destination.resolve():
        raise ValueError('Input and output must be different files')
    if destination.exists() and not overwrite:
        raise FileExistsError('Output exists; use a new name or explicit --overwrite')
    samples = decode(executable, source)
    if not len(samples) or not np.isfinite(samples).all():
        raise ValueError('Empty or non-finite audio')
    peak = float(np.max(np.abs(samples)))
    if peak <= 1e-7:
        raise ValueError('No audible signal')
    # Conservative threshold with a generous retained speech guard on each end.
    if not keep_duration:
        active = np.flatnonzero(np.abs(samples) >= max(1e-6, peak * .001))
        first, last = int(active[0]), int(active[-1]) + 1
        head, tail = round(.120 * RATE), round(.220 * RATE)
        start, end = max(0, first - head), min(len(samples), last + tail)
        samples = samples[start:end]
        samples = np.pad(samples, (max(0, head-first), max(0, last+tail-end)))
    if len(samples)/RATE > maximum:
        raise ValueError(f'Speech with padding is {len(samples)/RATE:.3f}s, above {maximum}s; no speech was cut')
    samples *= TARGET / float(np.max(np.abs(samples)))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as staging:
        encoded = pathlib.Path(staging) / 'processed.mp3'
        best_bytes, best_peak = None, 0.0
        for attempt in range(8):
            subprocess.run([executable, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', 'pipe:0', '-codec:a', 'libmp3lame', '-b:a', f'{bitrate}k', str(encoded)], input=samples.astype('<f4').tobytes(), check=True)
            measured = float(np.max(np.abs(decode(executable, encoded))))
            if measured <= TARGET and measured > best_peak:
                best_bytes, best_peak = encoded.read_bytes(), measured
            if measured <= TARGET and measured >= TARGET * 10 ** (-.15 / 20):
                break
            samples *= TARGET / measured * .99
        if best_bytes is None:
            raise ValueError('Encoded peak could not be normalized safely')
        encoded.write_bytes(best_bytes)
        measured = best_peak
        if encoded.stat().st_size > 61440:
            raise ValueError('Encoded clip exceeds 60 KB')
        if destination.exists():
            backup = destination.with_suffix(destination.suffix + '.bak')
            if backup.exists():
                raise FileExistsError('Backup already exists; preserve it and choose a new output')
            shutil.copy2(destination, backup)
        shutil.copy2(encoded, destination)
    return {'seconds': round(len(samples)/RATE, 4), 'peakDbFS': round(20*math.log10(measured), 3), 'bytes': destination.stat().st_size}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source'); parser.add_argument('destination')
    parser.add_argument('--ffmpeg'); parser.add_argument('--max-seconds', type=float, default=6.0)
    parser.add_argument('--overwrite', action='store_true')
    parser.add_argument('--bitrate', type=int, default=56)
    parser.add_argument('--keep-duration', action='store_true', help='Preserve an explicitly selected original excerpt without silence trimming/padding')
    args = parser.parse_args()
    print(process(args.source, args.destination, ffmpeg_path(args.ffmpeg), args.max_seconds, args.overwrite, args.bitrate, args.keep_duration))
if __name__ == '__main__': main()
