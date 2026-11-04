#!/usr/bin/env bash
# Sparse probe mode: the z-ai quota has been closed for many hours. If the
# limiter counts ALL requests (not only successes), dense probing prolongs
# the lockout. So: one single TTS attempt every PROBE_INTERVAL seconds; on
# the first success, harvest the window with a full foreground burst, then
# return to sparse mode. Usage: sparse_probe.sh <voice> [max-minutes]
set -u
cd /home/z/my-project/audience-work
VOICE="$1"; MAXMIN="${2:-240}"
START=$(date +%s)
while true; do
  NOW=$(date +%s); [ $(( (NOW-START)/60 )) -ge "$MAXMIN" ] && { echo "TIME LIMIT"; break; }
  BEFORE=$(python3 -c "
import json
st = json.load(open('scripts/streamer-vocabulary/state.json'))['clips']
print(sum(1 for s,c in st.items() if s.startswith('$VOICE') and c.get('status')=='accepted'))")
  # one request only
  python3 scripts/streamer-vocabulary/generate.py --voice "$VOICE" --count 1 --attempts 1 --failed-only 2>&1 | tail -1
  AFTER=$(python3 -c "
import json
st = json.load(open('scripts/streamer-vocabulary/state.json'))['clips']
print(sum(1 for s,c in st.items() if s.startswith('$VOICE') and c.get('status')=='accepted'))")
  echo "$(date +%H:%M) sparse probe: $BEFORE -> $AFTER"
  if [ "$AFTER" -gt "$BEFORE" ]; then
    echo "window open - harvesting"
    python3 scripts/streamer-vocabulary/generate.py --voice "$VOICE" --count 40 --attempts 2 2>&1 | tail -1
  else
    sleep 600
  fi
done