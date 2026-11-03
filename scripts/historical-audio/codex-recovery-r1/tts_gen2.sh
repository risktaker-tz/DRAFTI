#!/usr/bin/env bash
# DRAFTI — batch 2 voice lines: the "judge" (accurate / mistake / trick).
# Voice: jam (British announcer) to match batch 1.
set -e
OUT=/home/z/my-project/scripts/tts_raw2
mkdir -p "$OUT"
gen() { z-ai tts -i "$2" -o "$OUT/$1.wav" --voice jam --format wav && echo "ok: $1"; }

gen nice    "Nice move."
gen sharp   "Ooh, sharp!"
gen clean   "Clean. Precise. I like it."
gen why     "Why did you do that?!"
gen sure    "Are you sure about that?"
gen curious "A curious decision."
gen hmm     "Hmm. Interesting choice."
gen cost    "That is going to cost you."
gen trick   "Oho, sneaky. Very sneaky."
gen trap    "What a trap!"
gen crafty  "Crafty. I see what you did there."
gen only    "Only one move works here, and you found it."
