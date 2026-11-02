# Download-attempt evidence — 2 Nov 2026 (z.ai research sandbox)

READ-ONLY research session for branch `codex/blueprint-progress`. No repo file,
no game sound, and no Pages/Vercel deployment was touched. The three wanted
videos were attempted with yt-dlp 2026.10.26 (installed fresh for this test).

## Result: all downloads blocked by YouTube's bot wall — same wall as the original build

| # | Target | Command shape | Outcome |
| --- | --- | --- | --- |
| 1 | `mvUVrweNvsQ` (shrimp) | `yt-dlp -f bestaudio/best`, default clients | FAIL — `playability status: LOGIN_REQUIRED`, `ERROR: ... Sign in to confirm you're not a bot ... HTTP Error 429` |
| 2 | `KBVNiOAnHiA` (retirement) | same | FAIL — same bot wall (see `attempt_retire.log`) |
| 3 | `N1BOQ_9laWs` (Mondal Screen compilation, for acoustic proof of `later_moments`/`later_hours`) | same | FAIL — same bot wall (see `attempt_memecomp.log`) |
| 4 | `mvUVrweNvsQ` retry | `--extractor-args "youtube:player_client=tv,web_safari,android"` | FAIL — same bot wall (see `attempt2_shrimp.log`) |

The full raw yt-dlp logs are in this folder (`attempt_*.log`).

## The URLs themselves are live and correct

- `https://youtube.com/shorts/mvUVrweNvsQ` — HTTP 200; page title:
  **"Is this the shrimp one?? #horse #shorts #equestrian #takis #pony #horsehumor #funnyanimals"**
- `https://youtube.com/shorts/KBVNiOAnHiA` — HTTP 200; page title:
  **"The only one who got that skill shouldn't retire says president museveni 😂🤣😅 hoimastadiumcommisionin"**
- `https://youtube.com/shorts/N1BOQ_9laWs` — HTTP 200 (Mondal Screen compilation)

Metadata (title pages) is reachable; the media stream is not, without cookies/login.

## What this means

1. The sandbox cannot obtain the originals — the current TTS recreations in the
   bank stay untouched and remain the correct fallback.
2. The owner (or any machine with a logged-in YouTube session) can obtain them
   manually, e.g. on Windows:
   `yt-dlp --cookies-from-browser chrome -f bestaudio -x --audio-format m4a -o shrimp.m4a https://youtube.com/shorts/mvUVrweNvsQ`
   then follow `sfx_swap/README.txt` in the repo (convert mono 22050 Hz, 56 kbps,
   keep exact file names, drop into `src/audio/`, rebuild).
3. `codex_verify_cut.py` (this folder) independently verifies any obtained
   original against the bank before swapping: duration match + normalized
   cross-correlation after loudness removal. Usage:
   `python codex_verify_cut.py <downloaded.m4a> <start_s> <end_s> <bank_clip.mp3>`
   For the compilation proof: cut windows 7.62–10.39 s (`later_moments`) and
   13.42–15.14 s (`later_hours`) per `source_sfx.py`.
