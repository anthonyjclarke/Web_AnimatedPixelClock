> **Historical record.** Feature gaps and next steps below describe the state at the original review date. All 13 clock ports and six visualizers are now implemented. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for present status.

# Step 1 — Pac-Man and Mario validation

Completed 10 September 2026. No source was uploaded or published.

## Reproduced cause

The open localhost tab was still executing the original approximation: two
chasing ghosts, a continuous bottom row of dots and an abbreviated date. Those
features are absent from the current Pac-Man port. No local server was listening
when inspection began. Starting the current checkout and reloading replaced the
stale scene. Browser screenshots then showed Pac-Man travelling through the digit
and pellets disappearing behind it. The preview now identifies itself as
`LOCAL · V2.3 STEP 1` in development, so this version can be distinguished.

## Additional fixes from the native reference

- Mario's walk-frame divider now advances only while walking, as in the firmware;
  idle and jump ticks previously shifted his leg/arm cadence.
- Mario and Pac-Man position updates preserve the firmware's single-precision
  rounding. This removes one-pixel Mario position differences and one-tick early
  Pac-Man returns/replacements on some glyphs.
- Pac-Man faces the next digit immediately when returning to the patrol line.
- Pac-Man's mouth uses GFX-compatible integer scanline triangle filling. Six
  directional mouth frames previously differed by 2–4 pixels.
- Sprite and digit drawing functions are independently callable by the reference
  checks; the live renderer uses those same functions.

## Evidence

- **67,200 simulation ticks:** no differences in checked states, digit values,
  integer drawing positions, walk/mouth frames or direction; floating-point
  coordinates also agree within 0.002 pixels.
- **4,766 eating/returning frames:** every lit pellet's rendered five-pixel cross
  matches the compiled firmware's eaten mask. This replaces the earlier weak
  “more than five cells eaten” check as the fidelity gate.
- **40 native sprite frames / 327,680 pixels:** no differences across eight
  Pac-Man directions/four mouth frames and Mario's default walking/jumping poses.
- The reference functions are extracted from the updated ESP32 source and
  compiled unchanged. Source hashes and machine-readable results accompany this
  report; reproduction instructions are in `tests/reference/README.md`.
- Browser checks verified the fresh build marker, Pac-Man replay and visible dot
  removal, and Mario's current sprite entering for replay. Mock drawing checks
  are not presented as browser video or full hardware emulation.

## Limits and next step

This validates the firmware-default character modes. Mario's optional enemy,
coin and power-up encounters remain disabled, matching the default configuration.
A hardware unit configured with those encounters will look different. The host
shim does not emulate ESP32 scheduling, DMA or the entire firmware application;
shared bounce and playback controls retain separate regression tests.

Step 2 is the shared framebuffer/time-handling work. Audio inputs and the two new
visualizers remain later steps in the approved plan.
