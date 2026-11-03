"""Verify actual recorded assets, reversible originals, and speech preservation."""
import hashlib
import json
from pathlib import Path
import sys
import subprocess
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from voice_proc import decode, ffmpeg_path, RATE

fixes = json.loads((ROOT / 'scripts/audio_processing_fixes.json').read_text())
assert fixes and len({fix['id'] for fix in fixes}) == len(fixes)
exe = ffmpeg_path()
for fix in fixes:
    backup = (ROOT / fix['backup']).resolve()
    assert backup.is_relative_to((ROOT / 'sfx_swap/backups').resolve())
    current = ROOT / 'src/audio' / (fix['id'] + '.mp3')
    baseline = subprocess.check_output(['git', 'show', 'b9486e1:src/audio/' + fix['id'] + '.mp3'], cwd=ROOT)
    assert backup.read_bytes() == baseline, 'Backup must be the original recording, not a reconstructed substitute'
    assert hashlib.sha256(backup.read_bytes()).hexdigest() == fix['sourceSha256']
    assert hashlib.sha256(current.read_bytes()).hexdigest() == fix['processedSha256']
    source, actual = decode(exe, backup), decode(exe, current)
    keep = np.ones(len(source), dtype=bool)
    end = 0
    for cut in fix['cuts']:
        first, last = cut['first'], cut['last']
        assert end <= cut['pauseStart'] < first < last < cut['pauseEnd'] < len(source)
        assert first - cut['pauseStart'] >= round(.14 * RATE)
        assert cut['pauseEnd'] - last >= round(.14 * RATE)
        assert np.max(np.abs(source[first:last])) <= .001
        keep[first:last] = False
        end = last
    expected = source[keep]
    # This independent mask must retain every audible sample in order, exactly.
    np.testing.assert_array_equal(source[np.abs(source) > .001], expected[np.abs(expected) > .001])
    assert len(actual) == len(expected)
    assert len(actual) / RATE <= 6
    assert current.stat().st_size <= 61440
    assert float(np.max(np.abs(actual))) <= 10 ** (-1.5 / 20)
    a, b = expected.astype(np.float64), actual.astype(np.float64)
    correlation = np.sum(a * b) / np.sqrt(np.sum(a * a) * np.sum(b * b))
    assert correlation > .995, (fix['id'], correlation)
    print(f"PASS {fix['id']}: original hash, all speech PCM, splice guards, size, peak, waveform")
print(f'{len(fixes)} actual recording corrections verified independently; no listening certification claimed')
