# Firmware reference checks

Updated 14 September 2026. Run commands from the web project root. These optional development comparisons need a separate firmware checkout; normal installation and `npm test` do not. The local firmware is read-only. Python 3, clang++, installed project dependencies and Node.js 22.18+ are required; audio comparison additionally needs NumPy. Reports contain measured scopes, not universal pixel-parity claims. Current web suite: `npm test` (117 passing tests at v0.1.0).

## Arcade port harnesses

These generators compile their native harnesses automatically. Use the listed output paths: some comparators intentionally use fixed `/private/tmp` paths. Comparators may update result JSON under `reports/`.

```sh
python3 tests/reference/tetris.py ../AnimatedPixelClock /private/tmp/tetris-reference
node tests/reference/tetris.mjs
python3 tests/reference/encounters.py ../AnimatedPixelClock /private/tmp/encounter-reference
node tests/reference/encounters.mjs
python3 tests/reference/snake.py ../AnimatedPixelClock /private/tmp/snake-reference
node tests/reference/snake.mjs
python3 tests/reference/space.py ../AnimatedPixelClock /private/tmp/space-reference
node tests/reference/space.mjs
python3 tests/reference/asteroids.py ../AnimatedPixelClock /private/tmp/asteroids-reference
node tests/reference/asteroids.mjs
python3 tests/reference/dino.py ../AnimatedPixelClock /private/tmp/dino-reference
node tests/reference/dino.mjs
python3 tests/reference/matrix.py ../AnimatedPixelClock /private/tmp/matrix-reference
node tests/reference/matrix.mjs
python3 tests/reference/tron.py ../AnimatedPixelClock /private/tmp/tron-reference
node tests/reference/tron.mjs
python3 tests/reference/bomberman.py ../AnimatedPixelClock /private/tmp/bomberman-reference
node tests/reference/bomberman.mjs
python3 tests/reference/pong.py ../AnimatedPixelClock /private/tmp/pong-reference
node tests/reference/pong.mjs
```

For Standard/Large, replace the font placeholder with the installed Adafruit GFX `glcdfont.c`:

```sh
python3 tests/reference/classic.py ../AnimatedPixelClock '/path/to/Adafruit GFX Library/glcdfont.c' /private/tmp/classic-reference
node tests/reference/classic.mjs
```

The Matrix comparator verifies the original state machine; the browser-only compact font is outside its native comparison. Pong's development generator (`python3 scripts/port-pong.py`) is separate from the test harness: it rewrites `app/pong.ts` from firmware numerical helpers and local wrapper templates. Run the formatter, TypeScript and Pong tests after regeneration.

See the [validation index](../../reports/README.md) for each port's exact coverage and limitations. Bomberman/Pong and other state comparisons stub drawing; they are not complete hardware emulation.

## Original character and sprite harnesses

These checks compile selected **unchanged** functions from the local v2.3 ESP32
source with a host C++ shim. They require Python 3, clang++, Node with TypeScript
stripping, and explicit local source paths. They do not flash hardware.

```sh
python3 tests/reference/generate.py ../AnimatedPixelClock /tmp/clock-reference
clang++ -std=c++17 /tmp/clock-reference/reference.cpp -o /tmp/clock-reference/reference
node tests/reference/compare.mjs /tmp/clock-reference/reference
```

For pixel comparisons, supply the locally installed Adafruit GFX source:

```sh
python3 tests/reference/sprites.py ../AnimatedPixelClock "$GFX_CPP" /tmp/clock-reference/sprites.cpp
clang++ -std=c++17 /tmp/clock-reference/sprites.cpp -o /tmp/clock-reference/sprites
node tests/reference/sprites.mjs /tmp/clock-reference/sprites
```

The generated C++ and hashes stay in the output directory. A missing reference
source fails generation rather than silently passing. The checked-in shim fixes
firmware defaults, disables optional Mario encounters and supplies a target time.
Its simulation checks cover movement, states, displayed digits, integer drawing
positions, mouth/walk frames and the active digit's pellet mask. Patrol pellet
randomness and shared bounce are covered by the separate JS tests, not claimed as
C++ parity here. The sprite harness uses the source drawMario/drawPacman functions
and an installed GFX implementation's circle/triangle routines. It compares all
40 default sprite orientations/frames over a 128×64 framebuffer.

Simulation comparisons include an initial idle period, all ten outgoing Pac-Man
numerals, single-digit rollover, midnight and 12-hour hour changes. Numerical
positions allow 0.002px float tolerance but **integer pixel positions must match
exactly**. The pellet check also draws the actual web digit layer and tests each
lit dot's five native pixels against the firmware's eaten mask on every eating
and returning tick. Empty glyph cells do not count as consumed pellets.

Audio input comparisons extract the two unchanged processing methods from the companion. Use Python with NumPy installed:

```sh
python3 tests/reference/audio.py ../AnimatedPixelClock/PC-Companion-App-v4/companion-common/audio_spectrum.py /tmp/audio-reference.json
node tests/reference/audio.mjs /tmp/audio-reference.json
```

The comparison runs 32 consecutive PCM blocks through the companion and web processors. Band/wave outputs allow at most one byte of float-rounding difference. This verifies processing, not physical audio capture or visualizer frame parity.

Step 4 effects:

```sh
python3 tests/reference/effects.py ../AnimatedPixelClock /tmp/effect-reference
node tests/reference/effects.mjs /tmp/effect-reference
```

The generator compiles unchanged effect sources with a GFX-style line shim and deterministic RNG. It compares 720 scope RGB565 frames exactly, and all 96 star positions plus motion/burst state for 300 frames with a 0.001 float tolerance. Text output is stubbed; this is not full-device emulation.

## Doom Fire (newer upstream source)

The pinned MIT source in `upstream/clock_doom.cpp` is from commit `946ed42661775550d873760283bd9837009ef1e6`. Unlike earlier harnesses this does not rely on the older sibling checkout.

```sh
python3 tests/reference/doom.py
node tests/reference/doom.mjs
```

Checks all 8,192 heat cells in 4,320 frames. See [Doom validation](../../reports/doom-validation.md) for limits.
