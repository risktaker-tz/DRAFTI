#!/usr/bin/env bash
# DRAFTI voice lines batch 5 — heavy hits (boy/girl), wrong-piece disappointment,
# feast/trap slaughter, capture-count callouts, AI-vs-AI spectator commentary.
set -u
OUT=/home/z/my-project/scripts/tts_raw5
mkdir -p "$OUT"
gen() {  # gen <name> <voice> <text>
  if [ -s "$OUT/$1.wav" ]; then echo "skip $1 (exists)"; return; fi
  for try in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if z-ai tts -i "$3" -o "$OUT/$1.wav" --voice "$2" --format wav >/dev/null 2>&1; then
      echo "ok: $1"; return
    fi
    sleep 40   # patient 429 backoff (quota shared with ASR/vision)
  done
  echo "FAILED: $1"
}
J=jam
K=kazi

# ---- heavy hits: the boy and the girl both say it -----------------------------
gen v_heavy1 $J "Oof! That was heavy!"
gen v_heavy2 $K "Boy, that was heavy!"
gen v_heavy3 $J "That was personal!"
gen v_heavy4 $K "Heavy! Absolutely heavy!"

# ---- wrong piece: disappointment, blame, laughter -----------------------------
gen v_wrong1 $K "Wrong piece! Hahaha!"
gen v_wrong2 $J "Oh no. Wrong piece. Devastating."
gen v_wrong3 $K "The feast was right there. Wrong piece!"
gen v_wrong4 $J "You had the whole meal, and you picked the wrong piece!"

# ---- feasts and trap slaughters ----------------------------------------------
gen v_feast1 $J "A feast! Three pieces in one trip!"
gen v_feast2 $K "They are eating everything! Somebody stop this!"
gen v_slau1 $J "The trap, the feast, the humiliation!"
gen v_slau2 $K "Into the trap, and the feast began! Hahaha!"

# ---- capture-count callouts ----------------------------------------------------
gen v_double $K "Double!"
gen v_triple  $J "Triple!"
gen v_quad    $J "Quadruple! Sensational!"

# ---- auto-rematch level-up ------------------------------------------------------
gen v_nextup $K "Next level, let us go!"

# ---- AI vs AI spectator commentary ---------------------------------------------
gen v_spec1  $K "Welcome to the arena! Two engines, one board, zero mercy!"
gen v_spec2  $J "He is thinking so hard, the fans just spun up."
gen v_spec3  $K "Deep calculation... or a quick nap? We will never know."
gen v_spec4  $J "Somewhere out there, a kettle is boiling."
gen v_spec5  $K "He checked that line twice. Thrice. Four times."
gen v_spec6  $J "Take your time. I brought snacks."
gen v_spec7  $K "OH! Brutal!"
gen v_spec8  $J "Gone. Just gone."
gen v_spec9  $K "What a finish! Roll on the next level!"
gen v_spec10 $J "Next level, here we come!"

echo "batch 5 complete"
