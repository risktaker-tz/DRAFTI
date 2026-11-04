# Current visual check

Source runtime 8fc14e44050fdeef28857c75baa70ffec3978213 was opened from the exact local built artifact in an isolated Browse headless Chromium session. Screenshot inspection covered Marble Lux, Walnut Royale, Neon Glass and Maple & Rosewood. The desktop viewport was 1280×720, and full-page captures include content below that viewport. A fixed background can end at the original viewport boundary in these full-page captures.

Mobile screenshots use 375×812. East Africa 8×8, 10×10 and 12×12 rendered 64, 100 and 144 cells respectively. Each board measured 325 pixels wide. Document width equalled the viewport width, 375 pixels. Captured-piece counts and hint/undo controls remained visible. Pieces were circular in the inspected layouts.

The 10×10 tooltip incorrectly called that choice the default. It was corrected after this inspection. Fresh default remains East Africa 8×8.

This evidence covers initial board layouts only. Capture/crown/victory/doom animation screenshots, all piece-set/theme combinations, reduced-motion runtime and installed-device checks remain open. The isolated browser initially required repair of its missing Playwright, Sharp and Bun dependencies. Tooling packages were installed outside the project.

Hint feedback was inspected on Maple & Rosewood at 375×812 with the East Africa 12×12 opening. For the still screenshot only, the actual hint animations were paused at 360 ms and the decoration's removal timer was temporarily extended. The normal timer was restored afterward. This is a frozen animation review frame, not an unmodified real-time playback capture.

The face measured about 14 pixels wide at its former width, which was too subtle on the small board. Its width was increased from 64% to 86% of the piece face and the engraved edge gained a second shadow. The hint and billboard regression tests pass.
