#!/usr/bin/env bash
# One streamer-vocabulary batch: generate (resumable), validate, commit, push.
# Usage: batch.sh <voice-prefix> <count> <range-label> <running-totals-label>
# GH_TOKEN must be in the environment for the push.
set -euo pipefail
cd /home/z/my-project/audience-work
VOICE="$1"; COUNT="$2"; RANGE="$3"; TOTALS="$4"
python3 scripts/streamer-vocabulary/generate.py --voice "$VOICE" --count "$COUNT"
python3 scripts/streamer-vocabulary/validate.py --asr 2
python3 scripts/streamer-vocabulary/finalize_docs.py
git add streamer-pack/ scripts/streamer-vocabulary/
git commit -q -m "streamer-vocabulary: $RANGE - batch accepted (running $TOTALS)"
git -c credential.helper='!f() { echo "username=Zacharia"; echo "password=$GH_TOKEN"; }; f' push origin codex/zai-streamer-vocabulary 2>&1 | grep -viE 'token|remote' | tail -1
git log --oneline -1 | cat