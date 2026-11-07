# Rendered board and piece review — 7 November 2026

## Coverage

Source commit `299c312e6741f676c56d7bde44164e4eaa7e7533`; working CSS SHA-256 and exact build ID are recorded in `contrast-raster-analysis-20261107.json`. The refreshed matrix contains 336 actual 8×8 opening-board captures: 21 tables × 8 piece surfaces × High visibility on/off. The full mobile opening matrix separately covers all three East Africa sizes. The current single-file build is 14,293,597 bytes and remains below the 14 MiB limit.

The refreshed contact sheets were reviewed at full view. All eight piece surfaces remain visually distinct across the table themes; the glass and steel treatments have softer face luminance on pale tables, with their rims, grooves, shadows and color still separating the two sides. High visibility adds square hatching and stronger outlines. A fine dark bevel and light outer keyline were added to each piece, preserving its face material and flag paint while making the perimeter more distinct. A focused Sakura/Bakelite browser capture is `contrast-keyline-sakura-bakelite-v2.png`. No board geometry or theme was changed for this review.

## Raster screen

The analyzer samples each of 24 opening pieces against an empty playable square, then also samples 32 angular positions around each visible disc edge. **274 of 336 cases have a 10th-percentile face-center luminance ratio below 3:1.** This conservative screen still does not quantify the added perimeter keyline or prove whole-piece contrast, so it is not recorded as a pass. The source-palette audit also remains open at 307/588 conservative samples below 3:1. The measured ratios and all cases are in `contrast-raster-analysis-20261107.json`; the normal and High visibility sheets are `contrast-raster-contact-normal-20261107.png` and `contrast-raster-contact-hv-20261107.png`.

This refresh completes a broad rendered survey of opening-board materials, but does not close the numerical 3:1 contrast gate, flags/crowns, reduced-motion, or animated-event-frame acceptance. Billboard and underboard text contrast is covered by the existing theme tests.

## Reproduction

`scripts/render_contrast_matrix.ps1 -Refresh` captures the actual board in an isolated Chromium session and moves the pointer to the header to avoid hover-only overlays. `node scripts/analyze_contrast_raster_matrix.js` checks all 336 captures and regenerates both contact sheets and the measurement report. The raw capture folder is kept locally for audit and is intentionally not included in the repository; the compact reports and sheets are the committed evidence.
