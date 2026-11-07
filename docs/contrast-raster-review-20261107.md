# Rendered board and piece review — 7 November 2026

## Coverage

Source `b7adbd2bc26faec7a882ad6646cd72a73e27d50e`, build `e78ed80a363367c7edd3469f946940b4e56f4bf1760ba5849aef7a793c48179e` (HTML SHA-256 `9ad47e8ba836fee2f2617c9287a8f306819bfb783fa446aa9feb83e407cab62b`). The matrix contains 336 actual 8×8 opening-board captures: 21 tables × 8 piece surfaces × High visibility on/off. The full mobile opening matrix separately covers all three East Africa sizes.

The contact sheets were reviewed at full view. All piece surfaces remain visually distinct across the table themes; the glass and steel treatments have softer face luminance on pale tables, with their rims, grooves, shadows and color still separating the two sides. High visibility adds square hatching and stronger outlines. No board geometry or theme was changed for this review.

## Raster screen

The analyzer samples each of 24 opening pieces against an empty playable square, then also samples 32 angular positions around each visible disc edge. **274 of 336 cases have a 10th-percentile face-center luminance ratio below 3:1.** This is a conservative face-fill signal for reflective and tinted materials, not a silhouette pass/fail result: it does not quantify the full rim, groove, shadow or hue cues visible in the contact sheets. The measured ratios and all cases are in `contrast-raster-analysis-20261107.json`; the normal and High visibility sheets are `contrast-raster-contact-normal-20261107.png` and `contrast-raster-contact-hv-20261107.png`.

This closes the broad rendered visual survey, while a numeric 3:1 guarantee for every piece face remains open. Billboard and underboard text contrast is covered by the existing theme tests.

## Reproduction

`scripts/render_contrast_matrix.ps1 -Refresh` captures the actual board in an isolated Chromium session and moves the pointer to the header to avoid hover-only overlays. `node scripts/analyze_contrast_raster_matrix.js` checks all 336 captures and regenerates both contact sheets and the measurement report. The raw capture folder is kept locally for audit and is intentionally not included in the repository; the compact reports and sheets are the committed evidence.
