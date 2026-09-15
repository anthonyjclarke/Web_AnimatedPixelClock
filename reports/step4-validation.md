> **Historical record.** Feature gaps and next steps below describe the state at the original review date. All 13 clock ports and six visualizers are now implemented. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for present status.

# Step 4 — Oscilloscope and Starfield Overdrive

Implemented locally on 11 September 2026 from the updated ESP32 source.

## Delivered

- Oscilloscope keeps firmware ID 6: 128 waveform samples, default grid, original clock-band geometry, gain 50–200%, 0–4 ghost traces (default 3), optional center fill and flat trace color, and editable grid/trace/peak colors. Its history advances only on a new waveform serial and clears on reset, stale audio or missing waveform. Legacy-source guidance points to available browser inputs instead of instructing the user to update an unrelated PC companion.
- Starfield Overdrive keeps firmware ID 5: 96 persistent seeded/testable stars, perspective projection and respawning, bass-driven speed, midrange drift, three frequency color groups and radial trails. Spectral-flux rises are evaluated once per packet, with cooldown and stream-gap rebaselining. Held tones do not repeatedly trigger boosts.
- Shared GFX-compatible line rasterization fixes steep-line/tie-breaking differences in the new effects. Scope color calculations use float32 rounding and RGB565 quantization to match native drawing.
- Reboot startup: `npm run dev` binds `127.0.0.1` by default. `Start Pixel Clock.command` provides a Finder launcher. Both require the server Terminal to remain open; no login item or background service was installed. The local server was restarted and returned HTTP 200.

## Checks

49 automated tests pass, covering existing animation/audio behavior plus scope serial/trail lifetime, stale/missing/reset input, clipping and exact scope boundary rows, beat/held-note/gap behavior, repeatable star trajectories and duplicate-packet rendering at 30/60/120Hz. TypeScript validation and the production build pass.

The native reference harness compiles the unchanged local `oscilloscope.cpp` and `starfield.cpp` with a host display and deterministic RNG:

- 720 scope frames / 5,898,240 pixels: **zero RGB565 pixel differences**. Fixtures cover clock on/off, 50/100/200% gain, all trail depths, fill on/off and flat color on/off, with flat and several ramp/wrap input patterns.
- 300 starfield frames: all 96 stars' x/y/z and drive/boost/cooldown/phase compared to native. Maximum absolute state difference **0.000006724**, below the 0.001 threshold. Starfield uses JavaScript doubles; full starfield pixel parity is not claimed.
- Native harness text functions are no-ops; compatibility-message text and corner-clock overlays are tested separately through the shared renderer/UI. It does not emulate an ESP32 display driver.
- Browser: Step 4 marker, live demo scope trace, scope fill/clock controls, and Starfield Overdrive trails were visibly checked. The older tab was stuck on the post-reboot connection-error page; a working preview tab was opened at the same IPv4 URL. A background/demo stream gap correctly exposed the clock fallback; restarting the demo restored reception.

Reference commands:

```sh
python3 tests/reference/effects.py ../AnimatedPixelClock /private/tmp/effect-reference
node tests/reference/effects.mjs /private/tmp/effect-reference
```

Results: `step4-reference-results.json`. Physical microphone testing remains outside the checks performed. No firmware, companion configuration, source upload or deployment was changed.
