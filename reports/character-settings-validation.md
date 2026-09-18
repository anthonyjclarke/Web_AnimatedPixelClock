> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Mario and Pac-Man settings — 11 September 2026

Implemented all seven Mario controls and six Pac-Man controls, shown beneath Display settings for the selected clock. Values use native settings.cpp defaults and web_pages.h ranges, including Mario's fourth frequency choice, Chaotic (2–5 seconds), which the config header comment omits. Settings save in the existing localStorage record, normalize invalid/missing values, and have separate per-clock reset buttons.

Mario now supports configurable digit bounce height/gravity, walking speed, native four-frame limbs, idle encounter enable, frequency and speed. Idle encounters port all six source variations: pass-by, coin blocks, two enemies, star, mushroom, and single-enemy interaction. Goombas squash, Spinies are fireballed and Koopas slide in their shells; coins and power-ups use the native sprites and transitions. Coin counter appears when enabled. Minute changes and explicit replay abort encounters; disabling encounters does not abort an active minute rebuild. Frequency edits reschedule the next encounter from the current simulation time.

Pac-Man supports patrol/eating/mouth speeds, 0–20 patrol pellets, random/even spacing and bounce enable. Pellet edits regenerate immediately; zero removes patrol pellets. Native mouth setting is an interval of value × 10 ms, so the browser labels it as an interval rather than the misleading firmware UI Hz label. Configured Mario bounce height/gravity are also used for Pac-Man's shared native bounce behavior. Tetris's shared bounce tuning remains independent in the existing port.

## Verification

- 61 automated tests pass, including settings normalization/serialization, pellet regeneration/zero/even spacing, bounce disable, four distinct Mario strides, completion of all six encounter variations, scheduling and minute-change priority.
- TypeScript and production export build pass. The Sites wrapper could not start locally; the established `npm run build` succeeded.
- Native encounter harness compiles unchanged clock_mario.cpp encounter functions with deterministic RNG and platform/global stubs. 72 scenarios / 108,000 ticks cover six encounter variations, all three encounter speeds, walking bounds 15/35 and two RNG seeds. Phase and coin counts match; maximum x/jump error is 0.000375143 pixels.
- Native character harness: 8 scenarios / 9,600 ticks at minimum/maximum movement and mouth settings, smooth on/off, midnight rebuild and initial patrol. States, facing/walk/mouth frames and displayed digits match; maximum position error is 0.000003838 pixels.
- Preview returned HTTP 200 at http://127.0.0.1:3000/.

Commands:

```sh
python3 tests/reference/encounters.py ../AnimatedPixelClock /private/tmp/encounter-reference
node tests/reference/encounters.mjs
python3 tests/reference/generate.py ../AnimatedPixelClock /private/tmp/clock-reference
clang++ -std=c++17 /private/tmp/clock-reference/reference.cpp -o /private/tmp/clock-reference/reference
node tests/reference/character-settings.mjs
```

Native reference display and shared bounce calls are stubbed; these are state comparisons, not complete scene pixel comparisons. Encounter physics use JavaScript numbers, with small differences from C++ float32. Sprite code follows native drawing primitives but all encounter sprites have not had a separate native pixel audit. Shared date formats, colon modes/rates, individual sprite colors, Standard/Large layouts and the remaining eight arcade ports are still outstanding. No deployment or firmware edits.
