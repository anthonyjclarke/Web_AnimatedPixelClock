# Ambient screensaver validation — 15 September 2026

## Delivered

Five original built-in scenes and original PCA custom playback under Display settings. The procedural sources are `ambient_invaders.cpp`, `ambient_pacman_chase.cpp`, `ambient_stars.cpp` and `ambient_aquarium.cpp`; `scripts/port-ambient.py` regenerates isolated JS closures. `thisisfine_frames.h` supplies the exact 33 × 4096 packed bytes and 16 RGB565 colors in `public/ambient/this-is-fine.pca`. Source digest inventory: `ambient-source-sha256.json`.

Optional HH:MM top-right overlay has its original black backing and follows selected timezone/12–24-hour format. Defaults match native: schedule disabled, Invaders, 20:00–23:00, clock shown. Reserved ID 2 normalizes to Invaders. Equal start/end means no scheduled window; overnight windows work.

Start now is session-only. Stop suppresses the current scheduled window; this convenience differs from firmware auto-mode and is registered in WEB-EXTRAS.md. Audio tab takes precedence; cycle pauses during ambient/audio. Motion pause and Replay apply to ambient. Every visible frame is composed before presentation, including the corner clock.

PCA loading validates magic, native bounds/exact file length, palette indices and per-frame delays (34–5000 ms). Missing custom media falls back to Invaders. One selected file persists in IndexedDB; storage failures are shown. The integrated GIF converter/multiple-file library remains outstanding.

## Checks

- Nine new regression tests; complete suite **117 passing**.
- Schedule boundaries, midnight wrap, timezone and invalid settings.
- Each procedural scene exercised for 18,000 steps (ten simulated minutes), bounded drawing, pause and restart.
- PCA frame order, palette unpacking, exact loop boundary, malformed/truncated data, delay bounds and fallback.
- macOS browser: manual start/stop, schedule activation, Pac-Man maze and This Is Fine visible; scene and 45-second interval survive reload; a 5-second interval advances clock styles, and audio tab takes precedence. Test settings were restored afterward.
- TypeScript and production build pass. The packed animation is included in the static export.

These are functional and runtime checks, not full native pixel-comparison results. See outstanding-functions.md for the inherited Pac-Man board counter issue and Windows acceptance gap.
