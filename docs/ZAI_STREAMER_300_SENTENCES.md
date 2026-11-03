# ZAI priority task — 100 complete sentences per streamer, then PAUSE

The owner explicitly clarified **100 new complete sentences EACH for Female, Male and Funny: 300 actual new recorded sentences total**. "Vocabulary" means an entire usable contextual sentence, never an isolated word. This takes priority over the unfinished Audience Vibes ASR follow-up. Preserve that old task and its checkpoints so it can continue later; do not silently abandon it.

## Sync and isolation

1. Fetch and inspect the latest `origin/codex/blueprint-release`, including this file and `docs/IMPLEMENTATION_HANDOFF.md`, before starting. The playable cinematic source is `5da5b77af4ce75219c44a10580f60b53aa801d86`; later release commits may be documentation only. Preserve every newer change.
2. Work on a NEW isolated branch `codex/zai-streamer-vocabulary`. Do not reset or overwrite `codex/zai-audience-vibes`, main or release. No UI/engine/CSS/profile/build/generated HTML/deployment edits. Codex has additional local Audience Vibes and progression work; do not replace it through older source snapshots.
3. Author commits as `zacharia <zachariafx@gmail.com>`. Existing GitHub authentication stays private; do not print, commit or repeat any token.
4. First preserve/checkpoint any still-running old ASR worker/watchdog. Let an in-flight request finish safely, then park that old task to avoid competing quotas. Keep all 646 pinned source records, 638 cut measurements, processed audio, transcripts, pending/rejected reasons and resume instructions. Do not restart the old grind automatically after finishing this task.

## Commit rhythm and HARD stopping point

- Generate and validate **20 successful new sentence recordings for ONE voice**, then commit and push those exact 20 with their metadata immediately. A text-only list or failed/missing recording does not count.
- Rotate fairly: Female 1–20, Male 1–20, Funny 1–20; then 21–40 for each; continue through 81–100 for each. This means **15 incremental recording commits**, not one late commit of everything. Pipeline/setup commits may be separate and do not count as sentence batches.
- Each commit must state voice, completed range, actual accepted new audio count and running totals. Failed/retry takes stay outside accepted totals. Never pad counts with duplicate/near-duplicate audio or the same sentence with tiny word changes.
- At **Female 100 + Male 100 + Funny 100**, stop. Finalize the manifests/review/credits and report the final pushed SHA, counts, total bytes and validation results, then **PAUSE FOR THE OWNER**. Do NOT create sentence 101 for any voice and do NOT resume the old audience task until the owner chooses between more sentences and the old follow-up.
- If a platform session cutoff intervenes, preserve and push every complete batch and any honestly labelled partial work; report exact unfinished counts. Do not pretend that planned text is generated audio. Use patient retries for genuine HTTP429 quotas, not concurrent retry storms.

## Keep the existing voices

- Female: existing z-ai **tongtong** profile used by `sf_*` recordings.
- Male: existing z-ai **jam** profile used by `sm_*` recordings.
- Funny: preserve the app's existing authored announcer/persona identity. The documented Kazi announcer already appears in Funny's `v_nextup` and related original app cues; inspect historical generation configuration and voice metadata before bulk generation, report the exact existing identity used, and do not invent a fourth performer or clone a third-party meme speaker. New Funny narration should be the app persona, not an unrelated Female/Male substitute. Existing credited jokes/memes remain intact.
- Check a small natural sample against the existing recordings before bulk work. No pitch/speed edits to manufacture a different voice. Humor should come from wording and delivery. Keep the voices realistic and understandable.
- Use the existing neural z-ai generation and `scripts/voice_proc.py` processing conventions. Preserve all current audio bytes; these are additions only. No robotic browser SpeechSynthesis, no fake audio links and no silent placeholders.

## Authenticity and variety — imagine a real audience watching

The owner reports repetitive capture/double-capture explanations, "what I was thinking"-style claims, and repeated "how is everyone tonight" during other times. Correct the vocabulary design, not just the randomizer.

- Prefer varied encouragement, short human reactions, invitations to comment on a decision, and natural like/share/follow prompts. Avoid narrating every routine move. Spread 100 sentences across many distinct moments and intentions; do not make 30 paraphrases of "double capture".
- **No invented forethought:** avoid "I knew that would happen", "what I was thinking", "I told you", claimed predictions or a fake personal strategy. Praise a verified find or the position actually on the board.
- **No fake social access:** the app has no live chat feed, viewer counts, donations or platform account integration. Invite comments but do not claim to read a specific comment, see a viewer's name, receive a donation or know an audience number.
- New sentences should normally be **time-neutral**. If any intentionally mention morning/afternoon/evening/tonight, tag the exact local-hour predicate. Never assume night from a stream being live. Codex has added runtime clock gates to existing lines.
- A new bout/event/season is NOT a new livestream. A welcome belongs only to the stream session opening. Continuing-match/event transitions must sound like continuing coverage, not "we're just beginning".
- A capture run is NOT consecutive match wins. A good move after a blunder does NOT prove a material comeback. A match win is NOT automatically a season championship. No claim of a blunder, trap, advantage or forced win without its actual engine/event predicate.
- Avoid saying a player is male/female, naming a team/country or speaking a score unless the event truly supplies it. Generic "that side", "that piece", "this position" is safe. Never swap the winning/losing audience perspective.
- Do not announce the stream is ending during the post-retirement countdown. That free interval is ideal for a brief accurate transition or engagement line once the original retirement speech finishes.
- No offensive, insulting or humiliating language. Funny commentary can be self-aware and playful while remaining family-friendly. Avoid copyrighted catchphrase imitations and invented licensed provenance.

## Useful situations — cover these across EACH voice

Give each sentence a precise predicate and perspective, not merely a broad category:

- session opening (few variants, session only); a new bout; a different challenger; same opponents returning after a draw; season advancement; quarter-final/semi-final/grand-final transitions;
- a clean move only when the engine verifies quality; a single capture (`caps===1`); double capture (`caps===2`); generic multiple captures (`caps>=3`); a new king (`promotes`);
- pressure for the side actually behind; a verified material turnaround; a verified trap; supportive encouragement after a loss; accurate win and draw reactions;
- quiet live engagement with no tactical claim; comment prompts about the board; like/share/follow invitations; between-bout engagement after ceremony ownership is released.

Prefer concise natural sentences, normally around 2–5 seconds, **at most6seconds** without accelerating or cutting words. Keep a slight head/tail pad and fades using the established processing pipeline. Mono22050Hz, MP3up to56kbps, peak at most−1.5dBFS; verify actual decoded length/peak/size. A 100-sentence set must not become the same cadence and phrase repeated with substituted adjectives.

## Files and optional-pack delivery

The base offline HTML must stay below its existing ~14MB limit. **Do not embed these 300 recordings into the current bank or generated HTML.** Deliver additional recordings as a separate optional pack, so Codex can install/cache the selected voice and progressively integrate completed batches while you continue.

- `streamer-pack/audio/<safe-stable-id>.mp3`; choose new IDs such as `sf2_001`, `sm2_001`, `sj2_001`, never collide with current IDs.
- `streamer-pack/manifest.json`, schema `drafti-streamer-pack/1`, with actual ID, relative file, streamer mode, exact neural voice, verbatim sentence, event role, exact event predicate, side perspective, local-hour gate if needed, mood/family, duration/bytes/SHA256/peak/LUFS, source/licence and processing modifications.
- `streamer-pack/SENTENCES.md`: human-reviewable 100-per-voice tables with scenario and exact text. `streamer-pack/CREDITS.md`: honest in-house generation/voice/tool provenance. Keep raw takes and failed retries in durable ignored storage; preserve rerun state.
- Commit a reproducible resumable generator/processor/validator under `scripts/streamer-vocabulary/`. Existing core scripts/audio must not be overwritten.
- Target processed audio under10MiB overall if natural wording supports it. Report actual size, never truncate speech to meet an arbitrary number. A distributable zip may be mirrored under the task's download artifacts with SHA256, but Git commits and the per-file manifest are authoritative.
- Validate each20-batch before pushing: real audible nonempty recording; correct voice; complete matching sentence; no clipped words or artificial speed-up; nonduplicate sentence/take; exact metadata/hash/format/peak/duration; no dangerous or unsupported game claim. Uncertain recordings stay pending and do not count.

At the stopping point report the exact counts and commit ranges, explain any genuine limitation, and wait for the owner. The next choice is explicitly the owner's: resume Audience Vibes review or expand stream vocabulary further.
