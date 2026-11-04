# Current visual check

Source runtime 8fc14e44050fdeef28857c75baa70ffec3978213 was opened from the exact local built artifact in an isolated Browse headless Chromium session. Screenshot inspection covered Marble Lux, Walnut Royale, Neon Glass and Maple & Rosewood. The desktop viewport was 1280×720, and full-page captures include content below that viewport. A fixed background can end at the original viewport boundary in these full-page captures.

Mobile screenshots use 375×812. East Africa 8×8, 10×10 and 12×12 rendered 64, 100 and 144 cells respectively. Each board measured 325 pixels wide. Document width equalled the viewport width, 375 pixels. Captured-piece counts and hint/undo controls remained visible. Pieces were circular in the inspected layouts.

The 10×10 tooltip incorrectly called that choice the default. It was corrected after this inspection. Fresh default remains East Africa 8×8.

This evidence covers initial board layouts only. Capture/crown/victory/doom animation screenshots, all piece-set/theme combinations, reduced-motion runtime and installed-device checks remain open. The isolated browser initially required repair of its missing Playwright, Sharp and Bun dependencies. Tooling packages were installed outside the project.
