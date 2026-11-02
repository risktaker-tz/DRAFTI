#!/usr/bin/env bash
# DRAFTI batch 7b — the same think-pool texts in the other voice,
# doubling the pool so no voice clip repeats until ~130 draws.
set -u
OUT=/home/z/my-project/scripts/tts_raw7
mkdir -p "$OUT"
gen() {
  if [ -s "$OUT/$1.wav" ]; then echo "skip $1 (exists)"; return; fi
  for try in 1 2 3 4 5 6 7 8 9 10; do
    if z-ai tts -i "$3" -o "$OUT/$1.wav" --voice "$2" --format wav >/dev/null 2>&1; then
      echo "ok: $1"; return; fi
    sleep 35
  done
  echo "FAILED: $1"
}
J=jam
K=kazi

gen th_n01b $K "A few moments later…"
gen th_n02b $J "Meanwhile, on the board…"
gen th_n03b $K "Deep in thought…"
gen th_n04b $J "Still calculating…"
gen th_n05b $K "Counting every man twice."
gen th_n06b $J "The gears are turning…"
gen th_n07b $K "Weighing the whole universe, it seems."
gen th_n08b $J "Careful now. This is the move."
gen th_n09b $K "You could hear a pin drop."
gen th_n10b $J "The think is real."
gen th_n11b $K "Ten moves deep already."
gen th_n12b $J "No rush. No rush at all."
gen th_n13b $K "The kettle has boiled twice."
gen th_n14b $J "Somewhere, a clock just gave up."
gen th_n15b $K "Silence in the hall…"
gen th_n16b $J "It is reading the board like a newspaper."
gen th_n17b $K "Chess would have finished by now."
gen th_n18b $J "Patience. The machine is composing."
gen th_n19b $K "Is it writing a letter? Or a move?"
gen th_n20b $J "The machines are humming tonight."
gen th_n21b $K "Grandmaster pace. Respect it."
gen th_n22b $J "Thinking so hard the lights dimmed."
gen th_n23b $K "Two hours later…"
gen th_n24b $J "Still deciding. Still deciding…"
gen th_h01b $K "Still there?"
gen th_h02b $J "Take your time. We have all week."
gen th_h03b $K "We are waiting…"
gen th_h04b $J "The board misses you."
gen th_h05b $K "Coffee break?"
gen th_h06b $J "Lost in the position?"
gen th_h07b $K "The pieces are patient. I am not."
gen th_h08b $J "Any day now…"
gen th_h09b $K "The clock is watching you."
gen th_h10b $J "My tea is getting cold."
gen th_h11b $K "It is just draughts. Breathe."
gen th_h12b $J "One move. One."
gen th_h13b $K "Sleeping? Wake up, it is your move."
gen th_h14b $J "The chair is comfy, I see."
gen th_h15b $K "Your move has been ready for ages."
gen th_h16b $J "Time flies. Your move does not."
gen th_h17b $K "Think in Swahili if it helps."
gen th_h18b $J "Play when ready. No pressure. Some pressure."
gen th_h19b $K "Deep breath. Now click."
gen th_h20b $J "The engines age while you think."
