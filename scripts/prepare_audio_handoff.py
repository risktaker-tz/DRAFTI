#!/usr/bin/env python3
"""Package only the owner's public audio research inputs for Z.ai."""
import hashlib, json, pathlib, subprocess, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
MEDIA=ROOT/'scripts/research_media'
EXPANSION=MEDIA/'owner-expansion'
FFMPEG=ROOT/'scripts/tooling/node_modules/ffmpeg-static/ffmpeg.exe'

def main():
    sources=json.loads((EXPANSION/'sources.json').read_text(encoding='utf8'))
    selected={item['id']:EXPANSION/item['files'][0]['name'] for item in sources if item['exitCode']==0 and item['files']}
    if len(selected)!=4:raise ValueError('All four requested downloads must finish first')
    selected['mvUVrweNvsQ']=MEDIA/'mvUVrweNvsQ.webm'
    wavs={}
    for video_id, source in selected.items():
        target=EXPANSION/(video_id+'-analysis.wav')
        subprocess.run([str(FFMPEG),'-v','error','-y','-i',str(source),'-ac','1','-ar','16000',str(target)],check=True)
        wavs[video_id]=target
    archive=MEDIA/'drafti-owner-audio-handoff.zip'
    hashes={}
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as bundle:
        for video_id, source in selected.items():
            name='raw/'+source.name;bundle.write(source,name);hashes[name]=hashlib.sha256(source.read_bytes()).hexdigest()
            name='analysis/'+video_id+'.wav';bundle.write(wavs[video_id],name);hashes[name]=hashlib.sha256(wavs[video_id].read_bytes()).hexdigest()
        bundle.write(ROOT/'docs/audio-expansion-request.md','REQUEST.md')
        bundle.write(EXPANSION/'sources.json','SOURCES.json')
        bundle.writestr('SHA256SUMS.json',json.dumps(hashes,indent=2)+'\n')
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip():raise ValueError('Archive checksum failure')
    print(json.dumps({'path':str(archive),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'rawSources':len(selected)},indent=2))
if __name__=='__main__':main()
