#!/usr/bin/env bash
# DRAFTI voice lines batch 4 — trap drama, style personas, ladder, extras.
# Main judge: jam (British announcer, continuity). Style intros: kazi (new persona voice).
set -u
OUT=/home/z/my-project/scripts/tts_raw4
mkdir -p "$OUT"
gen() {  # gen <name> <voice> <text>
  if [ -s "$OUT/$1.wav" ]; then echo "skip $1 (exists)"; return; fi
  for try in 1 2 3 4 5 6; do
    if z-ai tts -i "$3" -o "$OUT/$1.wav" --voice "$2" --format wav >/dev/null 2>&1; then
      echo "ok: $1"; return
    fi
    sleep $((try * 8))   # 429 backoff
  done
  echo "FAILED: $1"
}
J=jam
K=kazi

# ---- trap drama ---------------------------------------------------------------
gen v_taw1 $J "Your trap snapped shut!"
gen v_taw2 $J "Beautifully baited. They never saw it."
gen v_taw3 $J "The trap springs shut!"
gen v_tbf1 $J "Oh no. You took the bait!"
gen v_tbf2 $J "That was a trap, and you walked right in."
gen v_tbf3 $J "The bait was set, and you swallowed it whole."
gen v_tad1 $J "Denied. Not today."
gen v_tad2 $J "I saw that trap a mile away."
gen v_tad3 $J "Too clever by half. Not biting."
gen v_tbd1 $J "Good read. Not biting that."
gen v_tbd2 $J "You saw the trap and stepped around it."
gen v_tbd3 $J "Well spotted. The bait stays on the table."
gen v_aim1 $J "It set a trap, and then forgot to use it?!"
gen v_aim2 $J "The trap was armed, and abandoned. Astonishing."

# ---- style intros (second voice: the opponents introduce themselves) ----------
gen s_in_classic   $K "Classic school. No tricks, no mercy. Let us play."
gen s_in_american  $K "American school coming through. Straight, solid, ruthless."
gen s_in_english   $K "English positional school. I do not rush. I suffocate."
gen s_in_italian   $K "Italian Furioso! Attack first, ask questions never!"
gen s_in_spanish   $K "Spanish school. The long diagonal is my kingdom."
gen s_in_czech     $K "Czech Fortress. Knock all you like. The door stays shut."
gen s_in_french    $K "French school. Beauty first. Chaos is for other people."
gen s_in_russian   $K "Russian school. Care for a gambit? I have plenty."
gen s_in_kenyan    $K "Kenyan hustle! Fast hands, sharp traps, no apologies!"
gen s_in_tanzanian $K "Tanzanian school. Even I do not know my next move."
gen s_in_brazilian $K "Brazilian school! Feel the rhythm of the board!"
gen s_in_mongolian $K "Mongolian school. I will crown my kings and raid everything."

# ---- style catchphrases (main judge voice reading the persona) ----------------
gen s_classic_1   $J "Textbook."
gen s_classic_2   $J "As the classics demand."
gen s_american_1  $J "Plain, honest checkers."
gen s_american_2  $J "Nothing fancy. It just works."
gen s_english_1   $J "Slowly, slowly, catchy monkey."
gen s_english_2   $J "Position first. Excuses later."
gen s_italian_1   $J "Bellissimo! What an attack!"
gen s_italian_2   $J "Fortune favours the bold, no?"
gen s_spanish_1   $J "Around the flank we go!"
gen s_spanish_2   $J "The diagonal never lies."
gen s_czech_1     $J "The wall holds."
gen s_czech_2     $J "Patience. Everything grinds eventually."
gen s_french_1    $J "Elegant, non?"
gen s_french_2    $J "Another masterpiece in motion."
gen s_russian_1   $J "The gambit continues!"
gen s_russian_2   $J "Chaos is a ladder."
gen s_kenyan_1    $J "Hustle and flow!"
gen s_kenyan_2    $J "The streets are watching!"
gen s_tanzanian_1 $J "Surprise!"
gen s_tanzanian_2 $J "Was that planned? Perhaps."
gen s_brazilian_1 $J "That is the samba of the squares!"
gen s_brazilian_2 $J "Feel the rhythm!"
gen s_mongolian_1 $J "The raid begins!"
gen s_mongolian_2 $J "Kings ride far!"

# ---- difficulty ladder ---------------------------------------------------------
gen v_levelup1 $J "Incredible! You just conquered a higher level!"
gen v_levelup2 $J "A new peak! The ladder trembles!"
gen v_streak1  $J "Three wins in a row. You are on fire!"
gen v_streak2  $J "Another one! The streak lives!"
gen v_beatgm1  $J "You beat a grandmaster level. Frame this game."
gen v_beatgm2  $J "Grandmaster, meet your match."

# ---- extra think heckles --------------------------------------------------------
gen t1e $J "The kettle boiled twice already."
gen t2e $J "I aged twice watching this."
gen t3d $J "The paint is drying faster."
gen t4d $J "Take your time. I have booked a holiday."
gen t5c $J "The sun has set on this turn."

# ---- verdict extras --------------------------------------------------------------
gen v_inacc1 $J "A slight wobble."
gen v_inacc2 $J "That drifts a little."
gen v_hold1  $J "That holds everything."
gen v_hold2  $J "Solid as a wall."
gen v_come1  $J "Repaired! Strong recovery."
gen v_come2  $J "Water under the bridge. Well fixed."

# ---- crowd reactions ---------------------------------------------------------------
gen v_ooh1  $J "Ooooh!"
gen v_gasp1 $J "Oh! Did you see that?!"

echo "----"
ls "$OUT" | wc -l
