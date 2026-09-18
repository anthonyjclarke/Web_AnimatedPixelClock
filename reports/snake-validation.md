> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Snake port — 13 September 2026

Replaced the decorative sine-wave loop with the ESP32 Snake state machine: 4px cardinal movement, grid bounds, digit/body obstacles, BFS routing, greedy fallback, native food placement and growth, and sequential old-digit pellet consumption / leave / reveal phases. Retains the source's 80-step eating and 40-step leaving safeguards. Digits use GFX size 3, native positions and default green body/red food with a black eye. Food and digit pellets blink on the simulation clock.

All four native settings are exposed and persisted: speed 5–30 (default 12), starting length 4–12 (default 8), arena border and date (both default off). Snake supports the existing four date formats. Its own date toggle replaces the ineffective generic date switch. Speed edits preserve the body; geometry/length edits settle pending target digits and reset the body to a valid starting lane. Replay runs the actual four-digit pellet sequence; pause freezes simulation and rendering. Timezone/time discontinuities discard obsolete state. A 60-second transition safeguard restores live time; this browser recovery clears obsolete choreography rather than leaving an old transition active.

Native validation compiles unchanged clock_snake.cpp helpers and updateSnakeAnimation with deterministic RNG and host stubs. **24 scenarios / 84,000 ticks have zero state differences** for phases, displayed digits, direction, target length, food, every body cell and every digit pellet. Scenarios cover speed 5/12/30, length 4/12, border on/off, date on/off, initial roaming and midnight rebuilding.

69 regression tests pass, including Snake settings serialization/normalization, bounds/cardinal movement, pellet consumption and midnight completion, pause/replay and live settings edits. Native bounce and display calls are stubbed in the reference harness: full rendered-frame parity is not claimed. Shared configurable sprite colors and colon modes/rates remain outstanding. Snake uses the configured Mario shared bounce height/gravity, as the firmware does; defaults remain 35/6.

Reference commands:

```sh
python3 tests/reference/snake.py ../AnimatedPixelClock /private/tmp/snake-reference
node tests/reference/snake.mjs
```

No firmware changes or deployment. Next animation: Space (Invader/Ship), followed by Asteroids, Dino Runner, Matrix Rain, TRON, Bomberman and Pong. Docker/NAS delivery remains on ROADMAP.md.
