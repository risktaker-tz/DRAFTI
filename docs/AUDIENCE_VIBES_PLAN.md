# AUDIENCE VIBES — owner addition, 3 November 2026

Status: required new feature; Phase A research delivered; bulk raw downloads running; Phase B content review and runtime integration pending. No audience feature or external pack is shipped yet. This adds to the master blueprint, without removing its outstanding acceptance requirements.

The owner requested an Off-by-default feature with two distinct, devoted crowds supporting the current opposing teams. Natural chatter, cheers, shouts, encouragement through hardship, opponent reactions and occasional tasteful funny surprises must follow actual game events. Avoid fixed loops, repetitive patterns, wrong-team celebrations and interference with existing streamer/audio design. Preserve every current recording and existing settings.

The owner requested more than 500 realistic clips, online source research by ZAI, then Codex downloads the raw recordings and supplies a handoff for precise cuts, preparation and an isolated commit. Minimum is 501 genuinely distinct usable recordings/excerpts; search hits, duplicate takes, pitch variants or fabricated metadata do not satisfy it.

When asked about the size tradeoff, the owner requested the safer recommendation. Codex recommended and is planning an optional audience pack: keep the core single-file game small and fully playable; explicit one-time installation; offline playback afterwards; failure falls back to current audio; no downloading during a match. This delivery choice needs real assets and tested installation before any feature is exposed as ready.

## Current evidence

Phase A isolated branch `codex/zai-audience-vibes` at `6cb08a8` contains 646 checksum-pinned candidates. Imported and catalogue validator strengthened; all 646 pass metadata consistency. Content listening/ASR, near-duplicate rejection and natural edits remain required before counting usable clips. Raw total 1,670,546,740 bytes / 20.6028 hours (original report mistakenly said minutes). All previews are being downloaded in a background batch; raw/progress files are ignored and never embedded into the game.

Current public game is `2e22f91655650e4d945f5802d21131b3e5d6bc27`, with East Africa rules, verified at https://drafti-afrika.vercel.app/ . Below is the original Phase A handoff, retained as history.

## ZAI handoff

- Conversation: https://chat.z.ai/c/3c8cee52-e3bb-4f69-9bc3-e8e26d78a630 . Built-in tab3.
- Brief submitted successfully and visible with ZAI generating/Stop button. Do not interrupt. Screenshot: docs/zai-audience-handoff.png.
- Required sync base: origin/codex/blueprint-release at30fc1c10745ca6a205848921d58fd24e45459d1f. Current public UI at43fa4a7, exact SHA2565149b8e50527c51e4ea6b79622c3f51fdd0a4c1281e2fc70f31d70fbfad31658. Later source-tool commits do not change that UI.
- Isolated output branch: codex/zai-audience-vibes. Author zacharia <zachariafx@gmail.com>. No main/release push or deployment authorized for ZAI.
- Phase A: docs/audience-vibes/source-catalog.json, RESEARCH.md, license/link verification evidence and download manifest. Each candidate needs stable ID, primary source/direct URL, author/license/evidence, duration/excerpt boundaries, real words/language or nonverbal description, crowd identity, side/event/valence/intensity/phase, speech flag, cooldown/quota and review status. Prefer CC0/public domain or explicit CC-BY. Reject ads/music/profanity/insults/unverified licenses. Honest verified count and failures; durable incremental commits; bundle fallback if push fails.
- Phase B: Codex downloads and SHA-pins the real source recordings, then supplies ZAI with raw audio for ASR/energy/listening/caption verification and precise natural cuts. No false source claims or speech truncation.
- Phase A must not edit current UI/engine/styles/template/audio bank/manifests/arena/profiles/PWA/deployment. Codex owns runtime integration.

## Runtime and acceptance work still required

1. Validate/download the real source catalogue; inspect meaning, licenses, distinctness and actual decoded audio.
2. Prepare the real versioned pack and complete credits/hashes. Preserve the core bank. Measure installed size and memory use before setting a supported pack limit.
3. Add optional install/status/remove/update handling with bounded storage and validation. Keep Off default; do not block game startup or workers. Recover safely from storage denial/corruption/interrupted install and old pack versions.
4. Give each side a persistent distinct crowd identity that follows its team through board flips. Choose reactions from verified events and the correct team perspective; one meaningful foreground crowd response at a time.
5. Use central priority/mute/volume controls, low background gain and smooth ducking for speech/ceremonies. Avoid loops at high speeds, wrong winner cheers, playback after profile/game changes, and speech collision. Respect reduced motion independently.
6. No-repeat decks, clip/family/global cooldowns and quotas; natural quiet intervals and different speech/nonverbal layers. Do not synthesize pretend real people or invent clip meanings.
7. Verify Off leaves current behavior intact; both sides react correctly in all modes, names and flags; install once/play offline/reload/update/remove on PC/mobile; test performance and interruption recovery with the complete pack.

Future network multiplayer, Supabase and /admin_tz remain excluded from the current goal.
