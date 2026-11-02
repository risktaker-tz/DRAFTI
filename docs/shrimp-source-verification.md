# Original shrimp source and installed cuts

The exact requested source is https://youtube.com/shorts/mvUVrweNvsQ.
The downloaded mono 16 kHz transcription WAV is 442,930 bytes, SHA-256
`e4e81189738e74655c30462b80aac7234f6f4fa05f180bda3c39a453b9a9fc83`.
Z.ai first verified progress branch tip `191bbbe` and then analysed that WAV.
Its downloaded report is retained verbatim in `shrimp-transcription-report.md`.

Z.ai reported quota failures for its hosted ASR. Its Linux faster-whisper
small fallback initially drifted on the full recording; it rejected that
pass and transcribed energy-delimited slices. Its word timestamps are
model estimates, not manual alignment. The question occurs once around
11.22–12.14 seconds, with the energy tail extending to about 12.305; the
speaker says “Anyway” around 12.63–12.89. No second original take was found.

The installed framings deliberately retain more tail than Z.ai's proposed
12.280-second endpoint, so the question's quiet ending is not cut:

| Slot | Source span | Natural duration | Content |
| --- | --- | --- | --- |
| shrimp1 | 11.105–12.570 s | 1.465 s | Original question |
| shrimp2 | 11.105–13.150 s | 2.045 s | The same question plus “Anyway” |

`scripts/install_shrimp_originals.py` checks the source hash, selects those
spans without changing tempo, and passes them through the existing MP3
processor. Both are mono 22050 Hz at 56 kbps, decoded peaks −1.555 dBFS,
and below 60 KiB. Exact file hashes and measurements are in
`shrimp-original-cuts.json`. The old recreations remain under
`sfx_swap/backups/`. Runtime playback explicitly uses rate 1.

This is one authentic utterance with two honest framings; it is not two
different performances. Original rights remain with the source creator.
