> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Matrix Rain validation

14 September 2026. Reference: updated `AnimatedPixelClock/src/clocks/clock_matrix.cpp`.

Replaced decorative green pixels with the original 21 × 8 GFX glyph grid, staggered column starts, variable speed/trail length, RGB565 fade levels, bright heads, random visible-trail mutation and density-based respawn. Changed digits decode simultaneously for 1.2 seconds, swapping glyphs every 0.08 seconds; columns crossing decoding digits run at twice their stored speed. Solid digit/date/meridiem plates and transparent mode follow source layout.

Four saved controls match firmware: speed 5–30 (default 12), density Sparse/Normal/Dense (Normal), date (off), transparent digits (off). Density uses explicit Select labels. Speed affects newly spawned columns and density controls future respawn delays, as in firmware. Shared date-format selection is available.

## Verification

- 18,000 native comparison ticks across nine combinations: speed 5/12/30 and density 0/1/2, including four-digit rollover and continued rain.
- Compared displayed time, every decode flag/timer/glyph, column active/head/speed/trail/respawn state and all 168 rain glyphs. Discrete state and glyphs agree exactly. Maximum numerical error 0.000043 with tolerance 0.002.
- Five Matrix regressions cover setting normalization, RGB565 defaults, simultaneous decoding, accelerated columns, preserved running speed on edits, masking/date/transparency, pause and replay. All 88 repository tests pass.
- TypeScript check and production build pass; local preview returns HTTP 200.

Reproduce from project root:

```sh
python3 tests/reference/matrix.py ../AnimatedPixelClock /private/tmp/matrix-reference
node tests/reference/matrix.mjs
node --test tests/matrix.test.mjs
```

Results: `matrix-reference-results.json`. The harness compiles original native update helpers with deterministic time/random and digit globals. Full framebuffer parity and visual browser acceptance have not been established. The browser uses the shared 16 ms simulation clock; comparisons do not cover variable native update intervals. Default rain/head colors are ported; live custom sprite colors and expanded colon modes remain shared-configuration work. AM/PM uses live wall time during anticipatory transitions; hardware Wi-Fi chrome is omitted.

Three animation ports remain: TRON, Bomberman and Pong. Docker/NAS delivery remains a later roadmap stage.

## Rain font size option

Added a browser-only Rain font size preference: Small (3 × 5) or Original (5 × 7, default). Compact glyphs stay centered in the existing rain cells, preserving column motion, density, timing and clock/decode digit sizes. Switching sizes applies immediately without restarting rain or decoding. Invalid or older saved preferences fall back to Original. Matrix regression tests, TypeScript and all 18,000 native state comparisons still pass.
