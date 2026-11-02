#!/usr/bin/env python3
"""Embed the processed sounds as base64 data URIs -> src/audio.manifest.js.

window.DRAFTI_SFX = { name: {c: category, b: short credit, d: dataURI} }
Credits are kept short inline; full license details live in ATTRIBUTIONS.md.
Categories: majestic | comedy | voice | judge | think | drama | ui. The classic
wooden sounds are synthesized in-code (FX.play), not stored here.
"""
import base64
import pathlib

AUDIO = pathlib.Path('/home/z/my-project/download/DRAFTI/src/audio')
OUT = pathlib.Path('/home/z/my-project/download/DRAFTI/src/audio.manifest.js')

FS = lambda sid, user: f"sound {sid} by {user}, freesound.org (CC0)"
WB = "The Best of Warner Bros. Sound FX (CC0)"
RL = "Red Library (CC0)"
HB = "Hanna-Barbera Sound FX (CC BY 3.0)"
TT = "DRAFTI voice line (TTS)"
SY = "DRAFTI synthesized UI/game sound (original, no source)"

ANIMALS = ('lion', 'lion_long', 'eagle', 'elephant', 'bear', 'wildroar')
COMEDY = ('trombone', 'wilhelm', 'whistle', 'ahooga', 'haha', 'banana',
          'woops', 'klonk', 'rimshot', 'wolfwhistle', 'shloop', 'zip',
          'gulp', 'smarts', 'fall', 'scramble')
VOICE = ('v_magnificent', 'v_chess', 'v_legendary', 'v_onejob', 'v_ohno',
         'v_wow', 'v_king', 'v_win', 'v_lose', 'v_draw', 'v_awkward',
         'v_undo', 'v_hint', 'v_new', 'v_win2', 'v_win3', 'v_lose2', 'v_lose3',
         # batch 4: opponent personas + ladder celebrations
         's_in_classic', 's_in_american', 's_in_english', 's_in_italian',
         's_in_spanish', 's_in_czech', 's_in_french', 's_in_russian',
         's_in_kenyan', 's_in_tanzanian', 's_in_brazilian', 's_in_mongolian',
         's_classic_1', 's_classic_2', 's_american_1', 's_american_2',
         's_english_1', 's_english_2', 's_italian_1', 's_italian_2',
         's_spanish_1', 's_spanish_2', 's_czech_1', 's_czech_2',
         's_french_1', 's_french_2', 's_russian_1', 's_russian_2',
         's_kenyan_1', 's_kenyan_2', 's_tanzanian_1', 's_tanzanian_2',
         's_brazilian_1', 's_brazilian_2', 's_mongolian_1', 's_mongolian_2',
         'v_levelup1', 'v_levelup2', 'v_streak1', 'v_streak2',
         'v_beatgm1', 'v_beatgm2')
JUDGE = ('v_nice', 'v_sharp', 'v_clean', 'v_why', 'v_sure', 'v_curious',
         'v_hmm', 'v_cost', 'v_trick', 'v_trap', 'v_crafty', 'v_only',
         'v_bigbrain', 'v_worth', 'v_paidoff', 'v_slowsteady', 'v_genius',
         'v_masterpiece', 'v_thought30', 'v_alltime', 'v_nosense',
         'v_rampage', 'v_rampage2',
         # batch 4: verdict extras + crowd
         'v_inacc1', 'v_inacc2', 'v_hold1', 'v_hold2', 'v_come1', 'v_come2',
         'v_ooh1', 'v_gasp1')
DRAMA = ('v_taw1', 'v_taw2', 'v_taw3', 'v_tbf1', 'v_tbf2', 'v_tbf3',
         'v_tad1', 'v_tad2', 'v_tad3', 'v_tbd1', 'v_tbd2', 'v_tbd3',
         'v_aim1', 'v_aim2')
THINK = ('t1a', 't1b', 't1c', 't1d', 't2a', 't2b', 't2c', 't2d',
         't3a', 't3b', 't3c', 't4a', 't4b', 't4c', 't5a', 't5b', 'v_time',
         't1e', 't2e', 't3d', 't4d', 't5c')
UI = ('ui_open', 'ui_close', 'ui_back', 'ui_click', 'ui_toggle_on',
      'ui_toggle_off', 'ui_save', 'ui_theme', 'ui_error', 'ui_slide',
      'clock_tick', 'clock_tock', 'alarm', 'whistle_ref', 'notify_pop',
      'heartbeat', 'pickup', 'putdown', 'crown_fanfare', 'win_fanfare',
      'lose_womp', 'draw_chime', 'gong', 'drumroll', 'sparkle', 'riser',
      'downer', 'laser', 'coin', 'powerup', 'achievement', 'streak_hit',
      'streak_big')
# batch 5: heavy hits, wrong-piece blame, feasts, counts, spectator arena
VOICE += ('v_heavy1', 'v_heavy2', 'v_heavy3', 'v_heavy4',
          'v_wrong1', 'v_wrong2', 'v_wrong3', 'v_wrong4',
          'v_feast1', 'v_feast2', 'v_slau1', 'v_slau2',
          'v_double', 'v_triple', 'v_quad', 'v_nextup',
          'v_spec1', 'v_spec2', 'v_spec3', 'v_spec4', 'v_spec5', 'v_spec6',
          'v_spec7', 'v_spec8', 'v_spec9', 'v_spec10')
# batch 5: authentic sourced meme effects (see ATTRIBUTIONS.md)
PARTY = ('badboy', 'badboy2', 'tellyou', 'oof', 'ahhscary', 'animewow',
         'later_moments', 'later_hours', 'omg', 'god')
# batch 6: sourced animal comedy + viral stings (dundundun lives in drama)
PARTY += ('chicken', 'panic', 'duck', 'meow', 'purr',
          'vineboom', 'bruh', 'sadviolin', 'cricket')
# batch 6: table talk, bait taunts, plan-ruined/lucky, doom loop, escape, hype
VOICE += ('v_tt1', 'v_tt2', 'v_tt3', 'v_tt4', 'v_tt5', 'v_tt6', 'v_tt7',
          'v_tt8', 'v_tt9', 'v_tt10',
          'v_bait1', 'v_bait2', 'v_bait3',
          'v_lucky1', 'v_lucky2', 'v_lucky3', 'v_lucky4', 'v_lucky5',
          'v_doom1', 'v_doom2', 'v_doom3', 'v_doom4', 'v_doom5',
          'v_esc1', 'v_esc2', 'v_king1', 'v_king2',
          'v_first', 'v_hurt', 'v_mercy')
DRAMA += ('dundundun',)
# batch 7: the think deck — narrator + heckle lines in two voices, so a
# thinking moment never repeats the same clip (drawn from a shuffled deck)
THINK += tuple(
    f'th_{kind}{i:02d}{suffix}'
    for kind in ('n', 'h')
    for i in range(1, 25 if kind == 'n' else 21)
    for suffix in ('', 'b')
)
THINK += ('th_m1', 'th_m2', 'th_m3', 'th_m4', 'th_m5', 'th_m6',
          'th_g1', 'th_g2', 'th_p1', 'th_p2', 'th_p3',
          'th_o1', 'th_o2', 'th_o3', 'th_o4',
          'th_t1', 'th_t2', 'th_t3', 'th_t4', 'th_t5', 'th_t6',
          'th_c1', 'th_f1', 'th_s1')
VOICE += ('v_retire1', 'v_retire2', 'roster_simba', 'roster_yanga', 'roster_twiga',
          'roster_tembo', 'roster_chui', 'roster_duma', 'roster_kifaru',
          'roster_nyati', 'roster_fisi', 'roster_sungura')
PARTY += ('shrimp1', 'shrimp2')
STADIUM = ('st_gasp1', 'st_gasp2', 'st_appl1', 'st_appl2', 'st_air1', 'st_drum1',
           'st_riser1', 'st_coin1', 'st_tada1', 'st_heart1', 'st_whis1',
           'st_ooh1', 'st_ooh2', 'st_crowd1')

CATEGORY = {
    **{k: 'majestic' for k in ANIMALS},
    **{k: 'comedy' for k in COMEDY},
    **{k: 'voice' for k in VOICE},
    **{k: 'judge' for k in JUDGE},
    **{k: 'drama' for k in DRAMA},
    **{k: 'think' for k in THINK},
    **{k: 'ui' for k in UI},
    **{k: 'party' for k in PARTY},
    **{k: 'drama' for k in STADIUM},
}

BB = '"You Are A Bad Boy" Naija comedy effect - Topinfo_ng (youtube.com/watch?v=PGLg01Lcw10)'
LT = '"Let Me Tell You Something" meme effect - YTSFX (youtube.com/watch?v=NkOeRRj-04k)'
MS = '"popular meme sound effects" compilation - Mondal Screen (youtube.com/shorts/N1BOQ_9laWs)'

CREDITS = {
    'lion': FS(567803, 'iut_Paris8'),
    'lion_long': FS(469123, 'Manim8'),
    'eagle': FS(392212, 'jjwallace'),
    'elephant': RL,
    'bear': RL,
    'wildroar': WB,
    'trombone': HB,
    'wilhelm': 'Wilhelm scream (public domain)',
    'whistle': WB,
    'ahooga': RL,
    'haha': WB,
    'banana': WB,
    'woops': WB,
    'klonk': WB,
    'rimshot': 'rimshot (public domain)',
    'wolfwhistle': RL,
    'shloop': WB,
    'zip': WB,
    'gulp': WB,
    'smarts': WB,
    'fall': WB,
    'scramble': HB,
}
CREDITS.update({k: TT for k in VOICE + JUDGE + DRAMA + THINK})
CREDITS.update({k: SY for k in UI})
# the batch-7 music-box / harp / woodblock / room-noise stings are synthesized,
# not spoken — credit them as originals, not TTS
for k in ('th_m1', 'th_m2', 'th_m3', 'th_m4', 'th_m5', 'th_m6',
          'th_g1', 'th_g2', 'th_p1', 'th_p2', 'th_p3',
          'th_o1', 'th_o2', 'th_o3', 'th_o4',
          'th_t1', 'th_t2', 'th_t3', 'th_t4', 'th_t5', 'th_t6',
          'th_c1', 'th_f1', 'th_s1'):
    CREDITS[k] = SY
CREDITS.update({'badboy': BB, 'badboy2': BB, 'tellyou': LT,
                'oof': MS, 'ahhscary': MS, 'animewow': MS,
                'later_moments': MS, 'later_hours': MS, 'omg': MS, 'god': MS})
# the stadium stings (crowd gasp, applause, airhorn, drumroll, riser…) are
# synthesized originals
CREDITS.update({k: SY for k in STADIUM})
RC = 'DRAFTI voiced recreation of a viral clip (originals: see ATTRIBUTIONS.md / sfx_swap)'
CREDITS.update({'shrimp1': RC, 'shrimp2': RC, 'v_retire1': RC, 'v_retire2': RC})
CREDITS.update({
    'chicken': FS(830091, 'MBPL'),
    'panic': FS(727396, 'Mastersoundboy2005'),
    'duck': FS(719115, 'OwennewO'),
    'meow': FS(110011, 'tuberatanka'),
    'purr': FS(575933, 'Buskieboy'),
    'vineboom': FS(802074, 'modusmogulus'),
    'bruh': FS(506582, 'ivar.nohre'),
    'dundundun': FS(411232, 'Sean-TE0'),
    'sadviolin': FS(516652, 'szegvari'),
    'cricket': FS(842645, 'Breviceps'),
})


def main() -> None:
    lines = [
        '/* DRAFTI sound bank — short open-license samples embedded as data URIs.',
        '   Category c: majestic | comedy | voice | judge | think | drama | ui.',
        '   Credits b: short form. Full license details: ATTRIBUTIONS.md. */',
        'window.DRAFTI_SFX = {',
    ]
    total = 0
    count = 0
    for f in sorted(AUDIO.glob('*.mp3')):
        name = f.stem
        if name not in CATEGORY:
            raise SystemExit(f'ERROR: {name}.mp3 has no category — fix build_sfx_manifest.py')
        data = f.read_bytes()
        total += len(data)
        count += 1
        uri = 'data:audio/mpeg;base64,' + base64.b64encode(data).decode()
        lines.append(
            f"  {name}: {{ c: '{CATEGORY[name]}', b: '{CREDITS[name]}', d: '{uri}' }},")
    lines.append('};')
    OUT.write_text('\n'.join(lines) + '\n')
    print(f'wrote {OUT} ({OUT.stat().st_size // 1024} KB, {total // 1024} KB of mp3, {count} sounds)')


if __name__ == '__main__':
    main()
