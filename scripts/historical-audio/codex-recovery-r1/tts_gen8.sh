#!/usr/bin/env bash
# DRAFTI voice lines batch 8 — the arena roster introduces itself.
set -u
OUT=/home/z/my-project/scripts/tts_raw8
mkdir -p "$OUT"
gen() {
  if [ -s "$OUT/$1.wav" ]; then echo "skip $1 (exists)"; return; fi
  for try in 1 2 3 4 5 6 7 8 9 10; do
    if z-ai tts -i "$3" -o "$OUT/$1.wav" --voice "$2" --format wav >/dev/null 2>&1; then
      echo "ok: $1"; return
    fi
    sleep 30
  done
  echo "FAILED: $1"
}
J=jam
K=kazi

gen roster_simba   $J "I am Simba. The king of the board."
gen roster_yanga   $K "Yanga! Pride of the people. Let us play."
gen roster_twiga   $J "I am Twiga. I see the whole board from up here."
gen roster_tembo   $K "Tembo never forgets. And Tembo never rushes."
gen roster_chui    $J "Chui. I stalk in silence."
gen roster_duma    $K "Duma! Fast, fearless, gone."
gen roster_kifaru  $J "I am Kifaru. I charge straight through."
gen roster_nyati   $K "Nyati holds the ground. Try me."
gen roster_fisi    $J "Fisi! Ha! I am already laughing at your plan."
gen roster_sungura $K "Sungura. Quick, clever — catch me if you can."

echo "batch 8 complete"
