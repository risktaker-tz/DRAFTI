#!/usr/bin/env python3
"""Author deterministic nonverbal effects for DRAFTI; never replace recordings.

Four performances per instrument/event combine distinct envelopes, excitation,
modal ratios, articulations and note patterns. These are openly credited
synthesis, not impersonated voices or claims of sampled real instruments.
"""
import hashlib, json, math, pathlib, tempfile, wave
import numpy as np
from voice_proc import process, ffmpeg_path, RATE

ROOT = pathlib.Path(__file__).resolve().parents[1]
# event: category, instrument, duration, base frequency
FAMILIES = {
    'slide': ('ui', 'brush', .32, 750),
    'landing': ('ui', 'wood', .24, 180),
    'jump': ('ui', 'wood', .28, 260),
    'impact': ('majestic', 'impact', .44, 105),
    'feast': ('majestic', 'fanfare', 1.25, 330),
    'crown': ('majestic', 'fanfare', 1.4, 440),
    'king_glint': ('ui', 'chime', .64, 1300),
    'zip': ('comedy', 'zip', .36, 1100),
    'boing': ('comedy', 'boing', .7, 240),
    'whistle': ('comedy', 'whistle', .85, 1100),
    'rimshot': ('comedy', 'drum', .42, 180),
    'bell': ('drama', 'metal', 1.1, 570),
    'gong': ('drama', 'metal', 1.8, 155),
    'roll': ('drama', 'roll', 1.15, 160),
    'popper': ('party', 'pop', .52, 540),
    'coin': ('party', 'arcade', .46, 900),
    'oneup': ('party', 'arcade', .85, 660),
    'stage_group': ('drama', 'gong', 1.05, 220),
    'stage_quarter': ('drama', 'fanfare', 1.1, 294),
    'stage_semi': ('drama', 'fanfare', 1.35, 392),
    'stage_final': ('majestic', 'fanfare', 1.7, 523),
    'trophy': ('party', 'chime', 1.7, 784),
    'retention': ('party', 'fanfare', .95, 349),
    'reunion': ('drama', 'roll', .85, 220),
    'drawer': ('ui', 'brush', .24, 1200),
    'toggle': ('ui', 'wood', .15, 580),
    'theme': ('ui', 'chime', .8, 1000),
    'countdown': ('ui', 'arcade', .17, 740),
    'victory': ('party', 'fanfare', 1.5, 523),
    'defeat': ('drama', 'lament', 1.4, 330),
    'draw': ('ui', 'chime', .95, 440),
}

def render(instrument, duration, base, variant, seed):
    rng=np.random.default_rng(seed)
    t=np.arange(round(duration*RATE))/RATE
    noise=rng.normal(0,1,len(t)); out=np.zeros(len(t))
    base *= [1, 1.05946, .94387, 1.12246][variant]
    # Different phrase contours and timings, not simple pitch-shift copies.
    phrases=[[0,4,7],[0,7,12,16],[7,4,0,12],[0,3,7,10,12]]
    if instrument in ('wood','impact','metal','gong'):
        ratios={'wood':[1,2.67,4.1], 'impact':[1,1.7,3.3], 'metal':[1,2.756,5.404,8.93], 'gong':[1,1.49,2.13,3.8]}[instrument]
        for j,r in enumerate(ratios):
            decay=(11 if instrument in ('wood','impact') else 2.8)*(1+j*.5)*(1+variant*.12)
            out+=np.sin(2*np.pi*base*r*t+variant*j*.4)*np.exp(-t*decay)/(j+1)
        out+=noise*np.exp(-t*(65+variant*12))*.22
        if instrument=='impact': out+=np.sin(2*np.pi*(base*t-30*t*t))*np.exp(-t*15)*.7
    elif instrument in ('brush','zip','whistle','boing'):
        if instrument=='brush':
            kernel=np.ones(3+variant*3)/(3+variant*3)
            out=np.convolve(noise,kernel,mode='same')*np.sin(np.pi*t/duration)**2
        else:
            freq=base*(1+(.5+variant*.2)*np.sin(t*np.pi/duration))
            if instrument=='zip': freq=base*np.exp(-t*(4+variant))
            if instrument=='boing': freq=base*(1+.6*np.sin(2*np.pi*(9+variant)*t)*np.exp(-t*5))
            out=np.sin(2*np.pi*np.cumsum(freq)/RATE)*np.sin(np.pi*t/duration)**.6
            if instrument=='boing': out+=.2*np.sin(4*np.pi*np.cumsum(freq)/RATE)
    elif instrument in ('drum','roll','pop'):
        count=1 if instrument=='pop' else 2+variant if instrument=='drum' else 7+variant*2
        for i in range(count):
            start=duration*.68*i/max(1,count); u=t-start; mask=u>=0; v=np.maximum(u,0)
            envelope=np.exp(-v*(45 if instrument=='pop' else 28))*mask
            out+=(noise*.5+np.sin(2*np.pi*base*v)*.6)*envelope*(.4+.6*(i+1)/count)
    else:
        notes=phrases[variant]
        if instrument=='lament': notes=[0,-3,-5,-12] if variant%2 else [0,-2,-7]
        for i,n in enumerate(notes):
            u=t-i*duration*.58/len(notes); mask=u>=0; u=np.maximum(u,0)
            freq=base*2**(n/12)
            env=(1-np.exp(-u*140))*np.exp(-u*(5 if instrument=='chime' else 9))*mask
            tone=np.sin(2*np.pi*freq*u)
            if instrument=='arcade': tone=np.tanh(tone*3)*.65
            if instrument=='fanfare': tone+=.3*np.sin(4*np.pi*freq*u)+.14*np.sin(6*np.pi*freq*u)
            if instrument=='chime': tone+=.35*np.sin(2*np.pi*freq*2.76*u)
            out+=tone*env
    out*=np.minimum(1,t/.006)*np.minimum(1,(duration-t)/.04)
    return out/max(.001,np.max(np.abs(out)))*.7

def main():
    executable=ffmpeg_path(); catalog_path=ROOT/'scripts/audio_catalog.json'
    catalog=json.loads(catalog_path.read_text(encoding='utf8'))
    report_path=ROOT/'docs/physical-audio-generation.json'
    report=json.loads(report_path.read_text(encoding='utf8')) if report_path.exists() else {}
    source='https://github.com/risktaker-tz/DRAFTI/blob/codex/blueprint-release/scripts/make_physical_sfx.py'
    with tempfile.TemporaryDirectory(prefix='drafti-physical-') as temp:
        for family,(category,instrument,duration,base) in FAMILIES.items():
            for variant in range(4):
                name=f'fx_{family}_{variant+1}'; dest=ROOT/'src/audio'/f'{name}.mp3'
                seed=int.from_bytes(hashlib.sha256(name.encode()).digest()[:4],'little')
                if dest.exists():
                    if name not in report or hashlib.sha256(dest.read_bytes()).hexdigest()!=report[name]['sha256']:
                        raise ValueError('Refusing to overwrite unverified existing clip: '+name)
                else:
                    samples=render(instrument,duration,base,variant,seed)
                    wav=pathlib.Path(temp)/'new.wav'
                    with wave.open(str(wav),'wb') as out:
                        out.setnchannels(1);out.setsampwidth(2);out.setframerate(RATE)
                        out.writeframes((samples*32767).astype('<i2').tobytes())
                    result=process(wav,dest,executable,maximum=3.5)
                    report[name]={**result,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'seed':seed,'instrument':instrument,'variant':variant+1}
                    report_path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
                meta={'c':category,'b':'DRAFTI original procedural effect (MIT)', 'source':source,'license':'MIT (repository LICENSE)',
                    'use':family.replace('_',' ')+' performance '+str(variant+1),'event':family,'family':'physical-'+family,
                    'mood':'playful' if category=='comedy' else 'tactile' if category=='ui' else 'ceremonial',
                    'durationSec':report[name]['seconds']}
                if name in catalog and catalog[name]!=meta: raise ValueError('Catalog conflict '+name)
                catalog[name]=meta
            print(f'{family}: four authored {instrument} performances',flush=True)
    catalog_path.write_text(json.dumps(catalog,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print(f'{len(FAMILIES)*4} additive effects; catalog {len(catalog)}')

if __name__=='__main__': main()
