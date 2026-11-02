#!/usr/bin/env python3
"""Transcribe sliced segments with retry/backoff; writes /tmp/yt/seg/transcripts.json"""
import subprocess, json, glob, os, re, time

segs = sorted(glob.glob("/tmp/yt/seg/*.wav"))
results = {}
path = "/tmp/yt/seg/transcripts.json"
if os.path.exists(path):
    results = json.load(open(path))

for wav in segs:
    key = os.path.basename(wav)
    if key in results and results[key] not in ("parse-fail", "?"):
        continue
    for attempt in range(6):
        r = subprocess.run(["z-ai", "asr", "-f", wav], capture_output=True, text=True, timeout=180)
        out = r.stdout + r.stderr
        m = re.search(r'\{.*\}', out, re.S)
        if m:
            try:
                results[key] = json.loads(m.group(0)).get("text", "?")
                print(f"{key} -> {results[key]}", flush=True)
                break
            except Exception:
                pass
        if "429" in out or "Too many" in out:
            time.sleep(25 + attempt * 15)
        else:
            results[key] = "no-speech"
            print(f"{key} -> no-speech ({out[-120:] if not m else 'unparseable'})", flush=True)
            break
    json.dump(results, open(path, "w"), indent=1)
print("DONE")
