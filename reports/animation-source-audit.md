> **Historical record.** Feature gaps and next steps below describe the state at the original review date. All 13 clock ports and six visualizers are now implemented. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for present status.

# Animation source fidelity audit

**Historical snapshot:** This audit preceded the Mario and Pac-Man ports. Those two modes now implement the firmware defaults and have regression coverage in `tests/character-clocks.test.mjs`. The findings below describe their previous implementations.

Compared on 9 September 2026 against the local ESP32 project at `../AnimatedPixelClock`. Tetris is excluded from this audit. No animation implementation was changed.

## Result

All ten remaining arcade modes fail behavioral parity. Standard and Large render time but fail layout parity. The current web modes are themed loops rather than ports of the ESP32 state machines.

The renderer smoke check passed 1,680 sampled frames (12 styles × 14 animation times × 5 clock dates × 2 hour formats). Samples include startup, seconds 55/56, minute rollover, midnight and one hour elapsed. Drawing coordinates were finite and rectangle sizes nonnegative. These checks used a mocked Canvas context, not browser screenshots or hardware execution; they do not establish visual correctness, collisions, timing fidelity or frame rate.

Reproduce with `node tests/animation-audit.mjs` after installing dependencies. Raw results are in `animation-audit-results.json`.

## Findings

Web references below point to `app/renderer.ts`; firmware references are under the original project's `src/clocks/` directory.

| Mode | Missing or incorrect web behavior | Firmware reference | Web line |
|---|---|---|---|
| Mario | Runs and periodically hops regardless of digit position. No walking to changed digits, head-hit replacement, coin behavior or encounter state machine. Generic digit bounce affects every digit at minute start. | `clock_mario.cpp:244` (trigger and walk/jump states), `:746` (encounters) | 42, 44 |
| Pac-Man | Continuous horizontal chase at the bottom. Never targets or consumes digit pellets, follows digit-specific paths, or returns after replacing a digit. Pellet layout differs from firmware's wider digit spacing. | `clock_pacman.cpp:14` (layout), `:44` (paths), `:302` (states) | 41, 45 |
| Snake | Fixed-length sine-wave ribbon with a fixed food pixel. No cardinal grid movement, food chasing/growth, obstacle/body avoidance, or eat/leave/rebuild sequence for changed digits. | `clock_snake.cpp:280` (navigation), `:422` (transition), `:449` (eat/leave) | 46 |
| Space Invaders | Five oscillating sprites and a periodically resetting laser. Firmware uses a patrolling character that slides into position, shoots changed digits, explodes them and returns. No corresponding targeting, impacts or fragments in the web renderer. | `clock_space.cpp:371` (state dispatch) | 47 |
| Asteroids | Ship oscillates horizontally with fixed heading; rocks are repeating outlines. No inertia/thrust, aiming, shot collisions, rock splitting or digit shattering. Scene is confined mostly beneath the time instead of flying behind masked digits. | `clock_asteroids.cpp:205` (splits), `:387` (trigger), `:463` (aim/fire/shatter) | 52 |
| Dino Runner | Jump is a periodic sine wave unrelated to approaching cacti. Missing gravity-based obstacle jumps, clouds, pterodactyl courier carrying old digits away, replacement drop and dust. | `clock_dino.cpp:183` (trigger), `:215` (courier), `:300` (jump physics) | 49 |
| Matrix Rain | Rain consists of short pixel streaks, not independently respawning columns of mutating glyphs. Missing 1.2-second random-glyph digit decoding and acceleration of rain over changing digits. Web only hides some digit pixels briefly at minute start. | `clock_matrix.cpp:176` (decode), `:202` (rain mutation/acceleration), `:321` (decode draw) | 23, 42 |
| TRON | Two scripted trails near the bottom; no arena navigation, occupancy/collision handling, crash/respawn or a builder bike approaching and tracing seven-segment digits. Web uses ordinary block numerals. | `clock_tron.cpp:28` (phases), `:187` (changed-digit job), `:234` (trace), `:284` (time targets) | 42, 50 |
| Bomberman | Hero traverses a fixed strip and bombs flash on a three-second loop. No corridor pathfinding, planting/escaping, flame collisions with digits/crates, bonus collection or staged digit construction. Several numeral patterns also differ. | `clock_bomberman.cpp:8` (glyphs), `:45` (routes), `:198` (phase updates) | 42, 51 |
| Pong | Ball follows two triangle-wave formulas and paddle tracks its x-coordinate directly. No wall/paddle/digit collision simulation or shattering/reassembly transitions. Decorative bricks are not destructible. Despite its name, the reference is an Arkanoid-style clock. | `clock_pong.cpp:453` (physics), `:548` (digit collisions), `:706` (transitions), `:937` (minute change) | 48 |
| Standard | Firmware time starts at y=8, numeric date at y=38, full weekday at y=52. Web time starts at y=24, abbreviated date is at the top, and seconds replace the full weekday below. | `clock_common.cpp:258` | 39–42, 53 |
| Large | Firmware size-4 time starts at x=4/y=4, numeric date at y=54 and AM/PM at bottom right. Web time starts at y=22 with different spacing, date at top and AM/PM at y=18. | `clock_common.cpp:334` | 39–42 |

## Shared transition defect

All remaining modes read the current clock string directly each frame. They have no retained old digits, changed-digit queue, target-time override or per-character transition state. Mario, Matrix and Bomberman apply brief generic effects to all digits through `Math.min(t, sec)` at the start of each minute; these effects are unrelated to character interactions.

The renderer probes confirmed identical time-colored geometry at seconds 55, 56 and 59 for every audited mode, with animation time advancing. For Mario, Pac-Man, Snake, Space, Asteroids, Dino and Matrix, source review establishes the missing late-minute transition. TRON, Bomberman and Pong instead respond to actual time changes; absence of an effect at second 56 is not itself a defect for those modes.

## Suggested implementation order

Port Mario and Pac-Man next to restore the most obvious character/digit interactions, then Snake and Space Invaders. Follow with Pong, Dino, Asteroids, Matrix, TRON and Bomberman. Standard and Large are smaller layout corrections. Each animated port needs independent persistent state, firmware geometry/sprites, transition triggers, and deterministic tests for its meaningful interactions. Merely changing loop speeds cannot restore source behavior.
