#!/usr/bin/env python3
"""Fetch the owner's additional original sources for offline cut research.

Downloads are research inputs, not automatically installed game sounds. Never
includes cookies, credentials or private browser data. Requires official yt-dlp.
"""
import concurrent.futures, hashlib, json, pathlib, subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
DEST=ROOT/'scripts/research_media/owner-expansion'
SOURCES={
    'kW2NDCIpnW0': 'Rare laughter only for a genuinely silly move; strict quota/cooldown.',
    'AKozkV3MeWE': 'Separate suspense cues; identify each sound and precise matching event.',
    'fkRNoM2f9GM': 'Separate effects; identify their contents and situational uses.',
    'g0cRfVqV04Q': 'Multi-effect compilation; identify each distinct effect and use precisely.',
}
def fetch(item):
    video_id, use=item
    command=[str(ROOT/'scripts/tooling/bin/yt-dlp.exe'),'--no-playlist','--no-warnings',
             '--write-info-json','--format','bestaudio','--retries','4','--fragment-retries','4',
             '--output',str(DEST/(video_id+'.%(ext)s')),'https://www.youtube.com/watch?v='+video_id]
    run=subprocess.run(command,capture_output=True,text=True,encoding='utf8',errors='replace')
    (DEST/(video_id+'.log')).write_text(run.stdout+'\n'+run.stderr,encoding='utf8')
    metadata_path=DEST/(video_id+'.info.json')
    metadata=json.loads(metadata_path.read_text(encoding='utf8')) if metadata_path.exists() else {}
    files=[p for p in DEST.glob(video_id+'.*') if p.suffix in ('.webm','.m4a','.mp3','.opus')]
    return {'id':video_id,'url':'https://www.youtube.com/watch?v='+video_id,'intendedUse':use,
            'title':metadata.get('title'),'duration':metadata.get('duration'),'uploader':metadata.get('uploader'),
            'exitCode':run.returncode,'files':[{'name':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
def main():
    DEST.mkdir(parents=True,exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(fetch,SOURCES.items()))
    (DEST/'sources.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print(json.dumps(results,indent=2,ensure_ascii=False))
if __name__=='__main__':main()
