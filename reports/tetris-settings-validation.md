> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Tetris settings implementation — 11 September 2026

Implemented all 12 native Tetris controls with actual settings.cpp defaults and web_pages.h ranges. Controls appear below Display settings when Tetris is selected. Preferences use the existing localStorage record; missing/invalid Tetris values normalize to native defaults. Reset restores Tetris alone. Common stored colors, booleans and brightness now also receive validation.

Behavior includes LCD/solid digit blocks, slabs with old-digit fragments, falling dots, randomized release order, independent fall/dot speed, optional bounce, block-game enable, normal/smooth placement, date visibility/position and both small-clock corners. Small clock uses the native 13-row well at y=12 and a live GFX corner clock. Normal well remains 5 rows at y=44. Smooth play uses native depth/bumpiness scoring, existing-hole allowance, relaxed fallback and 8% slip chance with random pieces.

Correction to the audit: native Tetris intentionally hides the date whenever block game or small-clock mode is active. The original browser lacked any means to disable that game and show a date, but absence of the date in the default game mode itself was correct. The UI now explains the override. Native normal-play placement scoring was already present; this change adds the distinct smooth-play strategy.

Changing geometry resets the well. Changing digit rebuild configuration settles queued target digits and clears the incompatible transition; this is an intentional browser editing behavior that avoids mixing coordinate systems mid-transition. Color/block appearance changes preserve game progress. Disabling bounce clears existing offsets. Small-clock mode skips digit rebuilding and follows live time.

## Validation

- 55 automated tests pass; TypeScript passes; production export build passes.
- Local preview returns HTTP 200 at http://127.0.0.1:3000/; retained existing server.
- Compiled the unchanged native Tetris gameplay/rebuild functions with a deterministic host shim.
- Gameplay: 36,000 ticks across 12 scenarios (5/13 rows, normal/smooth, speeds 5/12/30). Phases, piece/rotation/target, cosmetic rotation and occupied rows match exactly. Maximum position difference from printed C++ output: 4.990234714341568e-8. Float32 integration prevents one-tick landing drift.
- Digit rebuilding: 43,200 ticks across 24 scenarios (slabs/dots, speeds 5/12/30, bottom-up/random, top/bottom date). Active-digit completion ticks, slab progression and dot release order match; positions within 0.005 pixels.
- Added regression coverage for settings normalization, date override/layout, resizing, small live clock, sequential slab completion, fragment expiry, bounce off, randomized dots and appearance changes.

Run native comparisons:

```sh
python3 tests/reference/tetris.py ../AnimatedPixelClock /private/tmp/tetris-reference
PATH=/opt/homebrew/bin:$PATH node tests/reference/tetris.mjs /private/tmp/tetris-reference
```

These comparisons cover state, not full rendered pixel parity. Native reference bounce and display calls are stubbed. Shared selectable date formats, colon rate/mode, sprite colors and configurable shared bounce remain later common-settings work. This implementation uses default DD/MM/YYYY, current global colon toggle, existing palettes and default bounce. No claim of complete all-settings scene parity, physical-device testing or browser interaction QA is made. Other clock ports remain as recorded in the audit. No deployment or firmware changes.
