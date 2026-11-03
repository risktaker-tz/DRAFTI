# Streamer vocabulary — 300 new sentences (100 per voice)

Real recorded additions for the optional streamer pack; every row below is
backed by an accepted MP3 in `audio/` with verified duration/peak/hash in
`manifest.json`. Scenario groups follow `docs/ZAI_STREAMER_300_SENTENCES.md`.

## Female (tongtong)

| ID | Scenario | Sentence | Predicate (short) | Hour gate | Status |
| --- | --- | --- | --- | --- | --- |
| `sf2_001` | session_open | Welcome in, everyone — the stream is live! | session-scoped stream welcome | — | accepted {"seconds": 3.8624, "bytes": 27654} |
| `sf2_002` | session_open | So glad you're here — a fresh session begins! | session-scoped stream welcome | — | accepted {"seconds": 3.741, "bytes": 26923} |
| `sf2_003` | session_open | Good evening, everybody — the checkers night starts now! | session-scoped stream welcome | 17-22 | accepted {"seconds": 4.4637, "bytes": 31860} |
| `sf2_004` | new_bout | Here we go — a brand new bout begins! | boutStart while the stream session is already live | — | accepted {"seconds": 4.6174, "bytes": 32957} |
| `sf2_005` | new_bout | Next bout, fresh board. Let's enjoy this! | boutStart while the stream session is already live | — | accepted {"seconds": 5.1149, "bytes": 36431} |
| `sf2_006` | new_bout | Pieces are set — a new bout starts now! | boutStart while the stream session is already live | — | accepted {"seconds": 3.9353, "bytes": 28203} |
| `sf2_007` | new_bout | Two more players to the table — enjoy! | boutStart while the stream session is already live | — | accepted {"seconds": 2.8343, "bytes": 20523} |
| `sf2_008` | new_bout | Bout under way — early moves set the tone. | boutStart while the stream session is already live | — | accepted {"seconds": 3.3404, "bytes": 23997} |
| `sf2_009` | new_challenger | A new challenger steps up — welcome! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 4.046, "bytes": 28934} |
| `sf2_010` | new_challenger | Different opponent this time — let's see! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 3.1904, "bytes": 23083} |
| `sf2_011` | new_challenger | Fresh face at the board — looking focused! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 3.0726, "bytes": 22168} |
| `sf2_012` | new_challenger | New challenger, same board — anything can happen! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 3.5855, "bytes": 25826} |
| `sf2_013` | rematch_draw | They drew last time — the rematch starts now! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 4.0907, "bytes": 29300} |
| `sf2_014` | rematch_draw | Same pairing again — someone wants a decision! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 3.479, "bytes": 25094} |
| `sf2_015` | rematch_draw | Points shared last game — round two begins! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 4.7709, "bytes": 34054} |
| `sf2_016` | rematch_draw | A draw before, and both want more! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 2.787, "bytes": 20157} |
| `sf2_017` | season_advance | A new season opens — storylines continue! | season rollover while the stream session continues | — | accepted {"seconds": 4.0533, "bytes": 29117} |
| `sf2_018` | season_advance | Season rollover — fresh standings, same passion! | season rollover while the stream session continues | — | accepted {"seconds": 4.5979, "bytes": 32957} |
| `sf2_019` | season_advance | New season on the calendar — who rises? | season rollover while the stream session continues | — | accepted {"seconds": 3.3659, "bytes": 24180} |
| `sf2_020` | season_advance | The league moves on — a new season begins! | season rollover while the stream session continues | — | accepted {"seconds": 4.4202, "bytes": 31677} |
| `sf2_021` | stage_quarter | Quarter-finals reached — every move matters now! | boutStart where the tournament stage advances to the quarter | — | pending |
| `sf2_022` | stage_quarter | Quarter-final bout coming up — real pressure! | boutStart where the tournament stage advances to the quarter | — | pending |
| `sf2_023` | stage_quarter | Into the quarter-finals — survival mode starts! | boutStart where the tournament stage advances to the quarter | — | pending |
| `sf2_024` | stage_semi | Semi-final stage — the tension is rising! | boutStart where the tournament stage advances to the semi-fi | — | pending |
| `sf2_025` | stage_semi | The semi-finals — one step from the big one! | boutStart where the tournament stage advances to the semi-fi | — | pending |
| `sf2_026` | stage_semi | Semi-final bout underway — focus at maximum! | boutStart where the tournament stage advances to the semi-fi | — | pending |
| `sf2_027` | stage_final | The grand final is here — enjoy every move! | boutStart where the tournament stage advances to the grand f | — | pending |
| `sf2_028` | stage_final | Grand final bout — the best side lifts it! | boutStart where the tournament stage advances to the grand f | — | pending |
| `sf2_029` | stage_final | Finals atmosphere — history is one bout away! | boutStart where the tournament stage advances to the grand f | — | pending |
| `sf2_030` | clean_move | Oh, that's clean — nothing wasted there! | existing STREAMER praise/good quality gate: engine-verified  | — | pending |
| `sf2_031` | clean_move | Beautifully played — everything stays safe. | existing STREAMER praise/good quality gate: engine-verified  | — | pending |
| `sf2_032` | clean_move | Tidy work — every piece doing its job! | existing STREAMER praise/good quality gate: engine-verified  | — | pending |
| `sf2_033` | clean_move | Smooth, simple, effective — lovely play! | existing STREAMER praise/good quality gate: engine-verified  | — | pending |
| `sf2_034` | clean_move | That's the move coaches show beginners! | existing STREAMER praise/good quality gate: engine-verified  | — | pending |
| `sf2_035` | clean_move | Clean and confident — the position improves! | existing STREAMER praise/good quality gate: engine-verified  | — | pending |
| `sf2_036` | clean_move | Well judged! Nothing rushed, nothing risky. | existing STREAMER praise/good quality gate: engine-verified  | — | pending |
| `sf2_037` | capture1 | One piece off the board — the count begins! | caps === 1 on the mover's committed move | — | pending |
| `sf2_038` | capture1 | A clean single capture — steady play. | caps === 1 on the mover's committed move | — | pending |
| `sf2_039` | capture1 | That piece is gone — a small edge! | caps === 1 on the mover's committed move | — | pending |
| `sf2_040` | capture1 | Taken! One capture, and tension grows. | caps === 1 on the mover's committed move | — | pending |
| `sf2_041` | capture1 | One capture landed — the board shifts. | caps === 1 on the mover's committed move | — | pending |
| `sf2_042` | capture1 | Straightforward take — sometimes simple is best! | caps === 1 on the mover's committed move | — | pending |
| `sf2_043` | capture2 | Two pieces in one turn — that stings! | caps === 2 on the mover's committed move | — | pending |
| `sf2_044` | capture2 | Double capture! The board felt that one. | caps === 2 on the mover's committed move | — | pending |
| `sf2_045` | capture2 | One, two — off they go! Excellent! | caps === 2 on the mover's committed move | — | pending |
| `sf2_046` | capture2 | A double strike — that side smiles now. | caps === 2 on the mover's committed move | — | pending |
| `sf2_047` | capture2 | Two captures in one move — great timing! | caps === 2 on the mover's committed move | — | pending |
| `sf2_048` | capture2 | Doubled up! The material picture changes. | caps === 2 on the mover's committed move | — | pending |
| `sf2_049` | capture3plus | Three or more in one go — outstanding! | caps >= 3 on the mover's committed move | — | pending |
| `sf2_050` | capture3plus | A capture run — something special! | caps >= 3 on the mover's committed move | — | pending |
| `sf2_051` | capture3plus | Multi-capture! The board just opened up! | caps >= 3 on the mover's committed move | — | pending |
| `sf2_052` | capture3plus | What a chain — multiple pieces gone! | caps >= 3 on the mover's committed move | — | pending |
| `sf2_053` | new_king | It reaches the last row — a new king! | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sf2_054` | new_king | Crowned! That king will be felt. | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sf2_055` | new_king | Promotion! A new king enters the game. | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sf2_056` | new_king | The piece marches through — king crowned! | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sf2_057` | new_king | Fresh royalty on the board — respect the crown! | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sf2_058` | pressure | Behind on pieces — dig in and stay calm! | the seat the line addresses is behind on material per the en | — | pending |
| `sf2_059` | pressure | Down on material, not out of ideas! | the seat the line addresses is behind on material per the en | — | pending |
| `sf2_060` | pressure | Pressure on that side — one move changes everything! | the seat the line addresses is behind on material per the en | — | pending |
| `sf2_061` | pressure | Behind on the board — defend with patience. | the seat the line addresses is behind on material per the en | — | pending |
| `sf2_062` | pressure | Material down, spirit up — not over yet! | the seat the line addresses is behind on material per the en | — | pending |
| `sf2_063` | turnaround | The material swing is real — turned around! | existing verified-material-turnaround gate | — | pending |
| `sf2_064` | turnaround | What a recovery — the balance has flipped! | existing verified-material-turnaround gate | — | pending |
| `sf2_065` | turnaround | A genuine comeback — pieces back in the fight! | existing verified-material-turnaround gate | — | pending |
| `sf2_066` | turnaround | Look at the board — that deficit is gone! | existing verified-material-turnaround gate | — | pending |
| `sf2_067` | trap | Something's waiting on that square — say no more! | existing trap_set gate: a real trap is present on the board | — | pending |
| `sf2_068` | trap | That bait sits there quietly... interesting. | existing trap_set gate: a real trap is present on the board | — | pending |
| `sf2_069` | trap | The trap snaps shut — that piece is caught! | existing trap_spring gate: the baited capture resolved again | — | pending |
| `sf2_070` | trap | Oh no, straight into it! Perfectly played. | existing trap_spring gate: the baited capture resolved again | — | pending |
| `sf2_071` | trap | Careful now — that square has ideas! | existing trap_set gate: a real trap is present on the board | — | pending |
| `sf2_072` | after_loss | Tough loss — well fought, keep learning! | match ends with the addressed seat losing | — | pending |
| `sf2_073` | after_loss | Didn't go your way — hold your head high! | match ends with the addressed seat losing | — | pending |
| `sf2_074` | after_loss | Hard to take, but next bout is fresh. | match ends with the addressed seat losing | — | pending |
| `sf2_075` | after_loss | So close! That performance deserves credit. | match ends with the addressed seat losing | — | pending |
| `sf2_076` | win | That's the win! Congratulations — well earned! | match ends with the addressed seat winning | — | pending |
| `sf2_077` | win | Victory! Composed, patient and deserved. | match ends with the addressed seat winning | — | pending |
| `sf2_078` | win | It's over — a fine win to celebrate! | match ends with the addressed seat winning | — | pending |
| `sf2_079` | win | The last piece says it all — match won! | match ends with the addressed seat winning | — | pending |
| `sf2_080` | draw | A draw! After all that, honors shared. | official draw | — | pending |
| `sf2_081` | draw | Neither side gives an inch — ends level! | official draw | — | pending |
| `sf2_082` | draw | Hard-fought and split — a fair draw. | official draw | — | pending |
| `sf2_083` | quiet_engagement | A quiet moment — enjoy the craft, everyone. | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_084` | quiet_engagement | Moments like this are why we love checkers. | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_085` | quiet_engagement | Good morning, checkers family — coffee and classics! | no tactical claim; live play continues; eligible idle direct | 05-11 | pending |
| `sf2_086` | quiet_engagement | Take it in, folks — quiet moves win games. | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_087` | quiet_engagement | Nothing flashy — just two minds at work. | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_088` | comment_prompt | What would you play there? Comments below! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_089` | comment_prompt | Which side looks better? Drop your read below! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_090` | comment_prompt | Comment your favorite moment of this match! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_091` | comment_prompt | If it were your board — what's next? Comments! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_092` | like_share_follow | Make sure you like this stream — it helps! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_093` | like_share_follow | Enjoying the coverage? Share the live! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_094` | like_share_follow | Hit follow — never miss the next session! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_095` | like_share_follow | One tap on like keeps the stream strong! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_096` | like_share_follow | Share this live with someone who loves checkers! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sf2_097` | intermission | While we reset — which move impressed you most? | post-retirement speech finished and ceremony ownership relea | — | pending |
| `sf2_098` | intermission | Quick pause between bouts — tap that follow! | post-retirement speech finished and ceremony ownership relea | — | pending |
| `sf2_099` | intermission | Next bout coming — stretch, breathe, stay with me! | post-retirement speech finished and ceremony ownership relea | — | pending |
| `sf2_100` | intermission | Between bouts, the story continues — more ahead! | post-retirement speech finished and ceremony ownership relea | — | pending |

## Male (jam)

| ID | Scenario | Sentence | Predicate (short) | Hour gate | Status |
| --- | --- | --- | --- | --- | --- |
| `sm2_001` | session_open | Good day, everyone — welcome! The stream starts shortly. | session-scoped stream welcome | — | accepted {"seconds": 5.8392, "bytes": 41551} |
| `sm2_002` | session_open | We are on air — serious checkers begins right here! | session-scoped stream welcome | — | accepted {"seconds": 3.9737, "bytes": 28568} |
| `sm2_003` | session_open | Morning, everyone! Bright start, sharp moves — stream opens now. | session-scoped stream welcome | 05-11 | accepted {"seconds": 5.9489, "bytes": 42283} |
| `sm2_004` | new_bout | A new bout is underway — watch the opening! | boutStart while the stream session is already live | — | accepted {"seconds": 3.9725, "bytes": 28568} |
| `sm2_005` | new_bout | Fresh game, fresh chances — the next bout starts! | boutStart while the stream session is already live | — | accepted {"seconds": 4.9133, "bytes": 35151} |
| `sm2_006` | new_bout | Pieces are placed — the next bout is on! | boutStart while the stream session is already live | — | accepted {"seconds": 2.9469, "bytes": 21254} |
| `sm2_007` | new_bout | Here comes the next bout — openings matter. | boutStart while the stream session is already live | — | accepted {"seconds": 3.3317, "bytes": 23997} |
| `sm2_008` | new_bout | Play begins again — eyes on the center squares! | boutStart while the stream session is already live | — | accepted {"seconds": 3.6561, "bytes": 26191} |
| `sm2_009` | new_challenger | A new challenger arrives — let's see their style! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 3.3415, "bytes": 23997} |
| `sm2_010` | new_challenger | A different opponent takes the seat — new test! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 3.5794, "bytes": 25826} |
| `sm2_011` | new_challenger | New name at the table — everyone starts even! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 4.3196, "bytes": 30946} |
| `sm2_012` | new_challenger | The challenger is ready — this should be interesting! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 4.0101, "bytes": 28751} |
| `sm2_013` | rematch_draw | They drew last time — now the rematch! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 3.1706, "bytes": 22900} |
| `sm2_014` | rematch_draw | Same two again — unfinished business on the board! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 4.2867, "bytes": 30763} |
| `sm2_015` | rematch_draw | After that draw, both want a statement — round two! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 4.9112, "bytes": 35151} |
| `sm2_016` | rematch_draw | The rematch is here — expect adjustments! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 2.9354, "bytes": 21254} |
| `sm2_017` | season_advance | A new season begins — history starts today! | season rollover while the stream session continues | — | accepted {"seconds": 3.9373, "bytes": 28203} |
| `sm2_018` | season_advance | Season advance! New table, new ambitions. | season rollover while the stream session continues | — | accepted {"seconds": 4.4532, "bytes": 31860} |
| `sm2_019` | season_advance | The league turns its page — fresh season underway! | season rollover while the stream session continues | — | accepted {"seconds": 4.2513, "bytes": 30397} |
| `sm2_020` | season_advance | New season, same hunger — the standings will talk. | season rollover while the stream session continues | — | accepted {"seconds": 4.5186, "bytes": 32226} |
| `sm2_021` | stage_quarter | Quarter-finals! From here, mistakes are expensive. | boutStart where the tournament stage advances to the quarter | — | accepted {"seconds": 4.6984, "bytes": 33506} |
| `sm2_022` | stage_quarter | Quarter-final bout set — high stakes, full focus! | boutStart where the tournament stage advances to the quarter | — | accepted {"seconds": 4.6882, "bytes": 33506} |
| `sm2_023` | stage_quarter | Quarter-final stage — only strong play survives. | boutStart where the tournament stage advances to the quarter | — | accepted {"seconds": 4.1297, "bytes": 29666} |
| `sm2_024` | stage_semi | Semi-final time — the board gets serious! | boutStart where the tournament stage advances to the semi-fi | — | accepted {"seconds": 4.9216, "bytes": 35151} |
| `sm2_025` | stage_semi | The semi-finals — one bout from the final! | boutStart where the tournament stage advances to the semi-fi | — | accepted {"seconds": 3.1151, "bytes": 22534} |
| `sm2_026` | stage_semi | Semi-final bout beginning — composure decides this. | boutStart where the tournament stage advances to the semi-fi | — | failed |
| `sm2_027` | stage_final | The grand final! Everything built leads here. | boutStart where the tournament stage advances to the grand f | — | accepted {"seconds": 4.4285, "bytes": 31677} |
| `sm2_028` | stage_final | Final bout — the crown is on the line! | boutStart where the tournament stage advances to the grand f | — | accepted {"seconds": 3.1198, "bytes": 22534} |
| `sm2_029` | stage_final | Grand final underway — checkers at its peak! | boutStart where the tournament stage advances to the grand f | — | accepted {"seconds": 3.654, "bytes": 26191} |
| `sm2_030` | clean_move | What a clean move — textbook stuff! | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 2.9839, "bytes": 21620} |
| `sm2_031` | clean_move | Excellent technique — simple and strong. | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 3.418, "bytes": 24546} |
| `sm2_032` | clean_move | Well played! Nothing loose about that. | existing STREAMER praise/good quality gate: engine-verified  | — | failed |
| `sm2_033` | clean_move | That's as clean as it gets! | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 3.024, "bytes": 21803} |
| `sm2_034` | clean_move | Solid play — the structure stays strong. | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 3.598, "bytes": 25826} |
| `sm2_035` | clean_move | No hesitation, no waste — professional! | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 3.8907, "bytes": 27837} |
| `sm2_036` | clean_move | That is quality — calm hands, clear head. | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 4.9745, "bytes": 35517} |
| `sm2_037` | capture1 | A piece comes off — the count opens! | caps === 1 on the mover's committed move | — | pending |
| `sm2_038` | capture1 | One capture — clean and profitable. | caps === 1 on the mover's committed move | — | pending |
| `sm2_039` | capture1 | Taken! One piece down on that side. | caps === 1 on the mover's committed move | — | pending |
| `sm2_040` | capture1 | A simple take — the edge begins here. | caps === 1 on the mover's committed move | — | pending |
| `sm2_041` | capture1 | One off the board — steady work! | caps === 1 on the mover's committed move | — | pending |
| `sm2_042` | capture1 | Capture made — small step, real value. | caps === 1 on the mover's committed move | — | pending |
| `sm2_043` | capture2 | Double capture! Two pieces in one move! | caps === 2 on the mover's committed move | — | pending |
| `sm2_044` | capture2 | One, two — gone! What a combination! | caps === 2 on the mover's committed move | — | pending |
| `sm2_045` | capture2 | Two captures in one turn — fast changes! | caps === 2 on the mover's committed move | — | pending |
| `sm2_046` | capture2 | A double strike — excellent awareness! | caps === 2 on the mover's committed move | — | pending |
| `sm2_047` | capture2 | Two for one move — real profit! | caps === 2 on the mover's committed move | — | pending |
| `sm2_048` | capture2 | Doubled! The material gap widens. | caps === 2 on the mover's committed move | — | pending |
| `sm2_049` | capture3plus | Multiple captures in one turn — magnificent! | caps >= 3 on the mover's committed move | — | pending |
| `sm2_050` | capture3plus | What a chain — several gone at once! | caps >= 3 on the mover's committed move | — | pending |
| `sm2_051` | capture3plus | Three or more off — a thunderous sequence! | caps >= 3 on the mover's committed move | — | pending |
| `sm2_052` | capture3plus | A sweeping capture — pieces everywhere! | caps >= 3 on the mover's committed move | — | pending |
| `sm2_053` | new_king | And it crowns — a new king takes the field! | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sm2_054` | new_king | King it is! That promotion matters. | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sm2_055` | new_king | Promotion achieved — the king changes everything! | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sm2_056` | new_king | Last row reached — a king is born! | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sm2_057` | new_king | Crowned and ready — respect the new king! | promotes: the moved piece reaches the king row and is crowne | — | pending |
| `sm2_058` | pressure | Behind on pieces — steady defense, no panic! | the seat the line addresses is behind on material per the en | — | pending |
| `sm2_059` | pressure | Down on pieces — the board still offers chances. | the seat the line addresses is behind on material per the en | — | pending |
| `sm2_060` | pressure | Pressure builds on that side — hold the line! | the seat the line addresses is behind on material per the en | — | pending |
| `sm2_061` | pressure | Material behind — patience is the way back. | the seat the line addresses is behind on material per the en | — | pending |
| `sm2_062` | pressure | Keep fighting! One accurate move swings it. | the seat the line addresses is behind on material per the en | — | pending |
| `sm2_063` | turnaround | A real turnaround — the balance has flipped! | existing verified-material-turnaround gate | — | pending |
| `sm2_064` | turnaround | From behind to back in it — superb recovery! | existing verified-material-turnaround gate | — | pending |
| `sm2_065` | turnaround | The deficit is gone — a genuine comeback! | existing verified-material-turnaround gate | — | pending |
| `sm2_066` | turnaround | Look at the material — what a recovery! | existing verified-material-turnaround gate | — | pending |
| `sm2_067` | trap | Someone left a gift on that square — or is it? | existing trap_set gate: a real trap is present on the board | — | pending |
| `sm2_068` | trap | Careful — that square bites! | existing trap_set gate: a real trap is present on the board | — | pending |
| `sm2_069` | trap | The trap springs — the piece is lost! | existing trap_spring gate: the baited capture resolved again | — | pending |
| `sm2_070` | trap | Right into the trap! Beautifully executed. | existing trap_spring gate: the baited capture resolved again | — | pending |
| `sm2_071` | trap | That square has a secret — watch closely. | existing trap_set gate: a real trap is present on the board | — | pending |
| `sm2_072` | after_loss | A hard loss — the effort was real. Onward! | match ends with the addressed seat losing | — | pending |
| `sm2_073` | after_loss | It ends in defeat — chin up, learn, return. | match ends with the addressed seat losing | — | pending |
| `sm2_074` | after_loss | Not today — the next bout is a fresh start. | match ends with the addressed seat losing | — | pending |
| `sm2_075` | after_loss | So much fight — the result is cruel. | match ends with the addressed seat losing | — | pending |
| `sm2_076` | win | And that is the match — a deserved win! | match ends with the addressed seat winning | — | pending |
| `sm2_077` | win | Victory! Composure under pressure — well done! | match ends with the addressed seat winning | — | pending |
| `sm2_078` | win | The final capture says it all — the win! | match ends with the addressed seat winning | — | pending |
| `sm2_079` | win | It is decided — congratulations to the winner! | match ends with the addressed seat winning | — | pending |
| `sm2_080` | draw | A draw — after that battle, a fair result! | official draw | — | pending |
| `sm2_081` | draw | Honors even — neither side would blink! | official draw | — | pending |
| `sm2_082` | draw | It ends level — a draw both earned. | official draw | — | pending |
| `sm2_083` | quiet_engagement | A calm spell — savor the technique, everyone. | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_084` | quiet_engagement | Quiet moves carry the real weight of a game. | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_085` | quiet_engagement | A calm evening of checkers — just right! | no tactical claim; live play continues; eligible idle direct | 17-22 | pending |
| `sm2_086` | quiet_engagement | No fireworks here — deep, honest play. | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_087` | quiet_engagement | Watch the thinking — games are shaped here. | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_088` | comment_prompt | Your move, folks — what would you play? Comments! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_089` | comment_prompt | Which side do you favor? Tell me below! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_090` | comment_prompt | Rate that exchange in the comments — good call? | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_091` | comment_prompt | Guess the next big moment — drop it below! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_092` | like_share_follow | If the games treat you well, tap that like! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_093` | like_share_follow | Share this stream with a friend who loves the board! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_094` | like_share_follow | Follow the channel — the next session is worth it! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_095` | like_share_follow | A quick like keeps this stream energized! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_096` | like_share_follow | Enjoying the coverage? A share goes a long way! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sm2_097` | intermission | Table reset in progress — which move stood out? Comments! | post-retirement speech finished and ceremony ownership relea | — | pending |
| `sm2_098` | intermission | A short break between bouts — perfect moment to follow! | post-retirement speech finished and ceremony ownership relea | — | pending |
| `sm2_099` | intermission | Next bout arrives shortly — stay with me, folks! | post-retirement speech finished and ceremony ownership relea | — | pending |
| `sm2_100` | intermission | While the ceremony settles — more checkers coming up! | post-retirement speech finished and ceremony ownership relea | — | pending |

## Funny (kazi persona)

| ID | Scenario | Sentence | Predicate (short) | Hour gate | Status |
| --- | --- | --- | --- | --- | --- |
| `sj2_001` | session_open | Welcome in — jokes are free and checkers is serious! | session-scoped stream welcome | — | accepted {"seconds": 5.3948, "bytes": 38443} |
| `sj2_002` | session_open | We are live — side effects may include smiling. | session-scoped stream welcome | — | accepted {"seconds": 4.3115, "bytes": 30946} |
| `sj2_003` | session_open | Good evening, night owls — the board is awake! | session-scoped stream welcome | 17-22 | accepted {"seconds": 5.596, "bytes": 39906} |
| `sj2_004` | new_bout | A piece plans an early retirement! | boutStart while the stream session is already live | — | accepted {"seconds": 5.8692, "bytes": 41734} |
| `sj2_005` | new_bout | Fresh bout — legal jumps, zero refunds! | boutStart while the stream session is already live | — | accepted {"seconds": 5.0756, "bytes": 36248} |
| `sj2_006` | new_bout | Next bout begins — place your hopes now! | boutStart while the stream session is already live | — | accepted {"seconds": 5.4156, "bytes": 38626} |
| `sj2_007` | new_bout | The pieces practiced all night... allegedly. | boutStart while the stream session is already live | — | failed |
| `sj2_008` | new_bout | The board said no pressure. It lied! | boutStart while the stream session is already live | — | accepted {"seconds": 4.1434, "bytes": 29666} |
| `sj2_009` | new_challenger | A new challenger — somebody hide the good moves! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 4.5237, "bytes": 32408} |
| `sj2_010` | new_challenger | Fresh challenger — the chair is still warm! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 5.8558, "bytes": 41734} |
| `sj2_011` | new_challenger | New opponent — unknown style, maximum chaos! | boutStart and the seated pair differs from the previous bout | — | failed |
| `sj2_012` | new_challenger | A different challenger — the plot thickens! | boutStart and the seated pair differs from the previous bout | — | accepted {"seconds": 4.2486, "bytes": 30397} |
| `sj2_013` | rematch_draw | They drew last time — pride is on the menu! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 3.958, "bytes": 28386} |
| `sj2_014` | rematch_draw | The rematch — same players, extra drama, free! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 5.5941, "bytes": 39906} |
| `sj2_015` | rematch_draw | Round two — the board remembers everything! | boutStart with the same pair as the previous bout and that b | — | accepted {"seconds": 5.5136, "bytes": 39357} |
| `sj2_016` | rematch_draw | No winner last time — sequel time! | boutStart with the same pair as the previous bout and that b | — | failed |
| `sj2_017` | season_advance | New season — standings empty, confidence full. | season rollover while the stream session continues | — | accepted {"seconds": 4.717, "bytes": 33688} |
| `sj2_018` | season_advance | Season rollover — same beautiful chaos! | season rollover while the stream session continues | — | failed |
| `sj2_019` | season_advance | New season — last season's scoreboard sighs! | season rollover while the stream session continues | — | failed |
| `sj2_020` | season_advance | Dreams are free — kings are earned! | season rollover while the stream session continues | — | accepted {"seconds": 3.6371, "bytes": 26191} |
| `sj2_021` | stage_quarter | Quarter-finals — the part where pretending stops working. | boutStart where the tournament stage advances to the quarter | — | accepted {"seconds": 5.8101, "bytes": 41368} |
| `sj2_022` | stage_quarter | Quarter-finals — hearts racing, board unbothered! | boutStart where the tournament stage advances to the quarter | — | failed |
| `sj2_023` | stage_quarter | Quarter-finals here — bold moves only, please! | boutStart where the tournament stage advances to the quarter | — | accepted {"seconds": 5.7039, "bytes": 40637} |
| `sj2_024` | stage_semi | Semi-finals — one step from glory! | boutStart where the tournament stage advances to the semi-fi | — | accepted {"seconds": 4.8139, "bytes": 34420} |
| `sj2_025` | stage_semi | Drama included at no extra cost! | boutStart where the tournament stage advances to the semi-fi | — | accepted {"seconds": 4.3994, "bytes": 31494} |
| `sj2_026` | stage_semi | Semi-finals underway — hold your snacks! | boutStart where the tournament stage advances to the semi-fi | — | accepted {"seconds": 5.8677, "bytes": 41734} |
| `sj2_027` | stage_final | Grand final — popcorn time! | boutStart where the tournament stage advances to the grand f | — | accepted {"seconds": 3.7934, "bytes": 27288} |
| `sj2_028` | stage_final | The crown is here — finders keepers! | boutStart where the tournament stage advances to the grand f | — | accepted {"seconds": 4.4532, "bytes": 31860} |
| `sj2_029` | stage_final | Grand final underway — history, one jump at a time! | boutStart where the tournament stage advances to the grand f | — | accepted {"seconds": 5.619, "bytes": 40088} |
| `sj2_030` | clean_move | Ooh, clean — even the pieces clapped quietly. | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 5.2422, "bytes": 37346} |
| `sj2_031` | clean_move | So tidy — the board said thank you! | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 3.512, "bytes": 25277} |
| `sj2_032` | clean_move | Smooth — not one piece complained. | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 4.9959, "bytes": 35700} |
| `sj2_033` | clean_move | Textbook — someone did their homework. | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 3.7723, "bytes": 27106} |
| `sj2_034` | clean_move | Cleaner than my kitchen — and I never cook! | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 4.2747, "bytes": 30580} |
| `sj2_035` | clean_move | The move is elegant — not me! | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 4.2325, "bytes": 30397} |
| `sj2_036` | clean_move | The sneaky ones are the best! | existing STREAMER praise/good quality gate: engine-verified  | — | accepted {"seconds": 3.5185, "bytes": 25277} |
| `sj2_037` | capture1 | One piece off — board lost weight! | caps === 1 on the mover's committed move | — | accepted {"seconds": 5.9016, "bytes": 41917} |
| `sj2_038` | capture1 | A capture — that piece will tell stories. | caps === 1 on the mover's committed move | — | accepted {"seconds": 4.6954, "bytes": 33506} |
| `sj2_039` | capture1 | Taken — one down — the drama continues! | caps === 1 on the mover's committed move | — | accepted {"seconds": 4.6937, "bytes": 33506} |
| `sj2_040` | capture1 | One capture — clean, polite, civilized! | caps === 1 on the mover's committed move | — | failed |
| `sj2_041` | capture1 | No farewell party for that piece! | caps === 1 on the mover's committed move | — | accepted {"seconds": 3.2268, "bytes": 23266} |
| `sj2_042` | capture1 | Captured — the crowd goes... politely interested! | caps === 1 on the mover's committed move | — | accepted {"seconds": 5.2495, "bytes": 37346} |
| `sj2_043` | capture2 | Double capture — two pieces, zero apologies! | caps === 2 on the mover's committed move | — | accepted {"seconds": 4.5984, "bytes": 32957} |
| `sj2_044` | capture2 | Off they go like late buses! | caps === 2 on the mover's committed move | — | accepted {"seconds": 4.1652, "bytes": 29848} |
| `sj2_045` | capture2 | A double strike — the material report got interesting! | caps === 2 on the mover's committed move | — | accepted {"seconds": 5.1776, "bytes": 36980} |
| `sj2_046` | capture2 | Somebody skipped breakfast for this! | caps === 2 on the mover's committed move | — | accepted {"seconds": 4.788, "bytes": 34237} |
| `sj2_047` | capture2 | Doubled up — the picnic basket got lighter. | caps === 2 on the mover's committed move | — | accepted {"seconds": 3.9705, "bytes": 28386} |
| `sj2_048` | capture2 | Two for one move — best deal in town! | caps === 2 on the mover's committed move | — | accepted {"seconds": 5.0378, "bytes": 35883} |
| `sj2_049` | capture3plus | A capture chain — call the board's insurance! | caps >= 3 on the mover's committed move | — | accepted {"seconds": 5.3281, "bytes": 37894} |
| `sj2_050` | capture3plus | Three or more — that was a whole parade! | caps >= 3 on the mover's committed move | — | accepted {"seconds": 3.4623, "bytes": 24911} |
| `sj2_051` | capture3plus | Multi-capture — they left faster than my Mondays! | caps >= 3 on the mover's committed move | — | accepted {"seconds": 5.2053, "bytes": 37163} |
| `sj2_052` | capture3plus | What a sequence — the board needs a moment. | caps >= 3 on the mover's committed move | — | accepted {"seconds": 4.0916, "bytes": 29300} |
| `sj2_053` | new_king | A new king — get the tiny crown polished! | promotes: the moved piece reaches the king row and is crowne | — | accepted {"seconds": 4.2883, "bytes": 30763} |
| `sj2_054` | new_king | Promotion — humble piece to royalty in one trip. | promotes: the moved piece reaches the king row and is crowne | — | accepted {"seconds": 5.9673, "bytes": 42466} |
| `sj2_055` | new_king | Crowned — that king owned the runway. | promotes: the moved piece reaches the king row and is crowne | — | accepted {"seconds": 3.7095, "bytes": 26740} |
| `sj2_056` | new_king | Last row reached — a king is born, applaud! | promotes: the moved piece reaches the king row and is crowne | — | accepted {"seconds": 5.8536, "bytes": 41734} |
| `sj2_057` | new_king | The others pretend not to be jealous! | promotes: the moved piece reaches the king row and is crowne | — | accepted {"seconds": 4.4506, "bytes": 31860} |
| `sj2_058` | pressure | Behind on pieces — underdogs love a good story! | the seat the line addresses is behind on material per the en | — | accepted {"seconds": 5.6304, "bytes": 40088} |
| `sj2_059` | pressure | Deep breath, then magic! | the seat the line addresses is behind on material per the en | — | accepted {"seconds": 2.9009, "bytes": 21071} |
| `sj2_060` | pressure | Behind on material — the board respects patience! | the seat the line addresses is behind on material per the en | — | accepted {"seconds": 5.5441, "bytes": 39540} |
| `sj2_061` | pressure | Pressure on — snack, calm, play on! | the seat the line addresses is behind on material per the en | — | accepted {"seconds": 5.1305, "bytes": 36614} |
| `sj2_062` | pressure | Material down, humor intact! | the seat the line addresses is behind on material per the en | — | accepted {"seconds": 4.3964, "bytes": 31494} |
| `sj2_063` | turnaround | The report flipped like pancakes! | existing verified-material-turnaround gate | — | accepted {"seconds": 3.6931, "bytes": 26557} |
| `sj2_064` | turnaround | From behind to superb bounce-back! | existing verified-material-turnaround gate | — | accepted {"seconds": 4.2511, "bytes": 30397} |
| `sj2_065` | turnaround | The comeback is real — I checked twice! | existing verified-material-turnaround gate | — | accepted {"seconds": 4.635, "bytes": 33140} |
| `sj2_066` | turnaround | Look at the material now — doubters, sit down! | existing verified-material-turnaround gate | — | accepted {"seconds": 5.929, "bytes": 42100} |
| `sj2_067` | trap | Something suspicious on that square... just saying! | existing trap_set gate: a real trap is present on the board | — | accepted {"seconds": 3.7475, "bytes": 26923} |
| `sj2_068` | trap | That bait is so obvious. I almost took it! | existing trap_set gate: a real trap is present on the board | — | accepted {"seconds": 5.5116, "bytes": 39174} |
| `sj2_069` | trap | That piece is a souvenir now! | existing trap_spring gate: the baited capture resolved again | — | accepted {"seconds": 4.3752, "bytes": 31311} |
| `sj2_070` | trap | Even I saw that trap coming! | existing trap_spring gate: the baited capture resolved again | — | accepted {"seconds": 5.79, "bytes": 41186} |
| `sj2_071` | trap | Careful — that square has sticky fingers! | existing trap_set gate: a real trap is present on the board | — | accepted {"seconds": 4.4485, "bytes": 31860} |
| `sj2_072` | after_loss | A tough loss — but hey, the jokes were free! | match ends with the addressed seat losing | — | accepted {"seconds": 4.1441, "bytes": 29666} |
| `sj2_073` | after_loss | Didn't go your way — the board forgives! | match ends with the addressed seat losing | — | accepted {"seconds": 4.7085, "bytes": 33688} |
| `sj2_074` | after_loss | That spirit pays the bills! | match ends with the addressed seat losing | — | accepted {"seconds": 3.7072, "bytes": 26557} |
| `sj2_075` | after_loss | Losses sting — that spirit pays the bills! | match ends with the addressed seat losing | — | pending |
| `sj2_076` | win | That's the win — start the victory dance music! | match ends with the addressed seat winning | — | pending |
| `sj2_077` | win | Victory — composure, patience, possibly a lucky coin! | match ends with the addressed seat winning | — | pending |
| `sj2_078` | win | It's decided — winner gets glory, board gets a rest! | match ends with the addressed seat winning | — | pending |
| `sj2_079` | win | Match won — the last piece took a bow! | match ends with the addressed seat winning | — | pending |
| `sj2_080` | draw | A draw — both sides blink, nobody winks! | official draw | — | pending |
| `sj2_081` | draw | It ends level — the board calls it diplomacy! | official draw | — | pending |
| `sj2_082` | draw | A fair draw — even the scoreboard needs a nap! | official draw | — | pending |
| `sj2_083` | quiet_engagement | A quiet moment — I promise not to jinx anything! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_084` | quiet_engagement | Shhh — the pieces are thinking. Their favorite show! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_085` | quiet_engagement | Good morning, early birds — the board salutes you! | no tactical claim; live play continues; eligible idle direct | 05-11 | pending |
| `sj2_086` | quiet_engagement | Nothing flashy — but I'm staying ready anyway! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_087` | quiet_engagement | A calm stretch — admire the geometry of chaos! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_088` | comment_prompt | What would you play? Comments below — brave answers only! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_089` | comment_prompt | Rate that move — I'll pretend I got it first try! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_090` | comment_prompt | Guess the next big moment — bragging rights await! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_091` | comment_prompt | Favorite move so far? The board is listening... probably! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_092` | like_share_follow | Enjoying the chaos? Tap that like — gently, it's new! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_093` | like_share_follow | Share this stream — your friends deserve checkers too! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_094` | like_share_follow | Hit follow — it's free and makes the board happy! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_095` | like_share_follow | A like, a share, a follow — pick your adventure! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_096` | like_share_follow | Made you smile? The like button takes compliments! | no tactical claim; live play continues; eligible idle direct | — | pending |
| `sj2_097` | intermission | Table resets — best move so far? Jury is out! | post-retirement speech finished and ceremony ownership relea | — | pending |
| `sj2_098` | intermission | Short break — the follow button warms up nicely now! | post-retirement speech finished and ceremony ownership relea | — | pending |
| `sj2_099` | intermission | Next bout approaches — snacks ready, hearts steady! | post-retirement speech finished and ceremony ownership relea | — | pending |
| `sj2_100` | intermission | Between bouts: the stream continues, and so do the jokes! | post-retirement speech finished and ceremony ownership relea | — | pending |
