# Doom Fire — 15 September 2026

Doom Fire is an original upstream clock style (ID 17), not a web-only extra. It was missing from the older local firmware snapshot used for earlier ports. Source and defaults were fetched from GitHub; the source snapshot matches commit `946ed42661775550d873760283bd9837009ef1e6`.

[Upstream source](https://github.com/Keralots/AnimatedPixelClock/blob/946ed42661775550d873760283bd9837009ef1e6/src/clocks/clock_doom.cpp). The MIT source is retained in `tests/reference/upstream/clock_doom.cpp` for reproducible tests.

Implemented the 128 × 64 heat buffer, xorshift RNG, independent digit/ground cooling, wind jitter, optional temporal/horizontal smoothing, cold glyph-side halos, native glyph heat stamps, 64-level RGB565 palette, digit burnout/re-ignite flare and outlined date/meridiem text. Changed digits transition from second 56. Shared pause/replay/timezone support is integrated.

Saved settings: digit flame height 8–40 (20), ground height 5–40 (13; derived from digit height when absent), wind left/neutral/right (left), date off, burning digits on, smooth fire off. Ember/flame/core color editors use original defaults 0x1820/0xCB61/0xFFFF. These represent upstream color capabilities, not invented effects.

Verification: exact agreement for 35,389,440 heat cells across 4,320 frames, 36 scenarios covering all winds, smoothing/burning on/off, three digit heights, two ground heights and date layouts. Native spread/stamp functions run unchanged with host stubs. Regression checks cover settings, burn/re-ignite timing, stable pause, live palette edits and replay. All 108 repository tests, TypeScript and production build pass.

```sh
python3 tests/reference/doom.py
node tests/reference/doom.mjs
node --test tests/doom.test.mjs
```

Limits: exact comparison covers the simulation buffer, not full rendered palette/text frames or native transition timers. The browser advances in shared 16 ms simulation steps, while native spread runs per rendered frame. Hardware Wi-Fi chrome is omitted; expanded shared colon modes remain pending. Full live visual acceptance is not claimed. Prior “all ports complete” statements applied to the original 13-style scope, not every future upstream addition.
