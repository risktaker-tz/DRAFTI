#!/usr/bin/env python3
"""Compare embedded narrator recordings with a separately downloaded source compilation."""
import argparse, json, pathlib, importlib.util
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('voice_proc',ROOT/'scripts/voice_proc.py')
voice=importlib.util.module_from_spec(spec);spec.loader.exec_module(voice)
def compare(source,clip):
    source=source.astype(np.float64);clip=clip.astype(np.float64)
    clip-=clip.mean();source-=source.mean()
    length=1 << (len(source)+len(clip)-2).bit_length()
    correlation=np.fft.irfft(np.fft.rfft(source,length)*np.fft.rfft(clip[::-1],length),length)[len(clip)-1:len(source)]
    sums=np.concatenate([[0],np.cumsum(source**2)])
    energy=sums[len(clip):]-sums[:-len(clip)]
    score=correlation/np.sqrt(np.maximum(energy*np.dot(clip,clip),1e-15))
    index=int(np.argmax(score))
    return {'sourceStartSeconds':round(index/voice.RATE,4),'normalizedCorrelation':round(float(score[index]),6),'clipSeconds':round(len(clip)/voice.RATE,4)}
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source');parser.add_argument('--ffmpeg')
    args=parser.parse_args();executable=voice.ffmpeg_path(args.ffmpeg)
    original=voice.decode(executable,args.source)
    rows=[]
    for name in ['later_moments','later_hours']:
        result=compare(original,voice.decode(executable,ROOT/'src/audio'/f'{name}.mp3'))
        rows.append({'id':name,**result})
    report={'source':'https://youtube.com/shorts/N1BOQ_9laWs','method':'Normalized waveform cross-correlation against an independently downloaded compilation; mono 22050 Hz decode, no speech replacement.', 'clips':rows}
    (ROOT/'docs/narrator-original-comparison.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
    print(json.dumps(report,indent=2))
    if any(r['normalizedCorrelation']<.8 for r in rows):raise SystemExit('Source matching requires further review')
if __name__=='__main__':main()
