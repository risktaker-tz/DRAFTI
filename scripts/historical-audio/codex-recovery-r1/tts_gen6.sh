#!/usr/bin/env bash
# DRAFTI voice lines batch 6 — draughts table talk, bait taunts, plan-ruined /
# lucky lines, doom loop taunts, narrow-escape, crowning hype, first blood.
set -u
OUT=/home/z/my-project/scripts/tts_raw6
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

# ---- table talk: the words people actually say over the board ------------------
gen v_tt1 $J "Give a man to get a man. That is draughts, my friend."
gen v_tt2 $K "Keep your back row tight, or you will be sorry."
gen v_tt3 $J "Patience. Draughts punishes the hasty."
gen v_tt4 $K "I would not touch that piece if I were you."
gen v_tt5 $J "Go on. Push it. See what happens."
gen v_tt6 $K "The move is mine, and the move is everything."
gen v_tt7 $J "Careful now. One slip and it is over."
gen v_tt8 $K "You are playing right into my hands."
gen v_tt9 $J "Hmm. You are better than you look."
gen v_tt10 $K "Let us trade. The endgame loves me."

# ---- bait taunts: the engine has laid a piece out as poison --------------------
gen v_bait1 $J "Whatever you do, do not take that piece."
gen v_bait2 $K "That piece is poisoned. Go on, try it."
gen v_bait3 $J "Take the bait. I am begging you."

# ---- plan ruined / lucky lines --------------------------------------------------
gen v_lucky1 $K "You are lucky this time."
gen v_lucky2 $J "Boy, that was some move."
gen v_lucky3 $K "My plan! Ruined!"
gen v_lucky4 $J "Okay, okay. I see you."
gen v_lucky5 $K "You saw that coming? Impressive."

# ---- doom loop: the trapped side is not getting out ----------------------------
gen v_doom1 $J "You are trapped. There is no escape."
gen v_doom2 $K "You are not escaping this one, my friend."
gen v_doom3 $J "Nowhere to run. Nowhere to hide."
gen v_doom4 $K "Make your peace, friend. It is over."
gen v_doom5 $J "I could tell you something, but you already know."

# ---- narrow escape --------------------------------------------------------------
gen v_esc1 $K "A narrow escape! Unbelievable!"
gen v_esc2 $J "You wriggled out of that one?!"

# ---- crowning hype and short stingers ------------------------------------------
gen v_king1 $J "The king has arrived!"
gen v_king2 $K "Bow down. The king is here!"
gen v_first $K "First blood!"
gen v_hurt $J "That one hurt, did it not?"
gen v_mercy $K "Mercy? Never heard of it."

echo "batch 6 complete"
