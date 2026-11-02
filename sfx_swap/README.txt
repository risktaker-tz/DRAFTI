DRAFTI original-clip status (2026-11-02)

Retirement: the exact original Short https://youtube.com/shorts/KBVNiOAnHiA
was downloaded successfully on the owner's Windows machine. v_retire1.mp3
now contains the natural sentence; v_retire2.mp3 contains the original
first 15 seconds, as explicitly requested by the owner. Additional short
retirement and skill-only excerpts are documented in ATTRIBUTIONS.md.
The former TTS v_retire1/2 files are preserved unchanged in backups/.

Shrimp: the exact Short https://youtube.com/shorts/mvUVrweNvsQ has also
been downloaded locally. Its source audio/video are staged for speech
boundary verification. shrimp1/2 remain the existing recreations until
the original cuts are verified; no substitute provenance is claimed.

Use scripts/voice_proc.py to process a new verified cut without replacing
existing output by default. Register metadata in scripts/audio_catalog.json
and embed with scripts/build_sfx_manifest.py. Existing entry updates need
an explicit --allow-update ID and an original backup in sfx_swap/backups/.
Then run python build_web.py, the sound integrity audit and preservation test.
The older swap.sh helper is retained as historical tooling; the catalog-based
pipeline above is the current verified path for embedding new clips.
