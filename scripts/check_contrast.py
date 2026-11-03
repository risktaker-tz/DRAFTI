#!/usr/bin/env python3
"""Measure theme palette contrast without changing the game or its colours.

This is a conservative palette check, not a screenshot/rendering acceptance test.
The 3:1 target is for identifying non-text shapes. Shading, borders, textures,
flags, alternate piece sets and High visibility require separate rendered proof.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def luminance(colour):
    if len(colour) != 7 or colour[0] != '#':
        raise ValueError('Expected opaque six-digit theme colour: ' + colour)
    rgb = [int(colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in rgb]
    return sum(x * weight for x, weight in zip(linear, (.2126, .7152, .0722)))


def contrast(a, b):
    low, high = sorted((luminance(a), luminance(b)))
    return (high + .05) / (low + .05)


def themes():
    # Evaluate only the self-contained palette declarations, never app startup.
    code = r"""
const fs=require('fs'),vm=require('vm');
const text=fs.readFileSync(process.argv[1],'utf8');
const start=text.indexOf('  const THEME_BASE =');
const end=text.indexOf('  if (!THEMES.some',start);
if(start<0||end<0)throw Error('Theme declaration boundaries missing');
const c={};vm.createContext(c);
vm.runInContext(text.slice(start,end)+';this.result=THEMES;',c,{timeout:1000});
process.stdout.write(JSON.stringify(c.result));
"""
    result = subprocess.run(['node', '-e', code, str(ROOT / 'src/ui.js')],
                            capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def audit(palettes, target=3):
    rows = []
    for theme in palettes:
        v = theme['v']
        pairs = [('square centres', '--sq-light', '--sq-dark')]
        # All combinations of gradient endpoints, not just the nicest centres.
        pairs += [('square gradients ' + a + '/' + b, '--sq-light' + a, '--sq-dark' + b)
                  for a in ('-hi', '', '-lo') for b in ('-hi', '', '-lo')]
        for side in ('l', 'd'):
            for surface in ('1', '2', 'edge'):
                for square in ('-hi', '', '-lo'):
                    pairs.append((side + ' piece ' + surface + '/square' + square,
                                  '--pl-' + side + '-' + surface, '--sq-dark' + square))
        measurements = [{'check': label, 'foreground': v[a], 'background': v[b],
                         'ratio': round(contrast(v[a], v[b]), 4),
                         'pass': contrast(v[a], v[b]) >= target}
                        for label, a, b in pairs]
        rows.append({'id': theme['id'], 'name': theme['name'], 'measurements': measurements,
                     'failures': sum(not x['pass'] for x in measurements)})
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, default=ROOT / 'docs/board-contrast-audit.json')
    args = parser.parse_args()
    rows = audit(themes())
    if len(rows) != 21 or len({r['id'] for r in rows}) != 21:
        raise ValueError('Expected all 21 distinct themes; refusing partial acceptance')
    report = {'schema': 1, 'sourceSha256': hashlib.sha256((ROOT / 'src/ui.js').read_bytes()).hexdigest(),
              'target': 3, 'method': 'WCAG sRGB relative luminance, gamma 2.4; opaque palette samples',
              'scope': 'Follow-table colours only. Conservative samples; not rendered whole-disc visibility. '
                       'Flags, eight piece-set overrides, High visibility, crowns, coordinates, '
                       'gradients blended with overlays and animation states are not proven by this report.',
              'themes': rows, 'failures': sum(r['failures'] for r in rows)}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    for row in rows:
        print(f"{row['name']}: {row['failures']}/{len(row['measurements'])} samples below 3:1")
    print(f"{len(rows)} themes; {report['failures']} samples below target. Report: {args.report}")
    return 1 if report['failures'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
