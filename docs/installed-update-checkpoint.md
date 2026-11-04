# Installed-app update checkpoint

Runtime source: b8c036998b28ddb65a0f7bd264c09f45694dbc13. The Python and Node builders emit the same 12,981,423-byte HTML, SHA-256 6eea043223943f9d49943c1a1c3bb68c24f6c493993d3884d6ded0ba4c5d5e31. Both builders also produce the same worker with a matching content-derived release ID. The release includes the preceding Club minimum, actual result names and existing cinematic/sound features.

Installed copies request worker updates without the browser's old HTTP cache on reopen/foreground return. A newly downloaded worker activates after its install assets finish caching. A running match keeps its current code. When a new match is created, its position is saved before a pending release reloads the page. No settings, progress or local player data is cleared.

Repeat navigation revalidates the browser HTTP cache, allowing unchanged releases to reuse their cached bytes instead of downloading the entire game again. Changed install assets are freshly cached when a new worker installs.

Previous installation-cache voice recordings are moved to a stable vocabulary cache before obsolete core caches are removed. Audience pack caches remain intact. Failed installs leave the working release available; network and server failures fall back to the cached game. Direct-file gameplay makes no service-worker requests.

All 53 automated checks pass, including engine, independent move generation, both hosting scopes, legacy cached-audio migration, update detection, no midgame reload, repeat-reload prevention, offline handling, player persistence and matching generated worker/HTML. Evidence: current-installed-update-tests.json. Real installed-device acceptance and the remaining master goal are still open; these are not claimed by the unit tests.

## Public release and native browser cycle

Release commit 593a83b82ceac3cd0b4729cb0cbd0175a57949c3 is READY at Vercel deployment dpl_ArKRRiAAtfmzmSBP5Fg5Ljuwf3s5. Both canonical and GitHub Pages HTML and worker bytes exactly match the local tested artifacts. Worker SHA-256 is 7779a674cb5a3ddb9b6eca0741b61857939b1e42d2eaa979734cc9f1058b3429. Receipts are installed-update-vercel-live.json and installed-update-pages-live.json.

A real isolated Chromium page remained at two played plies with the same document time origin while the new worker activated. The normal New game control and confirmation then loaded the new build; the new opening had zero plies and retained Marble Lux and East Africa 8×8. The old/new document and worker IDs, stable midgame position and changed restart time origin are in installed-update-browser-cycle.json. Reopening the actual manifest start URL also booted the latest game. This is real browser worker/document evidence, alongside the unit tests; it does not claim installation into a physical mobile or desktop OS shell.
