#!/usr/bin/env bash
# AUDIENCE VIBES Phase B watchdog: self-driving ASR grind with milestone commits.
# GH_TOKEN is passed via environment (never stored in any file).
set -u
cd /home/z/my-project/audience-work
CAP_LOOPS=${CAP_LOOPS:-36}   # 36 x 300 s = 3 h hard cap
PUSH_REF='origin codex/zai-audience-vibes'
helper() { git -c credential.helper='!f() { echo "username=Zacharia"; echo "password=$GH_TOKEN"; }; f' "$@"; }

count() { python3 -c "import json; print(len(json.load(open('audience-pack/review_state/transcripts.json'))))" 2>/dev/null || echo 0; }

last=0
for i in $(seq 1 "$CAP_LOOPS"); do
  sleep 300
  n=$(count)
  echo "[$i] $(date +%H:%M) transcripts=$n"
  if ! pgrep -f '^python3 scripts/audience-vibes/asr_batch' >/dev/null; then
    echo "  worker dead -> clean errors, restart"
    python3 - <<'EOF'
import json
p = 'audience-pack/review_state/transcripts.json'
t = json.load(open(p))
json.dump({k: v for k, v in t.items() if v.get('ok')}, open(p, 'w'))
EOF
    nohup python3 scripts/audience-vibes/asr_batch.py >> /tmp/asr_v7.log 2>&1 &
  fi
  if [ "$n" -ge $((last + 25)) ]; then
    git add audience-pack/review_state/transcripts.json
    git commit -q -m "audience-vibes: ASR milestone - $n speech windows verified" || true
    helper push $PUSH_REF >/dev/null 2>&1 && echo "  committed+pushed @$n" || echo "  commit ok, push failed"
    last=$n
  fi
  # queue empty? (48 initial + 439 queued + few strays)
  if [ "$n" -ge 480 ]; then
    echo "  queue drained -> finalize+validate+push"
    python3 scripts/audience-vibes/finalize_pack.py 2>&1 | tail -1
    timeout 200 python3 scripts/audience-vibes/validate_pack.py 2>&1 | tail -1
    git add audience-pack/ docs/audience-vibes/ scripts/audience-vibes/
    git commit -q -m "audience-vibes: pack update after full ASR pass" || true
    helper push $PUSH_REF >/dev/null 2>&1 && echo "  pushed final"
    break
  fi
done
echo "watchdog exit at $(count) transcripts"