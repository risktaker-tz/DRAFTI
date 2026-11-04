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
