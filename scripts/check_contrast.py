#!/usr/bin/env python3
"""Check all table squares and the rendered two-tone piece silhouette.

Face paints remain in the report as diagnostics. Piece visibility is judged at
the actual dark/light outer keyline, which stays independent of material paint.
Rendered screenshots are still required for the end-to-end visual review.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
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


def css_colour(value):
    value = value.strip()
    if value.startswith('#'):
        return [int(value[i:i + 2], 16) for i in (1, 3, 5)], 1.0
    match = re.fullmatch(r'rgba?\(([^)]+)\)', value)
    if not match:
        raise ValueError('Unsupported keyline colour: ' + value)
    channels = [float(part.strip()) for part in match.group(1).split(',')]
    alpha = channels[3] if len(channels) == 4 else 1.0
    if len(channels) not in (3, 4) or any(c < 0 or c > 255 for c in channels[:3]) or not 0 <= alpha <= 1:
        raise ValueError('Invalid keyline colour: ' + value)
    return channels[:3], alpha


def composite(foreground, alpha, background):
    return [round(f * alpha + b * (1 - alpha)) for f, b in zip(foreground, background)]


def keyline_colours():
    css = (ROOT / 'src/styles.css').read_text(encoding='utf-8')
    thickness = re.search(r'--disc-keyline:\s*clamp\(\s*([\d.]+)px,\s*calc\(var\(--board-span\)', css)
    if not thickness or float(thickness.group(1)) < 1.5:
        raise ValueError('The outer keyline must stay visible at the smallest board size')
    block = re.search(r'\.piece\s+\.body::after\s*\{([^}]+)\}', css)
    if not block:
        raise ValueError('The dual-tone piece silhouette rule is missing')
    dark = re.search(r'border:\s*var\(--disc-keyline\)\s+solid\s+(rgba?\([^)]+\))', block.group(1))
    light = re.search(r'outline:\s*var\(--disc-depth\)\s+solid\s+(rgba?\([^)]+\))', block.group(1))
    if not dark or not light:
        raise ValueError('Both dark and light outer keylines are required')
    return [('dark keyline', *css_colour(dark.group(1))), ('light keyline', *css_colour(light.group(1)))]


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


def audit(palettes, rims, target=3):
    rows = []
    for theme in palettes:
        v = theme['v']
        pairs = [('square centres', '--sq-light', '--sq-dark')]
        # All combinations of gradient endpoints, not just the nicest centres.
        pairs += [('square gradients ' + a + '/' + b, '--sq-light' + a, '--sq-dark' + b)
                  for a in ('-hi', '', '-lo') for b in ('-hi', '', '-lo')]
        square_measurements = [{'check': label, 'foreground': v[a], 'background': v[b],
                               'ratio': round(contrast(v[a], v[b]), 4),
                               'pass': contrast(v[a], v[b]) >= target}
                              for label, a, b in pairs]
        # The piece perimeter is a two-tone silhouette. Alpha-composite each
        # actual CSS keyline over every square-gradient endpoint before scoring.
        rim_measurements = []
        for square in ('--sq-light-hi', '--sq-light', '--sq-light-lo',
                       '--sq-dark-hi', '--sq-dark', '--sq-dark-lo'):
            background, _ = css_colour(v[square])
            candidates = []
            for rim_name, rgba, alpha in rims:
                visible = composite(rgba, alpha, background)
                value = contrast('#%02x%02x%02x' % tuple(visible), v[square])
                candidates.append({'edge': rim_name, 'ratio': round(value, 4)})
            best = max(candidates, key=lambda candidate: candidate['ratio'])
            rim_measurements.append({'check': 'visible silhouette/' + square,
                'foreground': best['edge'] + ' CSS keyline', 'background': v[square],
                'ratio': best['ratio'], 'candidates': candidates, 'pass': best['ratio'] >= target})
        # Keep historical face-paint measurements as diagnostics; the rim is
        # the measurable graphic boundary after bevels, glints and material paint.
        face_measurements = []
        for side in ('l', 'd'):
            for surface in ('1', '2', 'edge'):
                for square in ('-hi', '', '-lo'):
                    a, b = '--pl-' + side + '-' + surface, '--sq-dark' + square
                    value = contrast(v[a], v[b])
                    face_measurements.append({'check': side + ' face ' + surface + '/square' + square,
                        'foreground': v[a], 'background': v[b], 'ratio': round(value, 4),
                        'pass': value >= target})
        accepted = square_measurements + rim_measurements
        rows.append({'id': theme['id'], 'name': theme['name'],
            'squareAndSilhouette': accepted, 'squareAndSilhouetteFailures': sum(not x['pass'] for x in accepted),
            'facePaintDiagnostics': face_measurements,
            'facePaintBelow3': sum(not x['pass'] for x in face_measurements)})
    return rows


def main():
    target = 3.0
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, default=ROOT / 'docs/board-contrast-audit.json')
    parser.add_argument('--rendered-report', type=Path,
                        default=ROOT / 'docs/contrast-raster-evidence-20261108/contrast-raster-analysis-exact-20261108.json')
    args = parser.parse_args()
    args.report = args.report.resolve()
    args.rendered_report = args.rendered_report.resolve()
    rims = keyline_colours()
    rows = audit(themes(), rims)
    if len(rows) != 21 or len({r['id'] for r in rows}) != 21:
        raise ValueError('Expected all 21 distinct themes; refusing partial acceptance')
    rendered = json.loads(args.rendered_report.read_text(encoding='utf-8'))
    html = (ROOT / 'web/index.html').read_bytes()
    build = re.search(rb'name="drafti-build" content="([a-f0-9]{64})"', html)
    if (not build or rendered.get('buildId') != build.group(1).decode('ascii') or
            rendered.get('sourceHtmlSha256') != hashlib.sha256(html).hexdigest() or
            rendered.get('sourceStylesSha256') != hashlib.sha256((ROOT / 'src/styles.css').read_bytes()).hexdigest()):
        raise ValueError('Rendered contrast evidence does not match the current source/build; rerender all themes')
    expected_cases = {(theme['id'], material, hv)
                      for theme in themes() for material in
                      ('theme', 'tourney', 'woodturn', 'ivoryjet', 'bakelite', 'steel', 'glass', 'stone')
                      for hv in (False, True)}
    cases = rendered.get('cases', [])
    actual_cases = {(case.get('theme'), case.get('material'), case.get('hv')) for case in cases}
    measured_failures = [case for case in cases
                         if case.get('squareP10Ratio', 0) < target or case.get('edgeP10Ratio', 0) < target]
    if (rendered.get('captures') != 336 or rendered.get('caseCount') != 336 or
            rendered.get('themeCount') != 21 or not rendered.get('fullThemeCoverage') or
            actual_cases != expected_cases or rendered.get('squareFailCases') or rendered.get('rimFailCases') or
            measured_failures):
        raise ValueError('The complete 336-case raster matrix must have zero square and piece-rim failures')
    report = {'schema': 3, 'sourceUiSha256': hashlib.sha256((ROOT / 'src/ui.js').read_bytes()).hexdigest(),
              'sourceCssSha256': hashlib.sha256((ROOT / 'src/styles.css').read_bytes()).hexdigest(),
              'target': 3, 'method': 'WCAG sRGB relative luminance, gamma 2.4; keyline alpha composited over each square endpoint',
              'scope': 'All 21 themes: light-versus-dark square centres and all gradient endpoint pairs, plus the actual dark/light CSS silhouette over every light/dark endpoint. Face-paint contrasts are retained as diagnostics and do not decide whether the piece boundary is visible.',
              'keylines': [{'name': name, 'rgba': rgba, 'alpha': alpha} for name, rgba, alpha in rims],
              'themes': rows,
              'acceptanceFailures': sum(r['squareAndSilhouetteFailures'] for r in rows),
              'facePaintBelow3Diagnostics': sum(r['facePaintBelow3'] for r in rows),
              'renderedEvidence': {'path': str(args.rendered_report.relative_to(ROOT)), 'buildId': rendered['buildId'],
                  'htmlSha256': rendered['sourceHtmlSha256'], 'cssSha256': rendered['sourceStylesSha256'],
                  'captures': rendered['captures'], 'themes': rendered['themeCount'],
                  'squareFailCases': rendered['squareFailCases'], 'rimFailCases': rendered['rimFailCases'],
                  'worstSquareP10': min(row['squareP10Ratio'] for row in cases),
                  'worstPieceRimP10': min(row['edgeP10Ratio'] for row in cases)}}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    for row in rows:
        print(f"{row['name']}: {row['squareAndSilhouetteFailures']}/{len(row['squareAndSilhouette'])} square/silhouette failures; "
              f"{row['facePaintBelow3']}/{len(row['facePaintDiagnostics'])} face diagnostics below 3:1")
    print(f"{len(rows)} themes; {report['acceptanceFailures']} square/silhouette failures, "
          f"{report['facePaintBelow3Diagnostics']} face diagnostics below 3:1. Report: {args.report}")
    return 1 if report['acceptanceFailures'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
