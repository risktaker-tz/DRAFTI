# Board and piece effects

The owner's twenty-effect request is covered by this current effect inventory. These are implemented behaviours in src/ui.js and src/styles.css, combining preserved effects with the cinematic additions. This is an implementation inventory, not a claim that all effects have passed visual or listening review.

| Effect | Moment and purpose |
| --- | --- |
| 1. Expiring last-move shimmer | Recent squares fade instead of leaving a permanent trail. |
| 2. Directional light ribbon | Each actual hop follows the piece's real path, including a flipped board. |
| 3. Capture-route arrow | Multi-capture segments trace the real landings beneath the discs. |
| 4. Route-corner sparkle | A multi-capture change of direction gets a brief point of light. |
| 5. Landing ring | Eligible quiet moves settle onto the board with a soft expanding ring. |
| 6. Captured-disc pop | The victim reacts at the actual capture rather than disappearing flatly. |
| 7. Capture particles | Short bursts punctuate captured pieces. |
| 8. Capture-tray flight | A small disc carries the capture toward the correct side's tray. |
| 9. Multi-capture blast | The shockwave grows with the real capture count. |
| 10. Impact shake | Heavy captures receive stronger bounded board movement. |
| 11. Board flare | The heaviest impacts briefly light the board frame. |
| 12. Crowning shockwave | A newly promoted piece sends out a ring. |
| 13. Crown drop-in | The crown arrives on the newly crowned disc. |
| 14. Coronation glow | The promoted side's pieces share a short celebration. |
| 15. Material-coloured hint wink | The actual hinted piece displays a smiling wink using its material colours. |
| 16. Hint rock | When shake is enabled, the hinted piece rocks in place with the wink. |
| 17. Thinking breath | The side actually thinking receives a calm breathing motion. |
| 18. Doom embers | A verified threatened side receives the ember treatment. |
| 19. Victory parade | Winning discs bounce with staggered timing after an actual win. |
| 20. Victory sparks | A bounded celebratory burst accompanies the result. |

Movement and capture effects retain their existing hop, landing and impact audio. Crowning and results retain their event cues, the wink has its own synthesized cue, and thinking/doom keep the existing director and category controls. No new idle ticking loop is introduced by this inventory. Optional crowd tray glows and material-lead tray highlights add further situational accents.

Reduced-motion guards, cleanup, sound priorities and actor correctness remain required. The complete 1,008-case mobile opening geometry report does not prove event-animation quality. Current capture, crown, victory and doom frames, flipped-board motion and runtime reduced-motion checks still need their own evidence.
