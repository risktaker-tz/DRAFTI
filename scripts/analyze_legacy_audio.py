#!/usr/bin/env python3
"""Measure existing audit violations without changing their recordings."""
import json,pathlib,numpy as np
from voice_proc import decode,ffmpeg_path,RATE
ROOT=pathlib.Path(__file__).resolve().parents[1]
audit=json.loads((ROOT/'docs/sound-integrity-current.json').read_text(encoding='utf8'))
rows=[]
for item in audit['durations']:
    name=item['id'];x=decode(ffmpeg_path(),ROOT/'src/audio'/f'{name}.mp3')
    active=np.flatnonzero(np.abs(x)>np.max(np.abs(x))*.001)
    first,last=int(active[0]),int(active[-1])+1
    blocks=np.array([np.max(np.abs(x[i:i+441])) for i in range(first,last,441)])
    rows.append({'id':name,'originalSeconds':len(x)/RATE,'firstActive':first/RATE,'lastActive':last/RATE,
        'speechSpanWithPadding':(last-first)/RATE+.34,'nearSilentBlockSeconds':float(np.sum(blocks<np.max(np.abs(x))*.001))*.02})
    print(json.dumps(rows[-1]),flush=True)
(ROOT/'docs/legacy-audio-analysis.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8')
