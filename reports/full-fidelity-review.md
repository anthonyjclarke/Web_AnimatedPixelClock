> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

> Final arcade follow-up (14 September 2026): Bomberman and Pong are now ported. See [validation](final-arcade-validation.md). No listed arcade ports remain; visual acceptance and shared configuration work are still pending.

> TRON follow-up (14 September 2026): the simplified scene is replaced with native duelling/tracing and motorcycle variants. See [validation](tron-validation.md).

> Matrix follow-up (14 September 2026): the simplified rain is replaced with the native glyph/decode port and four controls. See [validation](matrix-validation.md).

> Dino follow-up (14 September 2026): the simplified scene is replaced with the native state-machine port and four controls. See [validation](dino-validation.md) for tested scope.

> Asteroids follow-up (13 September 2026): the simplified scene has been replaced with the native state-machine port and five controls. See [validation](asteroids-validation.md) for tested scope and remaining limits.

# Full web / ESP32 fidelity review — 11 September 2026

> Follow-up: the 12 Tetris controls and associated modes have now been implemented. See `tetris-settings-validation.md` for current status and native comparisons. The findings below describe the pre-implementation audit. Correction: firmware intentionally hides the date while its block game is active; default normal-play placement scoring was already present in the browser.

> Further follow-up: Mario’s seven settings, Pac-Man’s six settings and Mario’s idle encounters are implemented. See `character-settings-validation.md` for validation and remaining limits.

> Standard/Large follow-up (13 September): native typography/layouts and four date formats are restored. See `classic-clocks-validation.md`; the current sequence, including Synology Docker delivery, is in `../ROADMAP.md`.

> Snake follow-up (13 September): native movement and digit-change state machine plus four settings implemented; see `snake-validation.md`. Seven arcade animation ports remain.

> Space follow-up (13 September): native Invader/Ship state machine and five settings implemented; see `space-validation.md`. Six arcade animation ports remain.

## Verdict and scope

The browser is a partial port, not a faithful implementation of all clocks. All 13 selectable clock styles were compared structurally against the local ESP32 source, along with the configuration model, browser settings, shared rendering/timing and audio implementation. This is a source audit plus automated checks, not a frame-by-frame certification of every mode or a physical-device comparison.

Reference: `../AnimatedPixelClock`, including `release/v2.3.0/CHANGELOG.md`, `src/clocks`, `src/config/config.h`, `src/config/settings.cpp`, and `src/web/web_pages.h`.

This report supersedes the completeness interpretation of the earlier four-step integration status. The four steps delivered their scoped work; they did not finish every clock or expose the original clock settings. Historical reports remain evidence of their particular tests, not proof of general fidelity.

## Findings, ordered by impact

1. **P1 — All 54 original clock-specific controls are missing.** `app/page.tsx:38` renders only common display settings; `app/renderer.ts:30` has no clock-specific options. The firmware declares 54 active per-clock fields in `src/config/config.h:164–236`; every one has an input/select in `src/web/web_pages.h`. Merely adding controls would be insufficient: the engines must consume them. The exact fields, native stored defaults and source/UI line numbers are in `clock-settings-inventory.json` and the appendix below.
2. **P1 — Eight arcade modes are approximations.** `app/renderer.ts:43–81` uses elapsed-time formulas and small decorative sprites for Snake, Space Invaders, Asteroids, Dino Runner, Matrix Rain, TRON, Bomberman and Pong. These do not port their native state machines, collisions and digit-change choreography. A stable, nonempty frame does not establish fidelity.
3. **P2 — Tetris date setting has no effect; other original modes are absent.** The Tetris branch returns before date rendering (`app/renderer.ts:45–59`). Native defaults enable the bottom date (`src/config/settings.cpp:487–490`). The browser hardcodes falling dots and a shallow bottom well. Slabs, small corner clock/taller well, date placement, speeds, solid blocks and configurable gameplay are missing. The original default for smooth gameplay is false; browser placement scoring is not evidence that this selectable native behavior is reproduced.
4. **P2 — Standard and Large have different fonts/layouts.** Native Standard uses GFX text at y=8, date y=38 and weekday y=52 (`src/clocks/clock_common.cpp:258`). The browser places block time at y=24, a short date at y=5 and seconds at y=53. Native Large starts time at y=4 with a bottom date and AM/PM; browser time starts at y=22. These are visibly different even without animation.
5. **P2 — Shared settings are incomplete.** Native date formats, colon always-on/blink/always-off and blink rate, and individual sprite color slots are not represented. A single digit color and blink toggle cannot reproduce them. Mario/Pac-Man dates use a fixed format; other styles use a different short date. Browser glow/timezone are useful browser features but do not replace original configuration.
6. **P2 — Visualizer preferences disappear when changing tabs.** `app/page.tsx:39` unmounts VisualizerPanel when leaving Audio; `app/visualizer-panel.tsx:17` recreates defaults on mount. Effect, scope settings, colors and display preferences are therefore lost, unlike firmware saved settings. Stopping microphone capture on exit is appropriate; discarding preferences is a separate issue.
7. **P2 — Malformed persisted options can stop rendering.** `app/page.tsx:20` validates style and timezone only, then merges arbitrary persisted values. An invalid color reaches the framebuffer parser and throws. This was reproduced directly with `renderClockFrame` and `color: 'invalid'`, which throws `Unsupported pixel color: invalid`. The RAF callback at line 23 schedules its next frame only after rendering, so this error stops that loop. Validate persisted values and recover with known defaults; do not silently accept unchecked data.

## Clock-by-clock comparison

| Clock          | Current fidelity                                                                        | Native behavior still missing / unverified                                                                                                                                    |
| ---            | ---                                                                                     | ---                                                                                                                                                                           |
| Tetris         | Partial port; rotating/falling/locking pieces and digit rebuilding tested               | 12 settings; slab mode, date placement, small-clock/tall-well modes and configuration-specific parity. No complete native scene pixel comparison.                             |
| Mario          | Default walking/jump/digit transition and sprite work implemented                       | 7 controls; four-frame smooth walking and optional idle encounters, configurable speed and bounce. Full-scene parity including shared bounce/date/colors is not established.  |
| Pac-Man        | Default patrol, pellet consumption/regeneration and glyph eating implemented and tested | 6 controls; configurable pellet count/spacing, movement/eating/mouth speeds and bounce. Full-scene parity across settings is not established.                                 |
| Snake          | Approximation                                                                           | Native grid/body movement, routing and digit transitions; speed, length, arena border and date. See `clock_snake.cpp`.                                                        |
| Space Invaders | Approximation                                                                           | Native patrol/attack/laser/explosion phases and selectable character; firmware default is ship, while web draws five invaders. See `clock_space.cpp`.                         |
| Asteroids      | Approximation                                                                           | Native ship/rock dynamics, aiming, splitting and digit destruction; speed/count/date/transparency. See `clock_asteroids.cpp`.                                                 |
| Dino Runner    | Approximation                                                                           | Native obstacle/jump and digit-courier sequences; speed, cactus cadence, clouds and date. See `clock_dino.cpp`.                                                               |
| Matrix Rain    | Approximation                                                                           | Native rain streams/glyph mutation and digit decoding; speed, density, date and masking/transparency. See `clock_matrix.cpp`.                                                 |
| TRON           | Approximation                                                                           | Native builder phases and minute targets; both bike styles. See `clock_tron.cpp`.                                                                                             |
| Bomberman      | Approximation                                                                           | Native routed movement, bomb and digit-change phases. No dedicated clock-specific settings in the active config struct; common colors still apply. See `clock_bomberman.cpp`. |
| Pong           | Approximation                                                                           | Native collision-driven ball/paddles, digit springs and shatter/reassembly; all six controls. See `clock_pong.cpp`.                                                           |
| Standard       | Layout mismatch                                                                         | Original GFX font, positions, date formats and weekday. See `clock_common.cpp:258`.                                                                                           |
| Large          | Layout mismatch                                                                         | Original GFX font, top time and bottom date/AM-PM. See `clock_common.cpp:334`.                                                                                                |

## Audio, v2.3 and implementation boundaries

Six audio effects are present. Oscilloscope has the strongest native comparison: the existing Step 4 harness recorded zero RGB565 differences across 720 fixture frames, excluding native text functions. Starfield compared 96-star state across 300 frames with maximum error about 0.000006724; this is not full pixel parity. The first four effects have functional tests, not equivalent complete native-frame comparisons.

The shared framebuffer, timing, cached wall time, audio packet parsing, FFT pipeline and resource cleanup have focused regression coverage. The visualizer resets effect state on input status changes, including pause/resume; preservation of effect history should be reviewed separately from preference persistence. Physical microphone capture remains unverified. Browser audio capture is an adaptation, not the original companion connection.

The v2.3 changelog also includes weather, NTP/network and companion fixes. Weather is not in the browser's 13-style selector. NTP servers, OTA, ESP32 panel refresh, network settings and companion port management are not browser clock configuration features; their absence must not be described as implemented changes. The local startup launcher is separate from animation fidelity and is not an automatic login service.

## Checks performed for this review

- All 49 existing automated tests passed again (`node --test tests/*test.mjs`).
- TypeScript check passed again (`tsc --noEmit --incremental false`).
- Matched all 54 per-clock fields to explicit native HTML controls and extracted stored defaults from settings.cpp.
- Reproduced the invalid-color rendering exception without changing the user's browser storage.
- Read the existing native-reference reports; those historical numerical results were not regenerated in this review.
- No browser behavior, firmware, deployment or user preferences changed by this audit. Added review documentation and settings inventory only.

Existing tests establish important mechanics and stability. They do not cover all native clock states, all settings combinations, palettes, date formats, meridiem layouts, every minute rollover or physical display output. Passing them cannot support an “all animations faithful” claim.

## Recommended implementation sequence

1. Build typed, validated, persistent per-clock settings using the firmware's actual defaults and ranges, including common date/colon/color controls. Wire them to the three existing engines as each capability is implemented; do not expose inert controls.
2. Complete Tetris's 12 options and original modes; compare native startup, minute rollover, rotation/locking, date and small-clock cases using deterministic fixtures.
3. Complete Mario and Pac-Man options and remaining behaviors, including idle encounters and varied pellet configurations. Compare default and nondefault native sequences; extend tests beyond sprite rasterization and stubbed shared bounce.
4. Restore Standard/Large native typography and layouts.
5. Port the remaining eight clocks individually from their native state machines, pairing each with its settings and source-reference tests before marking it complete.
6. Persist visualizer preferences and extend native visualizer comparisons; finish a browser acceptance pass including microphone, reload, tab switching, replay, pause and time discontinuities.

For each clock, completion means settings affect behavior, defaults match firmware, preferences survive reload, and deterministic native sequence/render comparisons cover ordinary operation and digit changes. User visual review remains valuable after those checks.

## Exact missing clock settings

Defaults below are raw firmware stored values (for example, tenths or enum indices), not display labels. Source descriptions specify units; the JSON inventory records individual native declaration and UI line numbers. These are missing browser controls, even where the browser happens to hardcode an equivalent default.

| Setting                     | Native default | Native meaning                                                                             |
| ---                         | ---            | ---                                                                                        |
| `tronBikeStyle`             | `0`            | 0=Motorcycle profile, 1=Light cycle top view                                               |
| `marioBounceHeight`         | `35`           | Tenths (40 = 4.0)                                                                          |
| `marioBounceSpeed`          | `6`            | Tenths (6 = 0.6)                                                                           |
| `marioSmoothAnimation`      | `false`        | Enable 4-frame walk cycle (default: false = 2-frame)                                       |
| `marioWalkSpeed`            | `20`           | Tenths (20 = 2.0, 25 = 2.5 old/fast)                                                       |
| `marioIdleEncounters`       | `false`        | Enable idle enemy encounters (default: false)                                              |
| `marioEncounterFreq`        | `1`            | 0=Rare(25-35s), 1=Normal(15-25s), 2=Frequent(8-15s)                                        |
| `marioEncounterSpeed`       | `1`            | 0=Slow, 1=Normal, 2=Fast (default: 1)                                                      |
| `spaceCharacterType`        | `1`            | 0=Invader, 1=Ship                                                                          |
| `spacePatrolSpeed`          | `5`            | Tenths (10 = 1.0)                                                                          |
| `spaceAttackSpeed`          | `25`           | Tenths (25 = 2.5)                                                                          |
| `spaceLaserSpeed`           | `40`           | Tenths (40 = 4.0)                                                                          |
| `spaceExplosionGravity`     | `5`            | Tenths (5 = 0.5)                                                                           |
| `pongBallSpeed`             | `18`           | Fixed-point (16 = 1.0)                                                                     |
| `pongBounceStrength`        | `3`            | Tenths (3 = 0.3)                                                                           |
| `pongBounceDamping`         | `85`           | Hundredths (85 = 0.85)                                                                     |
| `pongPaddleWidth`           | `20`           | Pixels (20)                                                                                |
| `pongHorizontalBounce`      | `true`         | Enable horizontal digit bounce on side hits                                                |
| `pongDigitShatter`          | `true`         | Shatter/reassemble on digit change (off = blink only)                                      |
| `pacmanSpeed`               | `10`           | Tenths (10 = 1.0)                                                                          |
| `pacmanEatingSpeed`         | `20`           | Tenths (20 = 2.0)                                                                          |
| `pacmanMouthSpeed`          | `10`           | Mouth animation speed (10 = 100ms)                                                         |
| `pacmanPelletCount`         | `8`            | Number of patrol pellets (0-20)                                                            |
| `pacmanPelletRandomSpacing` | `true`         | Random or even spacing                                                                     |
| `pacmanBounceEnabled`       | `true`         | Enable digit bounce on eat                                                                 |
| `snakeSpeed`                | `12`           | Step pace, tenths (higher = faster)                                                        |
| `snakeLength`               | `8`            | Base body length in cells (4-12)                                                           |
| `snakeWallBorder`           | `false`        | Draw Nokia-style arena frame                                                               |
| `snakeShowDate`             | `false`        | Show date row (off = snake uses full screen)                                               |
| `tetrisFallSpeed`           | `12`           | Slab/dot drop accel, tenths (12 = 1.2)                                                     |
| `tetrisBlockStyle`          | `0`            | 0=LCD grid (gaps), 1=Solid blocks                                                          |
| `tetrisIdleTumble`          | `true`         | Show occasional tumbling piece when idle                                                   |
| `tetrisAnimStyle`           | `1`            | 0=Drop-in slabs, 1=Falling dots build-up                                                   |
| `tetrisShowDate`            | `true`         | Show the date row (off = cleaner screen)                                                   |
| `tetrisDatePosition`        | `1`            | 0=Top, 1=Bottom                                                                            |
| `tetrisDotSpeed`            | `12`           | Falling-dot build speed, tenths (12 = 1.2)                                                 |
| `tetrisDotOrder`            | `0`            | 0=Bottom-up, 1=Random                                                                      |
| `tetrisDigitBounce`         | `true`         | Bounce the new digit after it rebuilds                                                     |
| `tetrisSmoothGame`          | `false`        | Block Game plays near-perfectly (smart piece pick, avoids holes)                           |
| `tetrisSmallClock`          | `false`        | Small corner clock; frees the panel for a taller block-game well (auto-enables Block game) |
| `tetrisSmallClockPos`       | `1`            | 0=Top-left, 1=Top-right                                                                    |
| `asteroidsShipSpeed`        | `12`           | Ship thrust/drift scale, tenths (12 = 1.2)                                                 |
| `asteroidsRockCount`        | `2`            | Rocks kept in play (1-4)                                                                   |
| `asteroidsRockSpeed`        | `8`            | Rock drift speed, tenths (8 = 0.8)                                                         |
| `asteroidsShowDate`         | `false`        | Show date row (off = centred clock)                                                        |
| `asteroidsTransparent`      | `true`         | No mask behind digits, ship flies through (default: true)                                  |
| `dinoSpeed`                 | `12`           | World scroll speed, tenths (12 = 1.2)                                                      |
| `dinoCactusFreq`            | `1`            | 0=Rare, 1=Normal, 2=Frequent                                                               |
| `dinoShowClouds`            | `true`         | Parallax clouds (default: true)                                                            |
| `dinoShowDate`              | `false`        | Show date row (off = centred clock)                                                        |
| `matrixRainSpeed`           | `12`           | Rain fall speed, tenths (12 = 1.2)                                                         |
| `matrixRainDensity`         | `1`            | 0=Sparse, 1=Normal, 2=Dense                                                                |
| `matrixShowDate`            | `false`        | Show date row (off = centred clock)                                                        |
| `matrixTransparent`         | `false`        | No mask behind digits, rain falls through (default: false)                                 |
