#!/usr/bin/env bash
# DRAFTI — one-command swap-in of the EXACT original meme clips.
#
# This sandbox could not download from YouTube (bot-wall + Content-ID claim),
# so the bank ships with in-house voice RECREATIONS. When you save the real
# clips on any normal device, this script trims and installs them for you.
#
# Usage:  bash swap.sh <file> retire    # first 15 s of the short, as-is
#         bash swap.sh <file> shrimp    # the shrimp moment clip (first 15 s)
# Examples:
#   bash swap.sh ~/Downloads/KBVNiOAnHiA.mp4 retire
#   bash swap.sh ~/Downloads/shrimp.mp3 shrimp
# Then rebuild:  python3 build_web.py   (from the DRAFTI folder)
set -euo pipefail
DRAFTI="$(cd "$(dirname "$0")/.." && pwd)"
FILE="${1:-}"; KIND="${2:-}"
[ -f "$FILE" ] || { echo "usage: bash swap.sh <audio-or-video-file> <retire|shrimp>"; exit 1; }
case "$KIND" in
  retire) OUT="v_retire_orig" ;;
  shrimp) OUT="shrimp_orig" ;;
  *) echo "kind must be 'retire' or 'shrimp'"; exit 1 ;;
esac
ffmpeg -v error -y -i "$FILE" -t 15 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100" \
  -codec:a libmp3lame -b:a 96k "$DRAFTI/src/audio/$OUT.mp3"
echo "installed src/audio/$OUT.mp3"
echo "now rebuild:  cd $DRAFTI && python3 build_web.py"
