# PIPELINE_NOTES — what each recovered file is

Snapshot origin: z.ai build workspace `/home/z/my-project/scripts/`, READ-ONLY copy; branch codex/blueprint-progress was not modified.

| file | role |
| --- | --- |
| tts_gen2.sh .. tts_gen8.sh | z-ai TTS generation batches (voice jam/kazi, raw WAV into tts_raw*/ dirs) |
| tts_shrimp2.sh | regenerates the shrimp/retirement TTS recreations (batch 7b) |
| voice_proc4/5/6.py | speech-safe processing: trim, 120/220 ms pads, -1.5 dBFS, mono 22050, MP3 56k |
| build_sfx_manifest.py | embeds src/audio/*.mp3 as base64 into src/audio.manifest.js (+inline credits) |
| slice_sfx.py / source_sfx.py | exact cut table for sourced clips (incl. N1BOQ_9laWs card windows) |
| download_sfx.py / process_sfx.py / research_sfx.py / research_archive.py / sfx6_*.py | archive.org & freesound sourcing, CC0 filter, slicing, loudness match |
| sfx_stadium.py / think_stings.py / wire_stadium.py | stadium pack + think-sting batches |
| drafti_audio3.py / audio3_report.json | batch-3 voice processing report |
| asr_segments.py / asr_retry.py | ASR verification of raw TTS takes |
| codex_audio_probe.py | read-only provenance probe (bank bytes vs committed mp3 vs raw TTS takes) |
| sfx_report.json / sfx_archive.json | trim/freesound research reports |

## Batch status vs the bank (branch codex/blueprint-progress)

- Batches 2-7 + 7b: generated and embedded (voice clips present in src/audio.manifest.js).
- **Batch 8 (tts_gen8.sh, arena roster introductions `roster_*`): NEVER generated** —
  no tts_raw8/ dir exists in the workspace and no `roster_*` id exists in the bank.
  It is transcript-only; regenerate with the command pattern above when a z-ai CLI is available.
- shrimp1/2, v_retire1/2: TTS recreations (raw takes tts_raw7/shrimp_a,b.wav, retire_a,b.wav);
  originals still pending — see the swap instructions in the repo sfx_swap/README.txt.
