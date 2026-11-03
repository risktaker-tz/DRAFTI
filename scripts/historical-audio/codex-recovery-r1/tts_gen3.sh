#!/usr/bin/env bash
# DRAFTI voice lines — full regeneration (fixes truncated speech) + new lines.
# Voice: jam (British announcer), same as before, for continuity.
set -u
OUT=/home/z/my-project/scripts/tts_raw3
mkdir -p "$OUT"
gen() {  # gen <name> <text>
  if [ -s "$OUT/$1.wav" ]; then echo "skip $1 (exists)"; return; fi
  for try in 1 2 3 4 5 6; do
    if z-ai tts -i "$2" -o "$OUT/$1.wav" --voice jam --format wav >/dev/null 2>&1; then
      echo "ok: $1"; return
    fi
    sleep $((try * 8))   # 429 backoff: 8s, 16s, ... before retry
  done
  echo "FAILED: $1"
}

# ---- regenerate all existing lines (speech-safe reprocessing happens later) --
gen magnificent  "Ohhh, magnificent!"
gen chess        "That is chess, not checkers!"
gen legendary    "All hail the king!"
gen onejob       "You had ONE job!"
gen ohno         "Oh no. Oh no no no."
gen wow          "Unbelievable!"
gen king         "Bow before the king!"
gen win          "You win! Well played."
gen lose         "Oh dear. You lost this one."
gen draw         "A draw. How diplomatic."
gen awkward      "Oh dear. That looks awkward."
gen nice         "Nice move."
gen sharp        "Ooh, sharp!"
gen clean        "Clean. Precise. I like it."
gen why          "Why did you do that?!"
gen sure         "Are you sure about that?"
gen curious      "A curious decision."
gen hmm          "Hmm. Interesting choice."
gen cost         "That is going to cost you."
gen trick        "Oho, sneaky. Very sneaky."
gen trap         "What a trap!"
gen crafty       "Crafty. I see what you did there."
gen only         "Only one move works here, and you found it."

# ---- thinking heckles: escalate the longer the player stares at the board ---
gen t1a "Still thinking? Take your time."
gen t1b "Hm. Deep thoughts, I see."
gen t1c "It is just checkers, you know."
gen t1d "Relax. The board is not going anywhere."
gen t2a "Any day now."
gen t2b "You are losing it, mate."
gen t2c "I have seen glaciers move faster."
gen t2d "Did you fall asleep on the board?"
gen t3a "Just agree you lost already."
gen t3b "In that time I could have solved three endgames."
gen t3c "The suspense is killing me."
gen t4a "Should I just play this move for you?"
gen t4b "I ordered food. It arrived. I ate it. Still waiting."
gen t4c "History will remember this pause."
gen t5a "I am growing old here."
gen t5b "Even the pieces have fallen asleep."

# ---- post-thought praise: long think, then a great move ----------------------
gen v_bigbrain    "Big brain moment!"
gen v_worth       "Wow. That was worth the wait!"
gen v_paidoff     "All that thinking paid off!"
gen v_slowsteady  "Slow and steady wins the game!"
gen v_genius      "Okay, genius. I see you."
gen v_masterpiece "A masterpiece. Eventually."

# ---- post-thought savage: long think, then a blunder -------------------------
gen v_thought30 "You thought about that for half a minute?!"
gen v_alltime   "All that time, for THAT?!"
gen v_nosense   "Twenty seconds of thought, zero seconds of sense."

# ---- extras -------------------------------------------------------------------
gen v_undo  "Rewinding history!"
gen v_hint  "Here is a thought."
gen v_new   "Fresh board. Fresh start!"
gen v_win2  "Enjoy it while it lasts!"
gen v_win3  "Rematch? No? Coward."
gen v_lose2 "That was painful to watch."
gen v_lose3 "Do not worry. I go easy on everyone."
gen v_rampage  "On a rampage!"
gen v_rampage2 "Unstoppable!"
gen v_time  "Time!"

echo "----"
ls "$OUT" | wc -l
