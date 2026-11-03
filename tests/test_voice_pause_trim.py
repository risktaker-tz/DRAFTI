"""Protect speech samples, quiet words, padding, and splice guards."""
import sys
from pathlib import Path
import unittest
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from voice_pause_trim import pause_plan, apply_plan


class PauseTrimTests(unittest.TestCase):
    def test_only_internal_silence_removed_and_speech_is_identical(self):
        # Three different words, including soft speech well below normal volume.
        a, b, c = np.full(120, .2), np.full(110, .004), np.full(130, -.1)
        samples = np.r_[np.zeros(200), a, np.zeros(700), b, np.zeros(600), c, np.zeros(300)]
        cuts = pause_plan(samples, rate=1000)
        self.assertEqual(len(cuts), 2)
        self.assertEqual([x['last']-x['first'] for x in cuts], [420, 320])
        result = apply_plan(samples, cuts)
        np.testing.assert_array_equal(result, np.r_[np.zeros(200), a, np.zeros(280), b,
                                                   np.zeros(280), c, np.zeros(300)])
        np.testing.assert_array_equal(result[np.abs(result) > .001], samples[np.abs(samples) > .001])

    def test_no_cut_through_soft_speech_or_short_natural_pauses(self):
        for gap in (np.zeros(390), np.full(900, .002)):
            self.assertEqual(pause_plan(np.r_[.1, gap, .1], rate=1000), [])

    def test_reject_tampered_cuts_and_invalid_input(self):
        with self.assertRaises(ValueError):
            apply_plan(np.ones(100), [{'first': 20, 'last': 40}])
        for samples in (np.array([]), np.array([float('nan')])):
            with self.assertRaises(ValueError):
                pause_plan(samples)


if __name__ == '__main__':
    unittest.main()
