Swap in the exact original meme clips
=====================================

Two moments in DRAFTI use in-house voice RECREATIONS of viral clips (the
sandbox this game was built in could not download from YouTube):

  shrimp1.mp3 / shrimp2.mp3   — "Is this the shrimp one??"
    wanted moment: your last piece is about to be devoured
    source: https://youtube.com/shorts/mvUVrweNvsQ

  v_retire1.mp3 / v_retire2.mp3 — "How can you allow the one with that
    skill to retire?!"  (the retirement ceremony, 0-15 s of the clip)
    source: https://youtube.com/shorts/KBVNiOAnHiA

To use the EXACT original audio instead:

  1. Download the audio of those two Shorts (any downloader you like).
  2. Convert to mp3, mono, 56 kbps, 22050 Hz, e.g. with ffmpeg:
       ffmpeg -i clip.m4a -ac 1 -ar 22050 -b:a 56k v_retire1.mp3
     (keep the exact file names shown above)
  3. Copy the files into src/audio/ (replacing the recreations).
  4. Rebuild the single-file game:
       python3 build_web.py
     The rebuilt web/index.html now carries the original clips.

Keep this folder's copies if you want to switch back.
