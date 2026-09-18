> **Historical snapshot.** Feature gaps, test counts and next steps below describe the original implementation date. See the [current roadmap](../ROADMAP.md) and [documentation index](README.md) for current status.

# Step 2 — shared rendering and time handling

Completed locally, 10 September 2026.

All 13 styles render into a clipped 128×64 RGB framebuffer. LED spacing and scaling are applied on a separate staging surface; the visible canvas receives one complete image. There is no visible clear before rendering. Shared character circle/triangle drawing preserves the Step 1 rasterization.

Playback time is monotonic and separate from wall time. Tetris, Mario and Pac-Man share a 16 ms fixed step; elapsed gaps are capped at 100 ms to avoid background-tab catch-up. Pause freezes the scene and its displayed time. Appearance changes retain animation state. Replay, style, timezone and hour-format changes deliberately reset it. A discontinuity across minutes resynchronizes characters and pending Tetris digits while preserving the Tetris well. Null/invalid wall-time samples retain the last valid time, ready for future corner-clock consumers.

Validation:

- 34 regression tests: all styles produce nonempty native frames; cached time, pause, source changes, clipping, complete-frame presentation and failed staging are covered. Fixed-step tick counts match at 30/60/120 Hz.
- Native reference checks remain unchanged: 67,200 state ticks, 4,766 glyph pellet frames, and 40 sprite frames / 327,680 pixels, with zero differences. These retain the Step 1 harness limits.
- TypeScript and local production build pass.
- Browser smoke check on `http://127.0.0.1:3000/`: visible Step 2 marker, Tetris scene, Pac-Man pause/replay controls and Mario replay. This was a spot check, not a continuous dropped-frame recording or an exhaustive visual parity audit of all styles.

The dev command must use `vinext dev --hostname 127.0.0.1`; `--host` is ignored by this CLI and left the server listening only on IPv6 localhost. The older localhost tab retained a connection-error page; the working IPv4 preview is a separate tab.

No firmware DMA calls are ported. Audio input, visualizers and corner-clock overlays belong to subsequent steps. Existing approximate styles have not been replaced by source-faithful ports in this rendering refactor. No source upload or deployment was performed.
