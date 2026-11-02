#!/usr/bin/env bash
# DRAFTI voice lines batch 7 — the big THINK pool (narrator lines for long
# engine thinks + heckles for a slow human), so thinking moments never repeat
# the same clip. Also the two meme recreations: the shrimp-doom line and the
# retirement-ceremony line (the sandbox cannot download the exact clips).
set -u
OUT=/home/z/my-project/scripts/tts_raw7
mkdir -p "$OUT"
gen() {  # gen <name> <voice> <text>
  if [ -s "$OUT/$1.wav" ]; then echo "skip $1 (exists)"; return; fi
  for try in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if z-ai tts -i "$3" -o "$OUT/$1.wav" --voice "$2" --format wav >/dev/null 2>&1; then
      echo "ok: $1"; return
    fi
    sleep 35   # patient 429 backoff (quota shared with ASR/vision)
  done
  echo "FAILED: $1"
}
J=jam
K=kazi

# ---- narrator: watching an engine lost in thought (ai + aivai long thinks) ---
gen th_n01 $J "A few moments later…"
gen th_n02 $K "Meanwhile, on the board…"
gen th_n03 $J "Deep in thought…"
gen th_n04 $K "Still calculating…"
gen th_n05 $J "Counting every man twice."
gen th_n06 $K "The gears are turning…"
gen th_n07 $J "Weighing the whole universe, it seems."
gen th_n08 $K "Careful now. This is the move."
gen th_n09 $J "You could hear a pin drop."
gen th_n10 $K "The think is real."
gen th_n11 $J "Ten moves deep already."
gen th_n12 $K "No rush. No rush at all."
gen th_n13 $J "The kettle has boiled twice."
gen th_n14 $K "Somewhere, a clock just gave up."
gen th_n15 $J "Silence in the hall…"
gen th_n16 $K "It is reading the board like a newspaper."
gen th_n17 $J "Chess would have finished by now."
gen th_n18 $K "Patience. The machine is composing."
gen th_n19 $J "Is it writing a letter? Or a move?"
gen th_n20 $K "The machines are humming tonight."
gen th_n21 $J "Grandmaster pace. Respect it."
gen th_n22 $K "Thinking so hard the lights dimmed."
gen th_n23 $J "Two hours later…"
gen th_n24 $K "Still deciding. Still deciding…"

# ---- heckles: aimed at the human taking their sweet time ---------------------
gen th_h01 $J "Still there?"
gen th_h02 $K "Take your time. We have all week."
gen th_h03 $J "We are waiting…"
gen th_h04 $K "The board misses you."
gen th_h05 $J "Coffee break?"
gen th_h06 $K "Lost in the position?"
gen th_h07 $J "The pieces are patient. I am not."
gen th_h08 $K "Any day now…"
gen th_h09 $J "The clock is watching you."
gen th_h10 $K "My tea is getting cold."
gen th_h11 $J "It is just draughts. Breathe."
gen th_h12 $K "One move. One."
gen th_h13 $J "Sleeping? Wake up, it is your move."
gen th_h14 $K "The chair is comfy, I see."
gen th_h15 $J "Your move has been ready for ages."
gen th_h16 $K "Time flies. Your move does not."
gen th_h17 $J "Think in Swahili if it helps."
gen th_h18 $K "Play when ready. No pressure. Some pressure."
gen th_h19 $J "Deep breath. Now click."
gen th_h20 $K "The engines age while you think."

# ---- meme recreations (sandbox could not fetch the exact viral clips) --------
# shrimp: "Is this the shrimp one??" — the doomed last piece about to be devoured
gen shrimp_a $K "Is this… the shrimp one? Is this the shrimp one?!"
gen shrimp_b $J "Wait. Is this the shrimp one? Ha! It is the shrimp one."
# retire: "How can you allow the one with that skill to retire?!"
gen retire_a $K "How can you allow the one with that skill to retire? How?!"
gen retire_b $J "How can you allow him to retire?! With that skill! How?!"

echo "batch 7 complete"
