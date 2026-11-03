#!/usr/bin/env python3
"""Transcribe each sliced segment with robust JSON extraction."""
import subprocess, json, glob, os, re

for wav in sorted(glob.glob("/tmp/yt/seg/*.wav")):
    r = subprocess.run(["z-ai", "asr", "-f", wav], capture_output=True, text=True, timeout=180)
    out = r.stdout + r.stderr
    m = re.search(r'\{.*\}', out, re.S)
    text = "?"
    if m:
        try:
            text = json.loads(m.group(0)).get("text", "?")
        except Exception:
            text = "parse-fail"
    print(f"{os.path.basename(wav):26s} -> {text}")
