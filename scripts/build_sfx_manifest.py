#!/usr/bin/env python3
"""Rebuild embedded audio with explicit protection for existing clip updates."""
import argparse, base64, json, pathlib, re, subprocess
ROOT = pathlib.Path(__file__).resolve().parents[1]
CATEGORIES = {'majestic','comedy','voice','judge','think','drama','party','ui'}
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write',action='store_true')
    parser.add_argument('--allow-update',action='append',default=[])
    args=parser.parse_args()
    script="const fs=require('fs'),vm=require('vm'),c={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);process.stdout.write(JSON.stringify(c.window.DRAFTI_SFX));"
    previous=json.loads(subprocess.check_output(['node','-e',script,str(ROOT/'src/audio.manifest.js')],text=True,encoding='utf8'))
    catalog=json.loads((ROOT/'scripts/audio_catalog.json').read_text(encoding='utf8'))
    missing=set(previous)-set(catalog)
    if missing: raise ValueError('Existing IDs removed from catalog: '+str(sorted(missing)))
    bank={}
    changed=[]
    for name,meta in catalog.items():
        if not re.fullmatch(r'[A-Za-z0-9_]+',name): raise ValueError('Invalid ID '+name)
        if meta['c'] not in CATEGORIES or not meta.get('b'): raise ValueError('Missing category/credit '+name)
        if name not in previous and not all(meta.get(k) for k in ['source','license','use']): raise ValueError('New clips need source, license and use: '+name)
        data='data:audio/mpeg;base64,'+base64.b64encode((ROOT/'src/audio'/f'{name}.mp3').read_bytes()).decode('ascii')
        definition={k:v for k,v in meta.items() if k not in ['source','license','use']}
        definition['d']=data
        if name in previous and definition!=previous[name]:
            if name not in args.allow_update: raise ValueError('Existing clip update requires --allow-update '+name)
            if not (ROOT/'sfx_swap/backups'/f'{name}.mp3').exists(): raise ValueError('Missing reversible original backup '+name)
            changed.append(name)
        bank[name]=definition
    output='/* DRAFTI embedded sound bank. Full sources and licenses: ATTRIBUTIONS.md. */\nwindow.DRAFTI_SFX = '+json.dumps(bank,ensure_ascii=False,separators=(',',':'))+';\n'
    if args.write: (ROOT/'src/audio.manifest.js').write_text(output,encoding='utf8')
    print(f'{len(bank)} clips verified; updates: {changed}; '+('manifest written' if args.write else 'validation only'))
if __name__=='__main__': main()
