# AUDIENCE VIBES — Phase B raw audio and pack preparation

The owner authorized ZAI to prepare the audio while Codex handles runtime integration and other outstanding master-blueprint requirements. Leave any running ZAI task uninterrupted.

## Sync and preserve

Fetch the latest `origin/codex/blueprint-release` and inspect its current tip before starting. The verified playable East Africa source is `2e22f91655650e4d945f5802d21131b3e5d6bc27`; subsequent research/report commits do not replace that game build. Preserve all newer UI and source. Work only on isolated `codex/zai-audience-vibes`, author `zacharia <zachariafx@gmail.com>`. Never push main/release or deploy.

Phase A is `6cb08a8`. Codex imported the research and corrected its raw total to **20.6028 hours / 1,670,546,740 bytes**, not 20.6 minutes. All 646 are candidate recordings; 501 usable assets remains an unproven requirement until content review. The stronger validator checks licence-deed matching and all pinned manifest fields.

## Raw transport

Codex started all 646 downloads in one background batch with four workers, exact byte-size/SHA256 checks and cached resume. Files and progress are under ignored `scripts/research_media/audience_raw/` locally. The checksum-pinned download manifest identifies the actual bytes; do not research YouTube or substitute recordings.

ZAI already downloaded these same previews in Phase A. First check its existing `/tmp/av_audio` and durable `av-data` cache. If the raw files survive, preserve them immediately in durable ignored storage and re-hash against `download-manifest.json`. Matching bytes are the same raw handoff without a redundant 1.67 GB upload. Report the genuine reusable/missing count. If unavailable, use only the supplied direct URLs and checksum pins, resuming missing files. Do not claim the local Codex download directory is accessible remotely. Do not wait for all long files to finish before reviewing the available short recordings.

## Content review and cuts

Review actual decoded audio, not metadata alone. ASR all possible speech, verify captions against the audio, reject profanity, insults, identifiable wrong-team/nation cheers, advertisements, background music/performance rights issues, or unclear spoken meanings. Treat crowd ASR as uncertain when unintelligible. Ambient chatter may have unintelligible voices only after actual content review. Drop synthetic, pitch-varied, duplicate/near-duplicate takes; no variants used to inflate the distinct-source count. Record rejected sources/reasons as well as accepted ones.

Prepare at least **501 genuinely distinct usable recordings/excerpts** if the real reviewed sources support that count; otherwise report the shortfall honestly and research additional licensed sources. No fabricated rows, guessed words or rushed sign-off. Two naturally different crowd identities A/community and B/arena must each have their own recordings, beds and reactions; no single sound assigned to both identities. Reactions must be team-neutral in wording so Codex can bind each crowd to its actual team. Include encouragement, positive cheers, applause, surprise/gasp, sympathetic disappointment, funny laughter, whistles, tension and quiet chatter/venue beds. Keep rare loud/funny reactions sparse.

Use natural sentence boundaries with small head/tail padding and fades; never cut syllables or accelerate original speech. Reactions normally 1–6 seconds, ambient beds 8–15 seconds. Mono 22050 Hz MP3, up to 56 kbps, peak at most −1.5 dBFS, sensible measured loudness without crushing crowd dynamics. Report duration, bytes, peak and integrated loudness for every processed file. Target total processed MP3 bytes **under 32 MiB**; if genuine content cannot meet this, report before sacrificing words or count. This is a separate optional pack, never embedded in core HTML.

## Delivery contract

Commit processing scripts, exact cuts/transcripts, review decisions, source/processed hashes, full author/source/licence/modification credits and a pack manifest on the isolated branch. Raw 1.67 GB stays out of Git. Processed assets may be committed under `audience-pack/audio/`; keep any distributable monolithic pack as a delivery artifact with SHA256 and reproducible assembler. Preserve incremental work in durable storage. No UI, engine, existing sound bank, profile, arena, PWA or deployment edits.

Manifest `audience-pack/manifest.json`: `{schema: "drafti-audience-pack/1", version: "1.0.0", clips: [...]}`. Each clip must contain:

- `id`: safe stable unique ID; `sourceId`: distinct Phase A ID or a fully documented new source; `file`: `audio/<id>.mp3`.
- `crowd`: `A` or `B`; `event`: one of `cheer`, `cheer_kids`, `applause`, `gasp`, `disappointment`, `encouragement_chant`, `funny_laugh`, `whistle`, `tension_bed`, `chatter_bed`, `venue_bed`.
- `speech`: boolean, `language`, `transcript` (actual words, or honest reviewed nonverbal/unintelligible description), `intensity`: `low|medium|high`, `valence`: `positive|negative|neutral`, `loopable`: boolean (only reviewed beds).
- `durationSec`, `bytes`, `sha256`, `peakDbfs`, `loudnessLufs`, `sourceStartSec`, `sourceEndSec`, `sourceSha256`, `author`, `sourceUrl`, `license`, `licenseUrl`, `modifications`.
- `review`: actual review method/tools, content verdict and caveats. Every installed clip must be content-approved; pending clips must remain outside the pack.

Codex will assemble the optional portable pack, storage/install UI, event-aware two-team director, mixing/ducking and installation/offline tests. Audience Vibes remains Off by default. No runtime feature is claimed from research or this handoff alone.
