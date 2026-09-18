> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Dino Runner validation

14 September 2026. Reference: updated `AnimatedPixelClock/src/clocks/clock_dino.cpp` and shared bounce equations in `clock_common.cpp`.

The browser now ports the original running legs, gravity-driven cactus jumps, takeoff/landing dust, scrolling ground, parallax clouds and idle pterodactyl flybys. At second 56 the courier approaches each changed digit, carries the old glyph off-screen, and lets its replacement drop into place with landing dust. Phase timeouts follow source. The procedural sprites, colors, layer ordering and GFX time/date layout replace the previous decorative animation.

Four saved settings match firmware: run speed 5–30 (default 12), cactus frequency Rare/Normal/Frequent (default Normal), clouds (on), date (off). The frequency Select provides explicit labels so its closed value does not display a numeric ID. Shared date format is available; Dino uses its own date toggle.

## Verification

- 54,000 native update comparisons: speeds 5/12/30 × frequencies 0/1/2 × date off/on; 3,000 ticks per scenario with four-digit rollover and subsequent idle activity.
- Exact agreement for phase, displayed digits and checked discrete states. Numeric tolerance 0.002; maximum observed error 0.000372. Compared jump position/velocity, leg frame, ground phase, pterodactyl, cacti, clouds, digit drop offsets/velocities and every dust particle. The harness compiles the original C++ update helpers and supplies host time/RNG and shared bounce equations.
- All 83 repository tests pass, including five Dino regressions for settings, jumping/landing, courier/drop sequence, empty carried slot, pause/replay and configuration changes.
- TypeScript check and production build pass. Local preview returned HTTP 200 at `http://127.0.0.1:3000/`.

Reproduce from project root:

```sh
python3 tests/reference/dino.py ../AnimatedPixelClock /private/tmp/dino-reference
node tests/reference/dino.mjs
node --test tests/dino.test.mjs
```

Results are recorded in `dino-reference-results.json`. Full framebuffer parity and visual browser acceptance have not been established. Native reference runs use the default shared fall speed; arbitrary speed settings, phase timeout injection and prolonged real-time rollover are not exhaustively compared. Shared sprite-color configuration and full colon modes/rates remain future work; AM/PM uses live wall time during anticipatory transitions. Hardware Wi-Fi status is omitted.

Four animation ports remain: Matrix Rain, TRON, Bomberman and Pong. Shared configuration/persistence work and Docker/NAS delivery remain separate roadmap stages.
