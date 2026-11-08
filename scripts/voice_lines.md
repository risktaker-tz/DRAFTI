# DRAFTI historical voice-line transcripts

This is the recovered historical inventory, including batches that were never rendered. A transcript is not proof that a matching sound is banked. Existing manifest IDs remain authoritative; batch 8 roster lines and the shrimp retake batch are historical only.

Parsed verbatim from the tts_gen*.sh scripts in this folder.
Voice **jam** = the British judge; voice **kazi** = the persona announcer.
Regeneration command per line:
`z-ai tts -i "<text>" -o <batch_dir>/<name>.wav --voice <jam|kazi> --format wav`
(retry on HTTP 429, ~35 s backoff), then process per voice_proc*.py:
trim silence (never speech), 120 ms head / 220 ms tail, peak-normalize
to -1.5 dBFS, mono 22050 Hz, MP3 56 kbps.

## tts_gen2.sh

!/usr/bin/env bash DRAFTI — batch 2 voice lines: the "judge" (accurate / mistake / trick). Voice: jam (British announcer) to match batch 1.

| name | voice | text |
| --- | --- | --- |
| nice | jam | Nice move. |
| sharp | jam | Ooh, sharp! |
| clean | jam | Clean. Precise. I like it. |
| why | jam | Why did you do that?! |
| sure | jam | Are you sure about that? |
| curious | jam | A curious decision. |
| hmm | jam | Hmm. Interesting choice. |
| cost | jam | That is going to cost you. |
| trick | jam | Oho, sneaky. Very sneaky. |
| trap | jam | What a trap! |
| crafty | jam | Crafty. I see what you did there. |
| only | jam | Only one move works here, and you found it. |

## tts_gen3.sh

!/usr/bin/env bash DRAFTI voice lines — full regeneration (fixes truncated speech) + new lines. Voice: jam (British announcer), same as before, for continuity. ---- regenerate all existing lines (speech-safe reprocessing happens later) --

| name | voice | text |
| --- | --- | --- |
| magnificent | jam | Ohhh, magnificent! |
| chess | jam | That is chess, not checkers! |
| legendary | jam | All hail the king! |
| onejob | jam | You had ONE job! |
| ohno | jam | Oh no. Oh no no no. |
| wow | jam | Unbelievable! |
| king | jam | Bow before the king! |
| win | jam | You win! Well played. |
| lose | jam | Oh dear. You lost this one. |
| draw | jam | A draw. How diplomatic. |
| awkward | jam | Oh dear. That looks awkward. |
| nice | jam | Nice move. |
| sharp | jam | Ooh, sharp! |
| clean | jam | Clean. Precise. I like it. |
| why | jam | Why did you do that?! |
| sure | jam | Are you sure about that? |
| curious | jam | A curious decision. |
| hmm | jam | Hmm. Interesting choice. |
| cost | jam | That is going to cost you. |
| trick | jam | Oho, sneaky. Very sneaky. |
| trap | jam | What a trap! |
| crafty | jam | Crafty. I see what you did there. |
| only | jam | Only one move works here, and you found it. |
| t1a | jam | Still thinking? Take your time. |
| t1b | jam | Hm. Deep thoughts, I see. |
| t1c | jam | It is just checkers, you know. |
| t1d | jam | Relax. The board is not going anywhere. |
| t2a | jam | Any day now. |
| t2b | jam | You are losing it, mate. |
| t2c | jam | I have seen glaciers move faster. |
| t2d | jam | Did you fall asleep on the board? |
| t3a | jam | Just agree you lost already. |
| t3b | jam | In that time I could have solved three endgames. |
| t3c | jam | The suspense is killing me. |
| t4a | jam | Should I just play this move for you? |
| t4b | jam | I ordered food. It arrived. I ate it. Still waiting. |
| t4c | jam | History will remember this pause. |
| t5a | jam | I am growing old here. |
| t5b | jam | Even the pieces have fallen asleep. |
| v_bigbrain | jam | Big brain moment! |
| v_worth | jam | Wow. That was worth the wait! |
| v_paidoff | jam | All that thinking paid off! |
| v_slowsteady | jam | Slow and steady wins the game! |
| v_genius | jam | Okay, genius. I see you. |
| v_masterpiece | jam | A masterpiece. Eventually. |
| v_thought30 | jam | You thought about that for half a minute?! |
| v_alltime | jam | All that time, for THAT?! |
| v_nosense | jam | Twenty seconds of thought, zero seconds of sense. |
| v_undo | jam | Rewinding history! |
| v_hint | jam | Here is a thought. |
| v_new | jam | Fresh board. Fresh start! |
| v_win2 | jam | Enjoy it while it lasts! |
| v_win3 | jam | Rematch? No? Coward. |
| v_lose2 | jam | That was painful to watch. |
| v_lose3 | jam | Do not worry. I go easy on everyone. |
| v_rampage | jam | On a rampage! |
| v_rampage2 | jam | Unstoppable! |
| v_time | jam | Time! |

## tts_gen4.sh

!/usr/bin/env bash DRAFTI voice lines batch 4 — trap drama, style personas, ladder, extras. Main judge: jam (British announcer, continuity). Style intros: kazi (new persona voice). ---- trap drama ---------------------------------------------------------------

| name | voice | text |
| --- | --- | --- |
| v_taw1 | jam | Your trap snapped shut! |
| v_taw2 | jam | Beautifully baited. They never saw it. |
| v_taw3 | jam | The trap springs shut! |
| v_tbf1 | jam | Oh no. You took the bait! |
| v_tbf2 | jam | That was a trap, and you walked right in. |
| v_tbf3 | jam | The bait was set, and you swallowed it whole. |
| v_tad1 | jam | Denied. Not today. |
| v_tad2 | jam | I saw that trap a mile away. |
| v_tad3 | jam | Too clever by half. Not biting. |
| v_tbd1 | jam | Good read. Not biting that. |
| v_tbd2 | jam | You saw the trap and stepped around it. |
| v_tbd3 | jam | Well spotted. The bait stays on the table. |
| v_aim1 | jam | It set a trap, and then forgot to use it?! |
| v_aim2 | jam | The trap was armed, and abandoned. Astonishing. |
| s_in_classic | kazi | Classic school. No tricks, no mercy. Let us play. |
| s_in_american | kazi | American school coming through. Straight, solid, ruthless. |
| s_in_english | kazi | English positional school. I do not rush. I suffocate. |
| s_in_italian | kazi | Italian Furioso! Attack first, ask questions never! |
| s_in_spanish | kazi | Spanish school. The long diagonal is my kingdom. |
| s_in_czech | kazi | Czech Fortress. Knock all you like. The door stays shut. |
| s_in_french | kazi | French school. Beauty first. Chaos is for other people. |
| s_in_russian | kazi | Russian school. Care for a gambit? I have plenty. |
| s_in_kenyan | kazi | Kenyan hustle! Fast hands, sharp traps, no apologies! |
| s_in_tanzanian | kazi | Tanzanian school. Even I do not know my next move. |
| s_in_brazilian | kazi | Brazilian school! Feel the rhythm of the board! |
| s_in_mongolian | kazi | Mongolian school. I will crown my kings and raid everything. |
| s_classic_1 | jam | Textbook. |
| s_classic_2 | jam | As the classics demand. |
| s_american_1 | jam | Plain, honest checkers. |
| s_american_2 | jam | Nothing fancy. It just works. |
| s_english_1 | jam | Slowly, slowly, catchy monkey. |
| s_english_2 | jam | Position first. Excuses later. |
| s_italian_1 | jam | Bellissimo! What an attack! |
| s_italian_2 | jam | Fortune favours the bold, no? |
| s_spanish_1 | jam | Around the flank we go! |
| s_spanish_2 | jam | The diagonal never lies. |
| s_czech_1 | jam | The wall holds. |
| s_czech_2 | jam | Patience. Everything grinds eventually. |
| s_french_1 | jam | Elegant, non? |
| s_french_2 | jam | Another masterpiece in motion. |
| s_russian_1 | jam | The gambit continues! |
| s_russian_2 | jam | Chaos is a ladder. |
| s_kenyan_1 | jam | Hustle and flow! |
| s_kenyan_2 | jam | The streets are watching! |
| s_tanzanian_1 | jam | Surprise! |
| s_tanzanian_2 | jam | Was that planned? Perhaps. |
| s_brazilian_1 | jam | That is the samba of the squares! |
| s_brazilian_2 | jam | Feel the rhythm! |
| s_mongolian_1 | jam | The raid begins! |
| s_mongolian_2 | jam | Kings ride far! |
| v_levelup1 | jam | Incredible! You just conquered a higher level! |
| v_levelup2 | jam | A new peak! The ladder trembles! |
| v_streak1 | jam | Three wins in a row. You are on fire! |
| v_streak2 | jam | Another one! The streak lives! |
| v_beatgm1 | jam | You beat a grandmaster level. Frame this game. |
| v_beatgm2 | jam | Grandmaster, meet your match. |
| t1e | jam | The kettle boiled twice already. |
| t2e | jam | I aged twice watching this. |
| t3d | jam | The paint is drying faster. |
| t4d | jam | Take your time. I have booked a holiday. |
| t5c | jam | The sun has set on this turn. |
| v_inacc1 | jam | A slight wobble. |
| v_inacc2 | jam | That drifts a little. |
| v_hold1 | jam | That holds everything. |
| v_hold2 | jam | Solid as a wall. |
| v_come1 | jam | Repaired! Strong recovery. |
| v_come2 | jam | Water under the bridge. Well fixed. |
| v_ooh1 | jam | Ooooh! |
| v_gasp1 | jam | Oh! Did you see that?! |

## tts_gen5.sh

!/usr/bin/env bash DRAFTI voice lines batch 5 — heavy hits (boy/girl), wrong-piece disappointment, feast/trap slaughter, capture-count callouts, AI-vs-AI spectator commentary. ---- heavy hits: the boy and the girl both say it -----------------------------

| name | voice | text |
| --- | --- | --- |
| v_heavy1 | jam | Oof! That was heavy! |
| v_heavy2 | kazi | Boy, that was heavy! |
| v_heavy3 | jam | That was personal! |
| v_heavy4 | kazi | Heavy! Absolutely heavy! |
| v_wrong1 | kazi | Wrong piece! Hahaha! |
| v_wrong2 | jam | Oh no. Wrong piece. Devastating. |
| v_wrong3 | kazi | The feast was right there. Wrong piece! |
| v_wrong4 | jam | You had the whole meal, and you picked the wrong piece! |
| v_feast1 | jam | A feast! Three pieces in one trip! |
| v_feast2 | kazi | They are eating everything! Somebody stop this! |
| v_slau1 | jam | The trap, the feast, the humiliation! |
| v_slau2 | kazi | Into the trap, and the feast began! Hahaha! |
| v_double | kazi | Double! |
| v_triple | jam | Triple! |
| v_quad | jam | Quadruple! Sensational! |
| v_nextup | kazi | Next level, let us go! |
| v_spec1 | kazi | Welcome to the arena! |
| v_spec2 | jam | He is thinking so hard, the fans just spun up. |
| v_spec3 | kazi | Deep calculation... or a quick nap? We will never know. |
| v_spec4 | jam | Somewhere out there, a kettle is boiling. |
| v_spec5 | kazi | He checked that line twice. Thrice. Four times. |
| v_spec6 | jam | Take your time. I brought snacks. |
| v_spec7 | kazi | OH! Brutal! |
| v_spec8 | jam | Gone. Just gone. |
| v_spec9 | kazi | What a finish! Roll on the next level! |
| v_spec10 | jam | Next level, here we come! |

## tts_gen6.sh

!/usr/bin/env bash DRAFTI voice lines batch 6 — draughts table talk, bait taunts, plan-ruined / lucky lines, doom loop taunts, narrow-escape, crowning hype, first blood. ---- table talk: the words people actually say over the board ------------------

| name | voice | text |
| --- | --- | --- |
| v_tt1 | jam | Give a man to get a man. That is draughts, my friend. |
| v_tt2 | kazi | Keep your back row tight, or you will be sorry. |
| v_tt3 | jam | Patience. Draughts punishes the hasty. |
| v_tt4 | kazi | I would not touch that piece if I were you. |
| v_tt5 | jam | Go on. Push it. See what happens. |
| v_tt6 | kazi | The move is mine, and the move is everything. |
| v_tt7 | jam | Careful now. One slip and it is over. |
| v_tt8 | kazi | You are playing right into my hands. |
| v_tt9 | jam | Hmm. You are better than you look. |
| v_tt10 | kazi | Let us trade. The endgame loves me. |
| v_bait1 | jam | Whatever you do, do not take that piece. |
| v_bait2 | kazi | That piece is poisoned. Go on, try it. |
| v_bait3 | jam | Take the bait. I am begging you. |
| v_lucky1 | kazi | You are lucky this time. |
| v_lucky2 | jam | Boy, that was some move. |
| v_lucky3 | kazi | My plan! Ruined! |
| v_lucky4 | jam | Okay, okay. I see you. |
| v_lucky5 | kazi | You saw that coming? Impressive. |
| v_doom1 | jam | You are trapped. There is no escape. |
| v_doom2 | kazi | You are not escaping this one, my friend. |
| v_doom3 | jam | Nowhere to run. Nowhere to hide. |
| v_doom4 | kazi | Make your peace, friend. It is over. |
| v_doom5 | jam | I could tell you something, but you already know. |
| v_esc1 | kazi | A narrow escape! Unbelievable! |
| v_esc2 | jam | You wriggled out of that one?! |
| v_king1 | jam | The king has arrived! |
| v_king2 | kazi | Bow down. The king is here! |
| v_first | kazi | First blood! |
| v_hurt | jam | That one hurt, did it not? |
| v_mercy | kazi | Mercy? Never heard of it. |

## tts_gen7.sh

!/usr/bin/env bash DRAFTI voice lines batch 7 — the big THINK pool (narrator lines for long engine thinks + heckles for a slow human), so thinking moments never repeat the same clip. Also the two meme recreations: the shrimp-doom line and the

| name | voice | text |
| --- | --- | --- |
| th_n01 | jam | A few moments later… |
| th_n02 | kazi | Meanwhile, on the board… |
| th_n03 | jam | Deep in thought… |
| th_n04 | kazi | Still calculating… |
| th_n05 | jam | Counting every man twice. |
| th_n06 | kazi | The gears are turning… |
| th_n07 | jam | Weighing the whole universe, it seems. |
| th_n08 | kazi | Careful now. This is the move. |
| th_n09 | jam | You could hear a pin drop. |
| th_n10 | kazi | The think is real. |
| th_n11 | jam | Ten moves deep already. |
| th_n12 | kazi | No rush. No rush at all. |
| th_n13 | jam | The kettle has boiled twice. |
| th_n14 | kazi | Somewhere, a clock just gave up. |
| th_n15 | jam | Silence in the hall… |
| th_n16 | kazi | It is reading the board like a newspaper. |
| th_n17 | jam | Chess would have finished by now. |
| th_n18 | kazi | Patience. The machine is composing. |
| th_n19 | jam | Is it writing a letter? Or a move? |
| th_n20 | kazi | The machines are humming tonight. |
| th_n21 | jam | Grandmaster pace. Respect it. |
| th_n22 | kazi | Thinking so hard the lights dimmed. |
| th_n23 | jam | Two hours later… |
| th_n24 | kazi | Still deciding. Still deciding… |
| th_h01 | jam | Still there? |
| th_h02 | kazi | Take your time. We have all week. |
| th_h03 | jam | We are waiting… |
| th_h04 | kazi | The board misses you. |
| th_h05 | jam | Coffee break? |
| th_h06 | kazi | Lost in the position? |
| th_h07 | jam | The pieces are patient. I am not. |
| th_h08 | kazi | Any day now… |
| th_h09 | jam | The clock is watching you. |
| th_h10 | kazi | My tea is getting cold. |
| th_h11 | jam | It is just draughts. Breathe. |
| th_h12 | kazi | One move. One. |
| th_h13 | jam | Sleeping? Wake up, it is your move. |
| th_h14 | kazi | The chair is comfy, I see. |
| th_h15 | jam | Your move has been ready for ages. |
| th_h16 | kazi | Time flies. Your move does not. |
| th_h17 | jam | Think in Swahili if it helps. |
| th_h18 | kazi | Play when ready. No pressure. Some pressure. |
| th_h19 | jam | Deep breath. Now click. |
| th_h20 | kazi | The engines age while you think. |
| shrimp_a | kazi | Is this… the shrimp one? Is this the shrimp one?! |
| shrimp_b | jam | Wait. Is this the shrimp one? Ha! It is the shrimp one. |
| retire_a | kazi | How can you allow the one with that skill to retire? How?! |
| retire_b | jam | How can you allow him to retire?! With that skill! How?! |

## tts_gen7b.sh

!/usr/bin/env bash DRAFTI batch 7b — the same think-pool texts in the other voice, doubling the pool so no voice clip repeats until ~130 draws.

| name | voice | text |
| --- | --- | --- |
| th_n01b | kazi | A few moments later… |
| th_n02b | jam | Meanwhile, on the board… |
| th_n03b | kazi | Deep in thought… |
| th_n04b | jam | Still calculating… |
| th_n05b | kazi | Counting every man twice. |
| th_n06b | jam | The gears are turning… |
| th_n07b | kazi | Weighing the whole universe, it seems. |
| th_n08b | jam | Careful now. This is the move. |
| th_n09b | kazi | You could hear a pin drop. |
| th_n10b | jam | The think is real. |
| th_n11b | kazi | Ten moves deep already. |
| th_n12b | jam | No rush. No rush at all. |
| th_n13b | kazi | The kettle has boiled twice. |
| th_n14b | jam | Somewhere, a clock just gave up. |
| th_n15b | kazi | Silence in the hall… |
| th_n16b | jam | It is reading the board like a newspaper. |
| th_n17b | kazi | Chess would have finished by now. |
| th_n18b | jam | Patience. The machine is composing. |
| th_n19b | kazi | Is it writing a letter? Or a move? |
| th_n20b | jam | The machines are humming tonight. |
| th_n21b | kazi | Grandmaster pace. Respect it. |
| th_n22b | jam | Thinking so hard the lights dimmed. |
| th_n23b | kazi | Two hours later… |
| th_n24b | jam | Still deciding. Still deciding… |
| th_h01b | kazi | Still there? |
| th_h02b | jam | Take your time. We have all week. |
| th_h03b | kazi | We are waiting… |
| th_h04b | jam | The board misses you. |
| th_h05b | kazi | Coffee break? |
| th_h06b | jam | Lost in the position? |
| th_h07b | kazi | The pieces are patient. I am not. |
| th_h08b | jam | Any day now… |
| th_h09b | kazi | The clock is watching you. |
| th_h10b | jam | My tea is getting cold. |
| th_h11b | kazi | It is just draughts. Breathe. |
| th_h12b | jam | One move. One. |
| th_h13b | kazi | Sleeping? Wake up, it is your move. |
| th_h14b | jam | The chair is comfy, I see. |
| th_h15b | kazi | Your move has been ready for ages. |
| th_h16b | jam | Time flies. Your move does not. |
| th_h17b | kazi | Think in Swahili if it helps. |
| th_h18b | jam | Play when ready. No pressure. Some pressure. |
| th_h19b | kazi | Deep breath. Now click. |
| th_h20b | jam | The engines age while you think. |

## tts_gen8.sh

!/usr/bin/env bash DRAFTI voice lines batch 8 — the arena roster introduces itself.

| name | voice | text |
| --- | --- | --- |
| roster_simba | jam | I am Simba. The king of the board. |
| roster_yanga | kazi | Yanga! Pride of the people. Let us play. |
| roster_twiga | jam | I am Twiga. I see the whole board from up here. |
| roster_tembo | kazi | Tembo never forgets. And Tembo never rushes. |
| roster_chui | jam | Chui. I stalk in silence. |
| roster_duma | kazi | Duma! Fast, fearless, gone. |
| roster_kifaru | jam | I am Kifaru. I charge straight through. |
| roster_nyati | kazi | Nyati holds the ground. Try me. |
| roster_fisi | jam | Fisi! Ha! I am already laughing at your plan. |
| roster_sungura | kazi | Sungura. Quick, clever — catch me if you can. |

## tts_shrimp2.sh

!/usr/bin/env bash Shrimp line, take two: the reference is a horse short where the owner asks, amused, "Is this the shrimp one??" — so the read wants to be lighter and more sing-song than the current narrator-voiced takes. Four fresh takes across the

| name | voice | text |
| --- | --- | --- |
| shrimp_c | chuichui | Ooh — is this… the shrimp one? Is THIS the shrimp one?! |
| shrimp_d | tongtong | Wait, wait. Is this the shrimp one?? Ha! It is the shrimp one! |
| shrimp_e | xiaochen | Hmm? Is this the shrimp one? It IS the shrimp one! |
| shrimp_f | tongtong | Is this… the shrimp one?? Is this the shrimp one?! Ha! |

---

**Totals: jam 206 lines, kazi 91 lines, sum 301 across 9 batch scripts.**

<!-- BEGIN CURRENT STREAMER VOCABULARY INVENTORY -->

## Current streamer vocabulary (synchronized from the shipped manifest)

Current entries: 300 — female: 100, funny: 100, male: 100.
The manifest is the source of truth for each ID, voice, and exact spoken text.

| name | voice | exact text |
| --- | --- | --- |
| sf2_001 | female / tongtong | Welcome in, everyone — the stream is live! |
| sf2_002 | female / tongtong | So glad you're here — a fresh session begins! |
| sf2_003 | female / tongtong | Good evening, everybody — the checkers night starts now! |
| sf2_004 | female / tongtong | Here we go — a brand new bout begins! |
| sf2_005 | female / tongtong | Next bout, fresh board. Let's enjoy this! |
| sf2_006 | female / tongtong | Pieces are set — a new bout starts now! |
| sf2_007 | female / tongtong | Two more players to the table — enjoy! |
| sf2_008 | female / tongtong | Bout under way — early moves set the tone. |
| sf2_009 | female / tongtong | A new challenger steps up — welcome! |
| sf2_010 | female / tongtong | Different opponent this time — let's see! |
| sf2_011 | female / tongtong | Fresh face at the board — looking focused! |
| sf2_012 | female / tongtong | New challenger, same board — anything can happen! |
| sf2_013 | female / tongtong | They drew last time — the rematch starts now! |
| sf2_014 | female / tongtong | Same pairing again — someone wants a decision! |
| sf2_015 | female / tongtong | Points shared last game — round two begins! |
| sf2_016 | female / tongtong | A draw before, and both want more! |
| sf2_017 | female / tongtong | A new season opens — storylines continue! |
| sf2_018 | female / tongtong | Season rollover — fresh standings, same passion! |
| sf2_019 | female / tongtong | New season on the calendar — who rises? |
| sf2_020 | female / tongtong | The league moves on — a new season begins! |
| sf2_021 | female / tongtong | Quarter-finals reached — every move matters now! |
| sf2_022 | female / tongtong | Quarter-final bout coming up — real pressure! |
| sf2_023 | female / tongtong | Into the quarter-finals — survival mode starts! |
| sf2_024 | female / tongtong | Semi-final stage — the tension is rising! |
| sf2_025 | female / tongtong | The semi-finals — one step from the big one! |
| sf2_026 | female / tongtong | Semi-final bout underway — focus at maximum! |
| sf2_027 | female / tongtong | The grand final is here — enjoy every move! |
| sf2_028 | female / tongtong | Grand final bout — the best side lifts it! |
| sf2_029 | female / tongtong | Finals atmosphere — history is one bout away! |
| sf2_030 | female / tongtong | Oh, that's clean — nothing wasted there! |
| sf2_031 | female / tongtong | Beautifully played — everything stays safe. |
| sf2_032 | female / tongtong | Tidy work — every piece doing its job! |
| sf2_033 | female / tongtong | Smooth, simple, effective — lovely play! |
| sf2_034 | female / tongtong | That's the move coaches show beginners! |
| sf2_035 | female / tongtong | Clean and confident — the position improves! |
| sf2_036 | female / tongtong | Well judged! Nothing rushed, nothing risky. |
| sf2_037 | female / tongtong | One piece off the board — the count begins! |
| sf2_038 | female / tongtong | A clean single capture — steady play. |
| sf2_039 | female / tongtong | That piece is gone — a small edge! |
| sf2_040 | female / tongtong | Taken! One capture, and tension grows. |
| sf2_041 | female / tongtong | One capture landed — the board shifts. |
| sf2_042 | female / tongtong | Straightforward take — sometimes simple is best! |
| sf2_043 | female / tongtong | Two pieces in one turn — that stings! |
| sf2_044 | female / tongtong | Double capture! The board felt that one. |
| sf2_045 | female / tongtong | One, two — off they go! Excellent! |
| sf2_046 | female / tongtong | A double strike — that side smiles now. |
| sf2_047 | female / tongtong | Two captures in one move — great timing! |
| sf2_048 | female / tongtong | Doubled up! The material picture changes. |
| sf2_049 | female / tongtong | Three or more in one go — outstanding! |
| sf2_050 | female / tongtong | A capture run — something special! |
| sf2_051 | female / tongtong | Multi-capture! The board just opened up! |
| sf2_052 | female / tongtong | What a chain — multiple pieces gone! |
| sf2_053 | female / tongtong | It reaches the last row — a new king! |
| sf2_054 | female / tongtong | Crowned! That king will be felt. |
| sf2_055 | female / tongtong | Promotion! A new king enters the game. |
| sf2_056 | female / tongtong | The piece marches through — king crowned! |
| sf2_057 | female / tongtong | Fresh royalty on the board — respect the crown! |
| sf2_058 | female / tongtong | Behind on pieces — dig in and stay calm! |
| sf2_059 | female / tongtong | Down on material, not out of ideas! |
| sf2_060 | female / tongtong | Pressure on that side — one move changes everything! |
| sf2_061 | female / tongtong | Behind on the board — defend with patience. |
| sf2_062 | female / tongtong | Material down, spirit up — not over yet! |
| sf2_063 | female / tongtong | The material swing is real — turned around! |
| sf2_064 | female / tongtong | What a recovery — the balance has flipped! |
| sf2_065 | female / tongtong | A genuine comeback — pieces back in the fight! |
| sf2_066 | female / tongtong | Look at the board — that deficit is gone! |
| sf2_067 | female / tongtong | Something's waiting on that square — say no more! |
| sf2_068 | female / tongtong | That bait sits there quietly... interesting. |
| sf2_069 | female / tongtong | The trap snaps shut — that piece is caught! |
| sf2_070 | female / tongtong | Oh no, straight into it! Perfectly played. |
| sf2_071 | female / tongtong | Careful now — that square has ideas! |
| sf2_072 | female / tongtong | Tough loss — well fought, keep learning! |
| sf2_073 | female / tongtong | Didn't go your way — hold your head high! |
| sf2_074 | female / tongtong | Hard to take, but next bout is fresh. |
| sf2_075 | female / tongtong | So close! That performance deserves credit. |
| sf2_076 | female / tongtong | That's the win! Congratulations — well earned! |
| sf2_077 | female / tongtong | Victory! Composed, patient and deserved. |
| sf2_078 | female / tongtong | It's over — a fine win to celebrate! |
| sf2_079 | female / tongtong | The last piece says it all — match won! |
| sf2_080 | female / tongtong | A draw! After all that, honors shared. |
| sf2_081 | female / tongtong | Neither side gives an inch — ends level! |
| sf2_082 | female / tongtong | Hard-fought and split — a fair draw. |
| sf2_083 | female / tongtong | A quiet moment — enjoy the craft, everyone. |
| sf2_084 | female / tongtong | Moments like this are why we love checkers. |
| sf2_085 | female / tongtong | Good morning, checkers family — coffee and classics! |
| sf2_086 | female / tongtong | Take it in, folks — quiet moves win games. |
| sf2_087 | female / tongtong | Nothing flashy — just two minds at work. |
| sf2_088 | female / tongtong | What would you play there? Comments below! |
| sf2_089 | female / tongtong | Which side looks better? Drop your read below! |
| sf2_090 | female / tongtong | Comment your favorite moment of this match! |
| sf2_091 | female / tongtong | If it were your board — what's next? Comments! |
| sf2_092 | female / tongtong | Make sure you like this stream — it helps! |
| sf2_093 | female / tongtong | Enjoying the coverage? Share the live! |
| sf2_094 | female / tongtong | Hit follow — never miss the next session! |
| sf2_095 | female / tongtong | One tap on like keeps the stream strong! |
| sf2_096 | female / tongtong | Share this live with someone who loves checkers! |
| sf2_097 | female / tongtong | While we reset — which move impressed you most? |
| sf2_098 | female / tongtong | Quick pause between bouts — tap that follow! |
| sf2_099 | female / tongtong | Next bout soon, stay close! |
| sf2_100 | female / tongtong | Between bouts, the story continues — more ahead! |
| sj2_001 | funny / kazi | Welcome in — jokes are free and checkers is serious! |
| sj2_002 | funny / kazi | We are live — side effects may include smiling. |
| sj2_003 | funny / kazi | Good evening, night owls — the board is awake! |
| sj2_004 | funny / kazi | A piece plans an early retirement! |
| sj2_005 | funny / kazi | Fresh bout — legal jumps, zero refunds! |
| sj2_006 | funny / kazi | Next bout begins — place your hopes now! |
| sj2_007 | funny / kazi | The pieces practiced all night... allegedly. |
| sj2_008 | funny / kazi | The board said no pressure. It lied! |
| sj2_009 | funny / kazi | A new challenger — somebody hide the good moves! |
| sj2_010 | funny / kazi | Fresh challenger — the chair is still warm! |
| sj2_011 | funny / kazi | Maximum chaos! |
| sj2_012 | funny / kazi | A different challenger — the plot thickens! |
| sj2_013 | funny / kazi | They drew last time — pride is on the menu! |
| sj2_014 | funny / kazi | The rematch — same players, extra drama, free! |
| sj2_015 | funny / kazi | Round two — the board remembers everything! |
| sj2_016 | funny / kazi | Sequel time! |
| sj2_017 | funny / kazi | New season — standings empty, confidence full. |
| sj2_018 | funny / kazi | Same beautiful chaos! |
| sj2_019 | funny / kazi | Scoreboard sighs! |
| sj2_020 | funny / kazi | Dreams are free — kings are earned! |
| sj2_021 | funny / kazi | Quarter-finals — the part where pretending stops working. |
| sj2_022 | funny / kazi | Board unbothered! |
| sj2_023 | funny / kazi | Quarter-finals here — bold moves only, please! |
| sj2_024 | funny / kazi | Semi-finals — one step from glory! |
| sj2_025 | funny / kazi | Drama included at no extra cost! |
| sj2_026 | funny / kazi | Semi-finals underway — hold your snacks! |
| sj2_027 | funny / kazi | Grand final — popcorn time! |
| sj2_028 | funny / kazi | The crown is here — finders keepers! |
| sj2_029 | funny / kazi | Grand final underway — history, one jump at a time! |
| sj2_030 | funny / kazi | Ooh, clean — even the pieces clapped quietly. |
| sj2_031 | funny / kazi | So tidy — the board said thank you! |
| sj2_032 | funny / kazi | Smooth — not one piece complained. |
| sj2_033 | funny / kazi | Textbook — someone did their homework. |
| sj2_034 | funny / kazi | Cleaner than my kitchen — and I never cook! |
| sj2_035 | funny / kazi | The move is elegant — not me! |
| sj2_036 | funny / kazi | The sneaky ones are the best! |
| sj2_037 | funny / kazi | One piece off — board lost weight! |
| sj2_038 | funny / kazi | A capture — that piece will tell stories. |
| sj2_039 | funny / kazi | Taken — one down — the drama continues! |
| sj2_040 | funny / kazi | Clean, polite, civilized aggression! |
| sj2_041 | funny / kazi | No farewell party for that piece! |
| sj2_042 | funny / kazi | Captured — the crowd goes... politely interested! |
| sj2_043 | funny / kazi | Double capture — two pieces, zero apologies! |
| sj2_044 | funny / kazi | Off they go like late buses! |
| sj2_045 | funny / kazi | A double strike — the material report got interesting! |
| sj2_046 | funny / kazi | Somebody skipped breakfast for this! |
| sj2_047 | funny / kazi | Doubled up — the picnic basket got lighter. |
| sj2_048 | funny / kazi | Two for one move — best deal in town! |
| sj2_049 | funny / kazi | A capture chain — call the board's insurance! |
| sj2_050 | funny / kazi | Three or more — that was a whole parade! |
| sj2_051 | funny / kazi | Multi-capture — they left faster than my Mondays! |
| sj2_052 | funny / kazi | What a sequence — the board needs a moment. |
| sj2_053 | funny / kazi | A new king — get the tiny crown polished! |
| sj2_054 | funny / kazi | Promotion — humble piece to royalty in one trip. |
| sj2_055 | funny / kazi | Crowned — that king owned the runway. |
| sj2_056 | funny / kazi | Last row reached — a king is born, applaud! |
| sj2_057 | funny / kazi | The others pretend not to be jealous! |
| sj2_058 | funny / kazi | Behind on pieces — underdogs love a good story! |
| sj2_059 | funny / kazi | Deep breath, then magic! |
| sj2_060 | funny / kazi | Behind on material — the board respects patience! |
| sj2_061 | funny / kazi | Pressure on — snack, calm, play on! |
| sj2_062 | funny / kazi | Material down, humor intact! |
| sj2_063 | funny / kazi | The report flipped like pancakes! |
| sj2_064 | funny / kazi | From behind to superb bounce-back! |
| sj2_065 | funny / kazi | The comeback is real — I checked twice! |
| sj2_066 | funny / kazi | Look at the material now — doubters, sit down! |
| sj2_067 | funny / kazi | Something suspicious on that square... just saying! |
| sj2_068 | funny / kazi | That bait is so obvious. I almost took it! |
| sj2_069 | funny / kazi | That piece is a souvenir now! |
| sj2_070 | funny / kazi | Even I saw that trap coming! |
| sj2_071 | funny / kazi | Careful — that square has sticky fingers! |
| sj2_072 | funny / kazi | A tough loss — but hey, the jokes were free! |
| sj2_073 | funny / kazi | Didn't go your way — the board forgives! |
| sj2_074 | funny / kazi | That spirit pays the bills! |
| sj2_075 | funny / kazi | Losses sting — that spirit pays the bills! |
| sj2_076 | funny / kazi | Victory dance, go! |
| sj2_077 | funny / kazi | Composure wins. Again! |
| sj2_078 | funny / kazi | Winner takes glory! |
| sj2_079 | funny / kazi | The pieces bow! |
| sj2_080 | funny / kazi | Both sides blink! |
| sj2_081 | funny / kazi | Scoreboard diplomacy! |
| sj2_082 | funny / kazi | Scoreboard takes a nap! |
| sj2_083 | funny / kazi | Not jinxing anything! |
| sj2_084 | funny / kazi | Pieces are thinking! |
| sj2_085 | funny / kazi | Early birds salute! |
| sj2_086 | funny / kazi | Staying ready anyway! |
| sj2_087 | funny / kazi | Geometry of chaos! |
| sj2_088 | funny / kazi | Brave answers below! |
| sj2_089 | funny / kazi | First try, promise! |
| sj2_090 | funny / kazi | Bragging rights await! |
| sj2_091 | funny / kazi | The board listens. Probably! |
| sj2_092 | funny / kazi | Tap like, gently! |
| sj2_093 | funny / kazi | Friends deserve checkers! |
| sj2_094 | funny / kazi | Follow. Board happy! |
| sj2_095 | funny / kazi | Pick your adventure! |
| sj2_096 | funny / kazi | Like button takes compliments! |
| sj2_097 | funny / kazi | Jury is out! |
| sj2_098 | funny / kazi | Follow warms up! |
| sj2_099 | funny / kazi | Snacks ready, hearts steady! |
| sj2_100 | funny / kazi | The jokes continue! |
| sm2_001 | male / jam | Good day, everyone — welcome! The stream starts shortly. |
| sm2_002 | male / jam | We are on air — serious checkers begins right here! |
| sm2_003 | male / jam | Morning, everyone! Bright start, sharp moves — stream opens now. |
| sm2_004 | male / jam | A new bout is underway — watch the opening! |
| sm2_005 | male / jam | Fresh game, fresh chances — the next bout starts! |
| sm2_006 | male / jam | Pieces are placed — the next bout is on! |
| sm2_007 | male / jam | Here comes the next bout — openings matter. |
| sm2_008 | male / jam | Play begins again — eyes on the center squares! |
| sm2_009 | male / jam | A new challenger arrives — let's see their style! |
| sm2_010 | male / jam | A different opponent takes the seat — new test! |
| sm2_011 | male / jam | New name at the table — everyone starts even! |
| sm2_012 | male / jam | The challenger is ready — this should be interesting! |
| sm2_013 | male / jam | They drew last time — now the rematch! |
| sm2_014 | male / jam | Same two again — unfinished business on the board! |
| sm2_015 | male / jam | After that draw, both want a statement — round two! |
| sm2_016 | male / jam | The rematch is here — expect adjustments! |
| sm2_017 | male / jam | A new season begins — history starts today! |
| sm2_018 | male / jam | Season advance! New table, new ambitions. |
| sm2_019 | male / jam | The league turns its page — fresh season underway! |
| sm2_020 | male / jam | New season, same hunger — the standings will talk. |
| sm2_021 | male / jam | Quarter-finals! From here, mistakes are expensive. |
| sm2_022 | male / jam | Quarter-final bout set — high stakes, full focus! |
| sm2_023 | male / jam | Quarter-final stage — only strong play survives. |
| sm2_024 | male / jam | Semi-final time — the board gets serious! |
| sm2_025 | male / jam | The semi-finals — one bout from the final! |
| sm2_026 | male / jam | Composure decides this bout! |
| sm2_027 | male / jam | The grand final! Everything built leads here. |
| sm2_028 | male / jam | Final bout — the crown is on the line! |
| sm2_029 | male / jam | Grand final underway — checkers at its peak! |
| sm2_030 | male / jam | What a clean move — textbook stuff! |
| sm2_031 | male / jam | Excellent technique — simple and strong. |
| sm2_032 | male / jam | Well played! Nothing loose about that. |
| sm2_033 | male / jam | That's as clean as it gets! |
| sm2_034 | male / jam | Solid play — the structure stays strong. |
| sm2_035 | male / jam | No hesitation, no waste — professional! |
| sm2_036 | male / jam | That is quality — calm hands, clear head. |
| sm2_037 | male / jam | A piece comes off — the count opens! |
| sm2_038 | male / jam | One capture — clean and profitable. |
| sm2_039 | male / jam | Taken! One piece down on that side. |
| sm2_040 | male / jam | A simple take — the edge begins here. |
| sm2_041 | male / jam | One off the board — steady work! |
| sm2_042 | male / jam | Capture made — small step, real value. |
| sm2_043 | male / jam | Double capture! Two pieces in one move! |
| sm2_044 | male / jam | One, two — gone! What a combination! |
| sm2_045 | male / jam | Two captures in one turn — fast changes! |
| sm2_046 | male / jam | A double strike — excellent awareness! |
| sm2_047 | male / jam | Two for one move — real profit! |
| sm2_048 | male / jam | Doubled! The material gap widens. |
| sm2_049 | male / jam | Multiple captures in one turn — magnificent! |
| sm2_050 | male / jam | What a chain — several gone at once! |
| sm2_051 | male / jam | Three or more off — a thunderous sequence! |
| sm2_052 | male / jam | A sweeping capture — pieces everywhere! |
| sm2_053 | male / jam | And it crowns — a new king takes the field! |
| sm2_054 | male / jam | King it is! That promotion matters. |
| sm2_055 | male / jam | Promotion achieved — the king changes everything! |
| sm2_056 | male / jam | Last row reached — a king is born! |
| sm2_057 | male / jam | Crowned and ready — respect the new king! |
| sm2_058 | male / jam | Behind on pieces — steady defense, no panic! |
| sm2_059 | male / jam | Down on pieces — the board still offers chances. |
| sm2_060 | male / jam | Pressure builds on that side — hold the line! |
| sm2_061 | male / jam | Material behind — patience is the way back. |
| sm2_062 | male / jam | Keep fighting! One accurate move swings it. |
| sm2_063 | male / jam | A real turnaround — the balance has flipped! |
| sm2_064 | male / jam | From behind to back in it — superb recovery! |
| sm2_065 | male / jam | The deficit is gone — a genuine comeback! |
| sm2_066 | male / jam | Look at the material — what a recovery! |
| sm2_067 | male / jam | Someone left a gift on that square — or is it? |
| sm2_068 | male / jam | Careful — that square bites! |
| sm2_069 | male / jam | The trap springs — the piece is lost! |
| sm2_070 | male / jam | Right into the trap! Beautifully executed. |
| sm2_071 | male / jam | That square has a secret — watch closely. |
| sm2_072 | male / jam | A hard loss — the effort was real. Onward! |
| sm2_073 | male / jam | It ends in defeat — chin up, learn, return. |
| sm2_074 | male / jam | Not today — the next bout is a fresh start. |
| sm2_075 | male / jam | So much fight — the result is cruel. |
| sm2_076 | male / jam | And that is the match — a deserved win! |
| sm2_077 | male / jam | Victory! Composure under pressure — well done! |
| sm2_078 | male / jam | The final capture says it all — the win! |
| sm2_079 | male / jam | It is decided — congratulations to the winner! |
| sm2_080 | male / jam | A draw — after that battle, a fair result! |
| sm2_081 | male / jam | Honors even — neither side would blink! |
| sm2_082 | male / jam | It ends level — a draw both earned. |
| sm2_083 | male / jam | A calm spell — savor the technique, everyone. |
| sm2_084 | male / jam | Quiet moves carry the real weight of a game. |
| sm2_085 | male / jam | A calm evening of checkers — just right! |
| sm2_086 | male / jam | No fireworks here — deep, honest play. |
| sm2_087 | male / jam | Watch the thinking — games are shaped here. |
| sm2_088 | male / jam | Your move, folks — what would you play? Comments! |
| sm2_089 | male / jam | Which side do you favor? Tell me below! |
| sm2_090 | male / jam | Rate that exchange in the comments — good call? |
| sm2_091 | male / jam | Guess the next big moment — drop it below! |
| sm2_092 | male / jam | If the games treat you well, tap that like! |
| sm2_093 | male / jam | Share this stream with a friend who loves the board! |
| sm2_094 | male / jam | Follow the channel — the next session is worth it! |
| sm2_095 | male / jam | A quick like keeps this stream energized! |
| sm2_096 | male / jam | Enjoying the coverage? A share goes a long way! |
| sm2_097 | male / jam | Table reset in progress — which move stood out? Comments! |
| sm2_098 | male / jam | A short break between bouts — perfect moment to follow! |
| sm2_099 | male / jam | Stay with me, folks! |
| sm2_100 | male / jam | While the ceremony settles — more checkers coming up! |

<!-- END CURRENT STREAMER VOCABULARY INVENTORY -->
