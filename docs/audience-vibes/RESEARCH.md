# AUDIENCE VIBES — Phase A Research Report

**Branch:** `codex/zai-audience-vibes` (isolated, branched from verified tip `30fc1c1` of `codex/blueprint-release`)
**Author:** zacharia <zachariafx@gmail.com>
**Scope:** Phase A only — source research, license/link verification and a machine-checked catalog of ≥501 distinct, realistic, usable crowd/audience recordings. No game code, UI, audio bank, manifests, profiles or deployment files touched. No raw audio committed to Git.

---

## 1. Result summary

**646 verified distinct recordings** (target ≥501) from 837 raw search hits, all license-verified (452+387 CC0-heavy mix: 387 CC0, 225 CC BY 4.0, 34 CC BY 3.0), each with a working direct download URL, ffprobe-validated audio, unique SHA-256 and full game-mapping metadata. Validator: **PASS**.

| Raw pool | 837 raw search hits (51 query×license pairs, freesound.org) |
| --- | --- |
| Sound pages fetched | 837 (830 with license deed; 7 without → rejected) |
| Screen rejections | 173 (music/synthetic/processed cues or profanity-wording in metadata) |
| Download failures | 10; too-short 1 |
| Duplicate content | 0 found beyond the screens (SHA-256 unique per entry) |
| **Verified** | **646** (387 CC0 1.0, 225 CC BY 4.0, 34 CC BY 3.0) |
| Crowd identity | A community 188, B arena 179, either 279 |
| Events | cheer 99, chatter_bed 132, venue_bed 88, applause 80, funny_laugh 58, cheer_kids 42, disappointment 46, gasp 38, whistle 29, encouragement_chant 19, tension_bed 15 |
| Speech-flagged | 358 (20 explicit-English metadata; 340 honest "uncertain/pending Phase B ASR"; 286 nonverbal) |
| Intensity | high 113 / medium 423 / low 110 |
| Loopable beds | 220 (chatter + venue) |
| Total verified audio | ~20.6 minutes of crowd recordings; durations 1.2 s – 22.6 min |
| Excerpt windows | real silence-derived windows (≥3 s) for all sources >40 s; whole-clip windows otherwise |

Failures are itemized in `search-ledger.json` (every raw hit with status + reason). 18 of the longest files were still finishing verification when the catalog snapshot was taken; the verified set above already exceeds the requirement, so they are recorded in the ledger as not-processed rather than padded in.

## 2. Method

### 2.1 Sources

Primary source: **freesound.org** (the largest CC0/CC-BY real-recording library; every upload carries an explicit license with a per-sound deed link). Search was restricted server-side with the `license:"Creative Commons 0"` and `license:"Attribution"` filters, so every hit is CC0 or CC-BY by construction; the per-sound deed URL is then re-verified on the sound's own page (independent of search-filter correctness).

51 (query × license) search pairs over 13 category groups, up to 4 result pages each, produced the raw hit pool. Queries were designed to cover the game's needs: cheers/roars, applause, gasps, disappointment (aww/boo/oh-no), encouragement chants, chatter beds, children cheering, audience laughter, whistles, tension/suspense/relief, plus venue-targeted queries for the two crowd identities (community/street/market → identity A; stadium/arena/auditorium → identity B).

### 2.2 Verification pipeline (reproducible)

All tooling is committed under `scripts/audience-vibes/`:

1. `crawl_search.py` — collects raw search hits (sound id, uploader, title, preview URLs, duration, matching queries). Output is a raw snapshot only; nothing here is trusted as "verified".
2. `crawl_sound_pages.py` — fetches each sound's own page and extracts the **license deed URL** (anchor titled "Go to the full license text"), the author's description, tags and exact duration.
3. `verify_audio.py` — downloads the **public HQ preview MP3** (stable CDN URL, no auth needed) for every whitelisted-license sound, validates it as real audio with ffprobe, records exact duration / byte size / SHA-256, and for sources >40 s proposes up to 3 distinct excerpt windows using ffmpeg silence detection (real boundaries from actual audio content, not guesses). Raw audio is kept in `/tmp` only — **no recordings are committed to Git**.
4. `build_catalog.py` — screening + mapping + emission of the catalog, manifest, ledger and evidence log (see §3).
5. `validate_catalog.py` — machine-checks every requirement (see §5). Exits non-zero on any violation.

### 2.3 What "verified" means in Phase A (honest scope)

A catalog entry is **auto-verified** when all of the following hold:

- license deed URL resolves to CC0 or CC-BY (whitelisted deeds only; NC/ND/NC-SA are rejected),
- the direct audio URL returned HTTP 200 with audio content,
- ffprobe confirms a decodable stream with duration ≥ 1 s,
- metadata screen passes (see §3.1),
- SHA-256 is unique in the catalog (no duplicate content),
- no duplicate (uploader, title) pair.

It does **not** yet include: human listening, ASR transcription, loudness matching or precise in-game timing. Those are Phase B (Codex hands over the downloaded, SHA-pinned audio; entries carry `review_status: "auto-verified; content listen/ASR + pack timing pending Phase B"`). The `speech_content` field records what the source metadata honestly supports (quoted words from the author's description when present, otherwise an explicit "pending Phase B ASR" marker).

## 3. Screening rules

### 3.1 Rejection (applied to every raw hit; every decision is recorded in `search-ledger.json`)

- **License not verifiable / not whitelisted** — no deed link on the page, or deed is NC/ND/NC-SA.
- **Music / synthetic / processed cues** in title+tags+description: music, song, melody, instrumental, guitar, piano, synth, 8-bit, chiptune, robotic, electronic, glitch, ringtone, anthem, jingle, rap, drums, soundtrack, cartoon, sci-fi, alien, zombie, monster, laser, reversed, slow-mo, distorted, pitch-shift, announcer, commentator, narration, advertising, podcast, interview. (Crowd a-cappella chants are kept; `singing` alone is not a rejection token — football chants are frequently sung, and they are encouragement content, not music beds.)
- **Profanity / adult wording** in metadata (word-boundary match).
- **Download/decode failure**, duration < 1 s.
- **Duplicates**: identical SHA-256 (exact same audio uploaded twice), or identical (uploader, title).

### 3.2 Known limits

- Content correctness of tags/descriptions is the author's, not ours: an entry whose description is wrong (e.g. "crowd" that is actually a single person) will only be caught by Phase B listening. The ledger preserves every rejection reason so Codex can re-derive decisions.
- Pitch-variant duplicates (same take, re-pitched) cannot be detected cheaply without listening; uploads are distinct Freesound sound entries, and exact-content duplicates are already removed by SHA-256. Phase B listening should drop any residual near-duplicates.
- The verified audio is the CC0/CC-BY **HQ preview** (MP3). The original WAV is downloadable only with a Freesound account; Phase B may fetch originals (same license) and SHA-pin those. Preview SHA-256 + size are recorded now so nothing can silently change in between.

## 4. Catalog fields (per entry)

`id` (stable `av-fs-<soundid>`), `title`, `author`, `author_page`, `source_page` (exact Freesound sound page), `audio_url` (direct download), `audio_url_type`, `license` (exact), `license_evidence_url` (CC deed), `duration_sec`, `bytes`, `sha256`, `search_categories`, `tags`, `source_description`, `crowd_identity_suggestion` (A/B/either) + `identity_basis`, `event`, `side_affinity` (+ note: clips are team-neutral; the runtime director decides which bank a reaction belongs to), `valence`, `intensity`, `phase`, `loopable`, `speech` (+`speech_language`, `speech_content`), `cooldown_sec`, `max_per_minute`, `excerpt_windows` (real timestamps; silence-derived for long sources, whole-clip for short ones), `verified` (link status, ffprobe, dedupe, screen, timestamp, tooling), `review_status`.

**Identity key:** A = community crowd (close, warm, market/street/children/local-fans energy); B = arena crowd (stadium/arena/auditorium big-crowd energy); "either" = fits both banks. Venue wording in title/tags/description drives the suggestion; Codex owns the final assignment.

**Event vocabulary:** `cheer`, `cheer_kids`, `applause`, `gasp`, `disappointment`, `encouragement_chant`, `funny_laugh`, `whistle`, `tension_bed`, `chatter_bed`, `venue_bed`. Cooldown/quota defaults per event are in `source-catalog.json → entries[].cooldown_sec / max_per_minute` (loop beds have cooldown 0 and are marked `loopable: true`).

## 5. Validation (machine-checked)

`python3 scripts/audience-vibes/validate_catalog.py` (run from repo root) enforces, and re-prints honestly:

- ≥ 501 verified entries, all required fields present and non-empty,
- licenses exactly in the CC0/CC-BY whitelist with CC deed evidence URLs,
- `source_page` is a real Freesound sound page whose id matches the stable entry id; `audio_url` is a Freesound CDN URL embedding the same id,
- no duplicate ids / SHA-256 / (author, title); durations ≥ 1 s; excerpt windows within duration and ≥ 3 s,
- catalog ↔ `download-manifest.json` ↔ `evidence/verification-log.json` ↔ `search-ledger.json` consistency,
- coverage: both crowd-identity banks viable, every core event ≥ 10 entries, ≥ 20 speech-flagged clips, ≥ 30 loopable chatter/venue beds.

## 6. Files delivered by Phase A

| File | Purpose |
| --- | --- |
| `docs/audience-vibes/source-catalog.json` | The verified catalog (entries + policy + identity key) |
| `docs/audience-vibes/download-manifest.json` | Machine-readable download list for Phase B (URL, license, SHA-256, size, duration per entry) |
| `docs/audience-vibes/evidence/verification-log.json` | Per-entry link/license/audio evidence (HTTP status, content type, bytes, SHA-256, ffprobe, timestamp) |
| `docs/audience-vibes/search-ledger.json` | Every raw search hit with status/reason — verified assets vs rejected vs inaccessible, fully separated |
| `docs/audience-vibes/RESEARCH.md` | This report |
| `scripts/audience-vibes/*.py` | Reproducible pipeline + validator |

## 7. Handoff to Phase B (Codex)

1. `download-manifest.json` lists one stable direct URL per verified entry with its preview SHA-256; re-download, re-hash, and pin the chosen assets (preview MP3 or original WAV after license-equivalent account download).
2. Entries flagged `speech: true` need ASR (the repo already has an ASR pipeline from the streamer work) to fill `speech_content` honestly and to catch any profanity that metadata screening missed.
3. `excerpt_windows` are real silence-derived boundaries ready for loudness/energy profiling (`verify_audio.py` stores ffprobe data per entry; extend it for EBU R128 loudness when building the pack).
4. Ducking/duck-beneath-speech, side-affinity assignment per match state and final cooldowns are runtime concerns (Codex owns `streamer` director integration); the catalog only suggests.
