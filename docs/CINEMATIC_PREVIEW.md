# Cinematic effects review preview

This branch is a review preview of thirty optional additions/refinements. It is not approved for production. The existing game, sounds, materials, flags and engine stay in place.

Open Preview studio to try individual effects, select Subtle/Balanced/Livestream, play the showcase, or compare the original presentation. Staged visual previews do not change the game result or legal position. Actual gameplay uses the event conditions below. Reduced motion suppresses the new animation; the original sound mixer remains authoritative.

| Group | Effect | Gameplay trigger |
| --- | --- | --- |
| Board | Directional edge lights | Actual move direction |
| Board | Landing ripples | Actual landing |
| Board | Capture fracture shimmer | Capture |
| Board | Multi-capture energy paths | Two or more captures |
| Board | Advantage sweeps | Material lead changes sides |
| Board | Promotion runway lights | An engine-legal promotion move |
| Board | Last-stand square pulses | Verified doom assessment |
| Board | Clutch-move focus | Multi-capture |
| Board | Victory perimeter lights | Actual win |
| Board | Balanced draw waves | Actual draw |
| Pieces | Soft impact compression | Landing, with shake enabled |
| Pieces | Directional movement lean | Move starts, with shake enabled |
| Pieces | Material-aware glints | Move completes |
| Pieces | Multi-capture charge halos | Two or more captures |
| Pieces | Crowning spark orbits | Actual promotion |
| Pieces | Winner salutes | Actual winning side |
| Pieces | Threat reactions | Legal capture threat |
| Pieces | Hint-wink sparkles | Actual hint |
| Pieces | Survivor relief reactions | A threatened piece survives and the threat clears |
| Pieces | Fading movement echoes | Move starts |
| Background | Active-side spotlights | Current side and major pressure moments |
| Background | Team-coloured crowd washes | Capturing side |
| Background | Pointer-responsive lighting | Pointer movement or touch |
| Background | Theme-matched atmosphere | Ambient atmosphere toggle |
| Background | Tournament mood lighting | Actual national tournament stage |
| Background | Comeback horizon glow | Actual material comeback |
| Background | Crowning aurora | Actual promotion |
| Background | Celebration sparkles | Actual win |
| Background | Calm draw transitions | Actual draw |
| Background | Intermission ambience | Actual between-bout countdown |

New preferences use only drafti.cinema.preview.v1. This preview uses bounded transient nodes, effect cooldowns, cleanup on new games, and passive pointer listeners. It adds no downloaded audio, external libraries, backend or AI-strength changes.
