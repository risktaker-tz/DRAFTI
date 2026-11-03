#!/usr/bin/env bash
# Generate one new raw take. Existing takes are never overwritten.
set -euo pipefail
if [ "$#" -ne 3 ]; then echo 'Usage: tts_make.sh <jam|kazi> <exact text> <new output.wav>' >&2; exit 2; fi
voice="$1"; line="$2"; output="$3"
case "$voice" in jam|kazi) ;; *) echo 'Voice must be jam or kazi' >&2; exit 2;; esac
command -v z-ai >/dev/null || { echo 'z-ai CLI unavailable; preserve existing voices and do not substitute SpeechSynthesis.' >&2; exit 1; }
[ ! -e "$output" ] || { echo 'Output exists; choose a new filename' >&2; exit 1; }
mkdir -p "$(dirname "$output")"
staging="$(mktemp -d)"
trap 'rm -f -- "$staging/take.wav" "$staging/log"; rmdir -- "$staging"' EXIT
for attempt in 1 2 3 4 5 6; do
  if z-ai tts -i "$line" -o "$staging/take.wav" --voice "$voice" --format wav >"$staging/log" 2>&1; then
    [ -s "$staging/take.wav" ] || { echo 'TTS returned empty audio' >&2; exit 1; }
    cp -- "$staging/take.wav" "$output"
    echo "Generated $output; process with scripts/voice_proc.py"
    exit 0
  fi
  cat "$staging/log" >&2
  if ! grep -Eqi '429|rate.?limit|too many requests' "$staging/log" || [ "$attempt" -eq 6 ]; then exit 1; fi
  echo 'Rate limited; retrying in 35 seconds' >&2
  sleep 35
done
