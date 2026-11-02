#!/usr/bin/env python3
"""Download the picked sound effects from archive.org (CC0/PD/CC-BY items)."""
import os
import time
import urllib.parse
import urllib.request

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0'}
OUTDIR = '/home/z/my-project/scripts/sfx_raw'

# (item id, file name on archive.org, our output basename)
PICKS = [
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '73 Slide Whistle.mp3', 'wb_slidewhistle'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '74 Zip.mp3', 'wb_zip'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '24 Woops!.mp3', 'wb_woops'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '23 Klonk.mp3', 'wb_klonk'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '29 Funny Fall.mp3', 'wb_fall'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '75 Ha-Ha!.mp3', 'wb_haha'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '38 Wild Uproar.mp3', 'wb_uproar'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '65 Shloop!.mp3', 'wb_shloop'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '58 Funny Cork Pop.mp3', 'wb_cork'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '41 Ooh, That Smarts!.mp3', 'wb_smarts'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '03 Banana Peel.mp3', 'wb_banana'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '96 Gulp!.mp3', 'wb_gulp'),
    ('crash-bang-boom-the-best-of-warner-bros.-sound-fx', '39 Wild Roar.mp3', 'wb_wildroar'),
    ('HannaBarberaCartoonSoundFX', '07 Tromboing.mp3', 'hb_tromboing'),
    ('HannaBarberaCartoonSoundFX', '11 Scrambling Feet.mp3', 'hb_scramble'),
    ('HannaBarberaCartoonSoundFX', "05 Fred's Hard Head Hit.mp3", 'hb_klonkhead'),
    ('Red_Library_Animals_Misc', 'R19-13-Bear Roaring.mp3', 'rl_bear'),
    ('Red_Library_Animals_Misc', 'R01-34-Elephant trumpet.mp3', 'rl_elephant'),
    ('Red_Library_Bells_Horns_Whistles', 'R15-38-Wolf Whistles.mp3', 'rl_wolfwhistle'),
    ('Red_Library_Bells_Horns_Whistles', 'R18-31-Old Car Ahooga Horn.mp3', 'rl_ahooga'),
    ('Red_Library_Bells_Horns_Whistles', 'R21-51-Slide Whistle.mp3', 'rl_slidewhistle'),
    ('WilhelmScreamSample', 'WilhelmScream.mp3', 'wilhelm'),
    ('rimshot', 'rimshot.mp3', 'rimshot'),
]


def main() -> None:
    os.makedirs(OUTDIR, exist_ok=True)
    ok = 0
    for ident, fname, out in PICKS:
        dest = os.path.join(OUTDIR, out + '.mp3')
        if os.path.exists(dest) and os.path.getsize(dest) > 10000:
            print(f'skip {out} (exists)')
            ok += 1
            continue
        url = 'https://archive.org/download/' + ident + '/' + urllib.parse.quote(fname)
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read()
            open(dest, 'wb').write(data)
            print(f'ok  {out:18} {len(data)//1024:>5} KB  <- {fname}')
            ok += 1
        except Exception as e:  # noqa: BLE001
            print(f'ERR {out}: {e}')
        time.sleep(1.5)
    print(f'{ok}/{len(PICKS)} downloaded')


if __name__ == '__main__':
    main()
