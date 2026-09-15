> **Implementation snapshot.** Test counts and “next port” statements below refer to the original implementation date. All listed arcade ports are now complete; the current suite passes 101 tests. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md).

# Space (Invader / Ship) — 13 September 2026

Replaced the decorative row of five invaders with the native Space state machine from src/clocks/clock_space.cpp. The single character patrols between x=20 and x=108 at y=56, slides under each changed digit, fires an upward laser, replaces the digit on impact, emits fragments, advances to the next target and returns to x=64. Native 16ms timing, 200ms sprite toggles, 20-fragment pool and 16-tick explosion hold are preserved (some firmware prose comments describe older values).

The existing Space Invaders card opens five saved controls: character (Ship default / Invader), patrol speed 2–15 (default 5), attack speed 10–40 step 5 (default 25), laser speed 20–80 step 5 (default 40), fragment gravity 3–10 (default 5). Native defaults come from settings.cpp and ranges from web_pages.h. Changes retain current movement/attack state. Reset restores only Space settings. Replay starts the real four-digit attack sequence and clears old laser/debris. Pause freezes simulation. Time discontinuities clear obsolete state; a 60-second browser safeguard abandons stale choreography and restores current time.

Drawing uses native GFX size-3 digits at y=16, numeric date at y=4, green character, red laser and digit-colored debris. Four date formats are supported. The global Show date switch remains a browser extension; the firmware always draws the date. Custom sprite colors and full colon modes/rates remain future shared-configuration work. AM/PM currently follows the browser's live meridiem during anticipatory transitions; full scene parity across meridiem changes is not claimed.

## Validation

- 74 automated tests pass; TypeScript passes.
- Native helpers/update compile unchanged against deterministic host globals. 24 scenarios / 57,600 ticks cover patrol 2/5/15, attack 10/40, laser 20/80 and gravity 3/10, including patrol and midnight rebuild. Phases, displayed digits, direction, animation frame, current target, explosion timer, laser activity and every fragment's activity match. Maximum position/velocity difference: 0.0000229343 pixels.
- 100 native sprite fixtures (two characters, two frames, several visible and clipped coordinates): zero pixel differences. Host display converts the native sprite palette to RGB for comparison.
- Regression tests cover preference normalization/storage serialization, patrol boundaries, laser impact / digit replacement, all attack phases, debris cleanup, mid-attack settings edits, replay and paused rendering.
- These are state and isolated-sprite comparisons, not full native-frame parity or physical ESP32 testing.

```sh
python3 tests/reference/space.py ../AnimatedPixelClock /private/tmp/space-reference
node tests/reference/space.mjs
```

Results: `space-reference-results.json`. No deployment or firmware changes. Next animation: Asteroids. Six arcade ports remain, plus shared settings/persistence and the planned NAS Docker delivery.
