> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Bomberman and Pong validation

14 September 2026. Source: updated ESP32 `clock_bomberman.cpp`, `clock_pong.cpp` and related settings/constants.

## Bomberman

Replaced decorative walking and timed explosions with the native corridor graph, BFS routing, crates, useful bomb placement, escape planning, distance-based fuse, directional flames, digit debris/rebuilding and bonus collection. Hero direction/stride, brick font, arena details and default colors follow source. Time changes are detected from live time, not second 56. No mode-specific settings exist in this source; the generic date toggle is hidden because native Bomberman does not render a date.

8,000 native ticks match phases, hero motion/node, bomb and active digit, facing, route count/index, crates/bonus/fuse, shown values and flame state. Maximum coordinate error below 0.000001. Native harness runs the original complete display/update wrapper with drawing stubbed, seed 1, four-digit rollover followed by continued play.

## Pong (Arkanoid)

Replaced the decorative ball/paddle with fixed-point ball physics, wall/digit collision handling, sticky paddle release, tracking, conditional multiball, spring displacement, three-hit/timeout breaking and fragment reassembly. Assembly fragments are separated from gravity and released when their digit completes. Source keeps the date row always visible; shared date format remains selectable.

Six saved settings use native defaults/ranges: ball speed 16–30 (18), bounce strength 1–8 (3), damping 50–95 step 5 (85), paddle width 10–40 step 2 (20), horizontal bounce (on), digit shatter/reassemble (on). Paddle width edits apply immediately, a browser convenience over the native initialization-time assignment.

24,000 native ticks across twelve combinations: speed 16/18/30 × shatter on/off × horizontal bounce on/off. Exact agreement for checked ball fixed-point positions/velocities/active/state, paddle position, digit transition state/hits. Spring offset maximum difference 0.000002, tolerance 0.002. Native test uses a forced late-minute time change to exercise multiball. Tests also cover an ordinary minute transition without multiball.

Pong numerical helpers are generated from the original C++ source using `scripts/port-pong.py`; platform state, integration and drawing templates are in `scripts/pong-wrapper-head.txt` and `scripts/pong-wrapper-tail.txt`. These scripts run only during development, not in the browser or NAS runtime. The generated TypeScript is checked in with the port. Regenerate before formatting when changing the templates.

## Checks and reproduction

All 100 repository tests, TypeScript and production build pass. Local preview returns HTTP 200. Seven new regressions cover crate-safe routes, escape from blasts, rebuild/collection, settings, assembly cleanup, bounded springs, conditional multiball and both renderers' pause/replay/time resync.

```sh
python3 tests/reference/bomberman.py ../AnimatedPixelClock /private/tmp/bomberman-reference
node tests/reference/bomberman.mjs
python3 tests/reference/pong.py ../AnimatedPixelClock /private/tmp/pong-reference
node tests/reference/pong.mjs
node --test tests/final-arcade.test.mjs
```

Results: `bomberman-reference-results.json` and `pong-reference-results.json`.

## Limits

Full framebuffer parity and live visual acceptance are not established. Drawing is stubbed in native comparisons. Bomberman route contents are not compared directly; Pong fragment coordinates/targets, paddle width variants and all bounce-strength/damping combinations are not exhaustively native-compared. Fragment cleanup is covered by web regression tests. Native comparison uses one seeded RNG and fixed 16 ms updates. Shared sprite-color configuration and expanded colon modes/rates remain roadmap work. Explicit replay is a browser extension; ESP32 Wi-Fi chrome is omitted.

No arcade ports remain among the 13 listed styles. Remaining stages are shared configuration/persistence, animation acceptance and Docker/NAS packaging and deployment.
