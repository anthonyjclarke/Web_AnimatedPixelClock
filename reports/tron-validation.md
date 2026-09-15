> **Implementation snapshot.** Test counts and “next port” statements below refer to the original implementation date. All listed arcade ports are now complete; the current suite passes 101 tests. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md).

# TRON validation

14 September 2026. Reference: updated `AnimatedPixelClock/src/clocks/clock_tron.cpp`.

Replaced decorative trails with the original 64 × 32 collision arena, two autonomous cycles, 96-point trails, clearance-based steering, crashes and respawns. Changed seven-segment digits fade, then an assigned cycle approaches, traces every connected edge and returns to the duel. The other cycle continues moving. TRON follows current time changes immediately; it does not anticipate second 56. Sparse grid, border, neon strokes, default RGB565 colors and both rotated motorcycle sprites follow source.

The firmware's single mode setting, motorcycle variant, is saved with explicit Profile/Overhead labels. Generic date toggle is hidden because native TRON has no date row. Shared digit color, colon toggle and 12/24-hour time remain available.

## Verification

- 6,000 original native helper updates compared, seed 1: startup, four-digit rollover, then continued duel.
- Exact agreement for phase, active digit, builder selection, build direction/segments/trace index, shown digits and both bikes' positions, directions, trail counts, death flags and step/crash timestamps. Builder coordinate maximum difference below 0.000001 (tolerance 0.002).
- Five TRON regressions exercise settings normalization, bounded trails and collision avoidance, completed tracing, both sprite variants at screen edges, pause, variant changes and replay. All 93 repository tests pass.
- TypeScript and production build pass. Local preview returns HTTP 200.

Reproduce from project root:

```sh
python3 tests/reference/tron.py ../AnimatedPixelClock /private/tmp/tron-reference
node tests/reference/tron.mjs
node --test tests/tron.test.mjs
```

Results: `tron-reference-results.json`. Full framebuffer parity and visual browser acceptance remain unverified. The native harness stubs drawing; it does not directly compare full occupancy arrays, trail contents or sprite pixels. It uses one random seed and a fixed 16 ms timestep. Shared configurable sprite colors and expanded colon modes/rates remain roadmap work. Explicit replay is a browser extension that traces all four current digits from synthetic previous values. Hardware Wi-Fi chrome is omitted.

Two animation ports remain: Bomberman and Pong. Docker/NAS delivery follows animation and shared configuration work.
