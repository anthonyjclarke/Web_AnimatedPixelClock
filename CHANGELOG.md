# Web project changelog

## [0.1.0] — 2026-09-15

Initial public web release: 14 clock styles, six audio visualizers, five built-in ambient scenes and custom PCA playback. Includes saved clock/ambient settings, configurable cycling, macOS/Windows launchers, a dependency-free production server and a cross-platform CI workflow. Original behavior and web-only extras are documented separately.

Known limits: browser-only screensaver; Windows browser acceptance and full animation pixel parity remain open; weather, night schedules, richer rotation, notifications, PC stats and shared preference work remain on the roadmap. Detailed development entries below describe the work included in this release.

## 15 September 2026 — Ambient and desktop support

- Added the original ambient scene set, custom PCA playback/persistence, manual and scheduled controls, and optional corner clock.
- Moved cycle controls into Display settings; interval now configurable and saved (5–3600 seconds).
- Added Windows launcher alongside macOS startup; removed stale Step 4 header text.
- Added an original-function gap audit and expanded macOS/Windows/NAS roadmap. Windows acceptance and full procedural ambient pixel parity remain open.
- Nine new tests; full suite 117 passing. Stop-window suppression is documented as a browser convenience.

This records browser work, separate from the ESP32 release changelog. Development is local; these entries do not indicate a firmware flash, hosted deployment or NAS release.

## 15 September 2026

- Added upstream Doom Fire (style 17), bringing the web collection to 14 styles. Includes six animation settings and three palette colors. 4,320 exact native heat-buffer comparisons and all 108 repository tests pass. See [validation](reports/doom-validation.md).

## 14 September 2026

- Added optional random Pac-Man ghost chases, explicitly labelled as a web-only extra and off by default. Added [extras register](WEB-EXTRAS.md).

- Completed Dino Runner, Matrix Rain, TRON, Bomberman and Pong source ports, finishing all 13 listed styles.
- Added their native controls: Dino 4, Matrix 4, TRON motorcycle variant and Pong 6. Bomberman has no mode-specific settings in the reference source.
- Added saved Matrix rain font size: Original 5 × 7 (default) or Small 3 × 5. Clock/decode digit size and rain simulation remain unchanged.
- Corrected audio freshness/render timestamps so newly delivered packets do not produce a one-frame full-clock fallback. Genuine timeout/stopped-audio fallback remains.
- Expanded native comparisons and regression coverage. Current suite: 101 tests pass; latest TypeScript and production build checks pass. Full visual acceptance remains open.
- Consolidated startup instructions, validation index, harness commands and current roadmap; marked earlier reports as historical snapshots.

## Earlier integration milestones

- Added shared framebuffer presentation, playback timing and cached wall time.
- Corrected Mario/Pac-Man behaviour and exposed their controls and Mario encounters.
- Added all Tetris modes/settings, native Standard/Large layouts, Snake, Space and Asteroids ports.
- Corrected the Space character selector's numeric closed-label display.
- Added local file/microphone/demo audio input and all six visualizers, including Oscilloscope and Starfield Overdrive.
- Added the local startup script and DS423 Docker delivery roadmap.

See [validation records](reports/README.md) for original dates, measurements and limitations, and [ROADMAP.md](ROADMAP.md) for outstanding work.
