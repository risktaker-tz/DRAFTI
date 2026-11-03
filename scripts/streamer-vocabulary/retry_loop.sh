#!/usr/bin/env bash
# Patient single-attempt retry loop over FAILED sentences of one voice.
# Cycles: one TTS attempt per failed id, cooldowns when a cycle yields
# nothing. Stops when no failed ids remain for the voice (or time limit).
# Usage: retry_loop.sh <voice-prefix> [max-minutes]
set -u
cd /home/z/my-project/audience-work
VOICE="$1"; MAXMIN="${2:-240}"
START=$(date +%s)
cooldown=0
while true; do
  NOW=$(date +%s); [ $(( (NOW-START)/60 )) -ge "$MAXMIN" ] && { echo "TIME LIMIT"; break; }
  FAILED=$(python3 -c "
import json
st = json.load(open('scripts/streamer-vocabulary/state.json'))['clips']
print(sum(1 for s,c in st.items() if s.startswith('$VOICE') and c.get('status')=='failed'))")
  [ "$FAILED" -eq 0 ] && { echo "NO FAILURES LEFT"; break; }
  BEFORE=$(python3 -c "
import json
st = json.load(open('scripts/streamer-vocabulary/state.json'))['clips']
print(sum(1 for s,c in st.items() if s.startswith('$VOICE') and c.get('status')=='accepted'))")
  python3 scripts/streamer-vocabulary/generate.py --voice "$VOICE" --count 60 --attempts 1 --failed-only --order reverse 2>&1 | tail -1
  AFTER=$(python3 -c "
import json
st = json.load(open('scripts/streamer-vocabulary/state.json'))['clips']
print(sum(1 for s,c in st.items() if s.startswith('$VOICE') and c.get('status')=='accepted'))")
  echo "cycle: $BEFORE -> $AFTER (failed before: $FAILED)"
  if [ "$AFTER" -eq "$BEFORE" ]; then cooldown=$((cooldown+1)); else cooldown=0; fi
  if [ "$cooldown" -ge 3 ]; then sleep 420; else sleep 75; fi
done