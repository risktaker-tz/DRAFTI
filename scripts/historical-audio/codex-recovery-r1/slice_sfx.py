#!/usr/bin/env python3
"""Slice the sourced meme audios at silence gaps and transcribe each segment."""
import subprocess, os, json, sys

YT = "/tmp/yt"
OUT = f"{YT}/seg"
os.makedirs(OUT, exist_ok=True)

# (file, [(start, end, label)])  -- end = next silence_start (0.15s pad inside)
JOBS = {
    # N1BOQ_9laWs: silences 0.43-0.73, 1.39-3.06, 3.53-6.75, 7.65-10.32, 10.62-12.86, 13.45-15.08, 15.54-end
    "N1BOQ_9laWs": [
        (0.40, 0.76, "s1"),
        (1.36, 3.09, "s2"),
        (3.50, 6.79, "s3"),
        (7.62, 10.36, "s4"),
        (10.59, 12.89, "s5"),
        (13.42, 15.11, "s6"),
        (15.51, 18.08, "s7"),
    ],
    # badboy: speech 0 - 8.07s (end silence 8.07-9.87)
    "badboy": [
        (0.00, 8.10, "b_all"),
    ],
    # NkOeRRj-04k: speech 1.23 - 5.91s
    "NkOeRRj-04k": [
        (1.10, 5.95, "l_all"),
    ],
}

for src, segs in JOBS.items():
    for (a, b, label) in segs:
        wav = f"{OUT}/{src}_{label}.wav"
        mp3 = f"{OUT}/{src}_{label}.mp3"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{YT}/{src}.mp3",
                        "-ss", str(a), "-to", str(b), wav], check=True)
        # loudness
        vol = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", "volumedetect",
                              "-f", "null", "/dev/null"], capture_output=True, text=True).stderr
        mean = [l for l in vol.splitlines() if "mean_volume" in l]
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                    "-of", "csv=p=0", wav], capture_output=True, text=True).stdout.strip())
        print(f"== {src}_{label}  dur={dur:.2f}s  {mean[0].split('] ')[-1] if mean else '?'}")
